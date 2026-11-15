import type {
  AstronautId,
  BaselineComparison,
  ClinicalWorkspace,
  DataOrigin,
  HydrationRecord,
  ISODateTime,
  MedicalEncounter,
  MissionState,
  ObservationQuality,
  PreventionPlanItem,
  PreventionStatus,
  PreventionTargetKind,
} from '../../contracts/types'
import { compareBaseline, performanceObservations } from '../health/intelligence'
import { ensureSyntheticPreventionPlans, SYNTHETIC_PREVENTION_EPOCH } from './fixtures'

export interface PreventionStateContainer {
  mission: MissionState;
  personal: ClinicalWorkspace;
  mode?: 'astronaut' | 'medical' | 'mission';
  scope?: DataOrigin;
  sessionAstronautId?: string;
}

export interface PreventionEvidenceRef {
  id: string;
  kind: 'measurement' | 'assessment' | 'activity' | 'hydration' | 'withheld_link';
  label: string;
  timestamp: ISODateTime;
  source: string;
  origin: DataOrigin;
  quality: ObservationQuality;
  summary: string;
  usable: boolean;
  reasonIfUnusable?: string;
}

export interface EvaluatedPreventionItem {
  plan: PreventionPlanItem;
  status: PreventionStatus;
  activeWindow: {
    startAt: ISODateTime;
    endAt: ISODateTime;
    cycleIndex: number;
  };
  matchedEvidence: PreventionEvidenceRef[];
  invalidOrMissingEvidence: PreventionEvidenceRef[];
  statusExplanation: string;
  recommendedRoute: {
    section: 'health' | 'assessments' | 'physical' | 'visual' | 'performance' | 'events' | 'prevention';
    label: string;
  };
  warnings: string[];
}

export interface HydrationPeriodSummary {
  astronautId: AstronautId;
  scope: DataOrigin;
  asOf: ISODateTime;
  windowHours: number;
  windowStartAt: ISODateTime;
  totalMl: number;
  usableEntriesCount: number;
  missingEntriesCount: number;
  convertedFromLitersCount: number;
  userGoalMl: number | null;
  goalLabel: string;
  records: HydrationRecord[];
  warnings: string[];
}

export interface SleepRecoveryContext {
  astronautId: AstronautId;
  scope: DataOrigin;
  asOf: ISODateTime;
  latestSleepHours: number | null;
  latestSleepTimestamp: ISODateTime | null;
  latestSleepQuality: ObservationQuality | null;
  latestFatigueScore: number | null;
  latestStressScore: number | null;
  baselineComparison: BaselineComparison;
  linkedEncounters: MedicalEncounter[];
  explanation: string;
}

export interface PreventionScheduleSummary {
  astronautId: AstronautId;
  scope: DataOrigin;
  asOf: ISODateTime;
  accessRestricted: boolean;
  accessNotice: string | null;
  items: EvaluatedPreventionItem[];
  counts: Record<PreventionStatus, number>;
  hydrationSummary: HydrationPeriodSummary;
  sleepRecoveryContext: SleepRecoveryContext;
  limitations: string[];
}

function isAppContainer(source: PreventionStateContainer | MissionState): source is PreventionStateContainer {
  return 'mission' in source && 'personal' in source
}

function canReadSubject(source: PreventionStateContainer | MissionState, subjectId: AstronautId): boolean {
  if (!isAppContainer(source)) return true
  if (source.mode === 'astronaut') {
    return subjectId === (source.sessionAstronautId ?? 'crew-01')
  }
  return true
}

function resolveWorkspaceRecords(
  source: PreventionStateContainer | MissionState,
  scope: DataOrigin,
  preserveEmptySyntheticPlans = false,
): {
  missionTime: ISODateTime;
  crewIds: AstronautId[];
  measurements: MissionState['measurements'];
  assessments: NonNullable<MissionState['assessments']>;
  activities: MissionState['activities'];
  encounters: NonNullable<MissionState['encounters']>;
  preventionPlans: PreventionPlanItem[];
  hydrationRecords: HydrationRecord[];
} {
  if (isAppContainer(source)) {
    const target = scope === 'synthetic' ? source.mission : source.personal
    const crewIds = source.mission.crew.map(c => c.id)
    const rawPlans = target.preventionPlans ?? []
    const preventionPlans =
      scope === 'synthetic' && !preserveEmptySyntheticPlans
        ? ensureSyntheticPreventionPlans(rawPlans, crewIds, source.mission.missionTime)
        : rawPlans
    return {
      missionTime: source.mission.missionTime,
      crewIds,
      measurements: target.measurements,
      assessments: target.assessments ?? [],
      activities: target.activities ?? [],
      encounters: target.encounters ?? [],
      preventionPlans,
      hydrationRecords: target.hydrationRecords ?? [],
    }
  }

  const crewIds = source.crew.map(c => c.id)
  const rawPlans = (source.preventionPlans ?? []).filter(p => p.origin === scope)
  const preventionPlans =
    scope === 'synthetic' && !preserveEmptySyntheticPlans && rawPlans.length === 0
      ? ensureSyntheticPreventionPlans(undefined, crewIds.length ? crewIds : ['crew-01'], source.missionTime)
      : rawPlans

  return {
    missionTime: source.missionTime,
    crewIds,
    measurements: source.measurements.filter(r => r.origin === scope),
    assessments: (source.assessments ?? []).filter(r => r.origin === scope),
    activities: source.activities.filter(r => r.origin === scope),
    encounters: (source.encounters ?? []).filter(r => r.origin === scope),
    preventionPlans,
    hydrationRecords: (source.hydrationRecords ?? []).filter(r => r.origin === scope),
  }
}

export function computeActiveScheduleWindow(
  plan: Pick<PreventionPlanItem, 'plannedStartAt' | 'plannedEndAt' | 'recurrence'>,
  asOf: ISODateTime,
): { startAt: ISODateTime; endAt: ISODateTime; cycleIndex: number } {
  const baseStartMs = Date.parse(plan.plannedStartAt)
  const baseEndMs = Date.parse(plan.plannedEndAt)
  const nowMs = Date.parse(asOf)
  if (!Number.isFinite(baseStartMs) || !Number.isFinite(baseEndMs) || baseEndMs < baseStartMs || !Number.isFinite(nowMs)) {
    return { startAt: plan.plannedStartAt, endAt: plan.plannedEndAt, cycleIndex: 0 }
  }
  if (plan.recurrence === 'once' || nowMs < baseStartMs) {
    return {
      startAt: new Date(baseStartMs).toISOString(),
      endAt: new Date(baseEndMs).toISOString(),
      cycleIndex: 0,
    }
  }
  const periodMs = plan.recurrence === 'daily' ? 86400000 : 8 * 3600000
  const durationMs = Math.max(60000, baseEndMs - baseStartMs)
  const cycleIndex = Math.floor((nowMs - baseStartMs) / periodMs)
  const activeStartMs = baseStartMs + cycleIndex * periodMs
  const activeEndMs = activeStartMs + durationMs
  return {
    startAt: new Date(activeStartMs).toISOString(),
    endAt: new Date(activeEndMs).toISOString(),
    cycleIndex,
  }
}

function routeForTarget(targetKind: PreventionTargetKind): EvaluatedPreventionItem['recommendedRoute'] {
  switch (targetKind) {
    case 'physical_assessment':
      return { section: 'physical', label: 'Open Physical Performance (Camera / Optional)' }
    case 'exercise_activity':
      return { section: 'health', label: 'Open My Health (Exercise & Activity History)' }
    case 'sleep_observation':
    case 'fatigue_stress_check':
      return { section: 'health', label: 'Open My Health (Sleep & Recovery Observations)' }
    case 'reaction_assessment':
    case 'typing_assessment':
    case 'procedure_assessment':
      return { section: 'assessments', label: 'Open Daily Assessments (Cognitive & Task Checks)' }
    case 'hydration_log':
      return { section: 'prevention', label: 'Record Fluid Intake in Hydration Log' }
  }
}

function freshnessWindowMs(targetKind: PreventionTargetKind): number {
  if (targetKind === 'sleep_observation') return 24 * 3600000
  if (targetKind === 'hydration_log') return 12 * 3600000
  return 6 * 3600000
}

/**
 * Evaluates a single PreventionPlanItem against canonical workspace records at `asOf`.
 * Never infers completion from page navigation or missing/invalid records.
 */
export function selectPreventionItemStatus(
  source: PreventionStateContainer | MissionState,
  plan: PreventionPlanItem,
  scope: DataOrigin = plan.origin,
  asOf?: ISODateTime,
): EvaluatedPreventionItem {
  const data = resolveWorkspaceRecords(source, scope)
  const evalAsOf = asOf ?? data.missionTime ?? SYNTHETIC_PREVENTION_EPOCH
  const nowMs = Date.parse(evalAsOf)
  const activeWindow = computeActiveScheduleWindow(plan, evalAsOf)
  const winStartMs = Date.parse(activeWindow.startAt)
  const winEndMs = Date.parse(activeWindow.endAt)
  const recommendedRoute = routeForTarget(plan.targetKind)

  if (
    !canReadSubject(source, plan.astronautId) ||
    plan.origin !== scope ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(winStartMs) ||
    !Number.isFinite(winEndMs)
  ) {
    return {
      plan,
      status: 'unknown',
      activeWindow,
      matchedEvidence: [],
      invalidOrMissingEvidence: [],
      statusExplanation: 'Schedule state is unknown because the subject/workspace scope is inaccessible or timestamps are invalid.',
      recommendedRoute,
      warnings: ['Subject or timestamp validation prevented schedule evaluation.'],
    }
  }

  const subjectMeasurements = data.measurements.filter(r => r.astronautId === plan.astronautId && r.origin === scope)
  const subjectAssessments = data.assessments.filter(r => r.astronautId === plan.astronautId && r.origin === scope)
  const subjectActivities = data.activities.filter(r => r.astronautId === plan.astronautId && r.origin === scope)
  const subjectHydration = data.hydrationRecords.filter(r => r.astronautId === plan.astronautId && r.origin === scope)

  const withheldSet = new Set(plan.withheldObservationIds ?? [])
  const explicitIds = new Set([
    ...plan.linkedObservationIds,
    ...plan.completions.flatMap(c => c.evidenceIds),
  ])

  const matchedEvidence: PreventionEvidenceRef[] = []
  const invalidOrMissingEvidence: PreventionEvidenceRef[] = []
  const warnings: string[] = []
  const seenIds = new Set<string>()

  // 1. Check explicitly linked or withheld IDs first.
  for (const linkedId of [...explicitIds, ...withheldSet]) {
    if (seenIds.has(linkedId)) continue
    seenIds.add(linkedId)

    if (withheldSet.has(linkedId)) {
      invalidOrMissingEvidence.push({
        id: linkedId,
        kind: 'withheld_link',
        label: 'Withheld linked evidence',
        timestamp: plan.updatedAt,
        source: 'manual',
        origin: scope,
        quality: 'missing',
        summary: `Linked evidence record ${linkedId} was explicitly withheld/removed; completion requires verifiable canonical evidence.`,
        usable: false,
        reasonIfUnusable: 'Evidence withheld or removed from canonical workspace.',
      })
      continue
    }

    const m = subjectMeasurements.find(r => r.id === linkedId)
    const a = subjectAssessments.find(r => r.id === linkedId)
    const act = subjectActivities.find(r => r.id === linkedId)
    const h = subjectHydration.find(r => r.id === linkedId)

    if (!m && !a && !act && !h) {
      invalidOrMissingEvidence.push({
        id: linkedId,
        kind: 'withheld_link',
        label: 'Missing linked record',
        timestamp: plan.updatedAt,
        source: 'manual',
        origin: scope,
        quality: 'missing',
        summary: `Linked record ${linkedId} is not present in the ${scope} workspace.`,
        usable: false,
        reasonIfUnusable: 'Linked record missing from workspace.',
      })
      continue
    }

    if (m) {
      const recMs = Date.parse(m.timestamp)
      if (recMs > nowMs) {
        warnings.push(`Future-dated linked measurement ${m.id} (${m.timestamp}) excluded at ${evalAsOf}.`)
        continue
      }
      const usable = m.value !== null && Number.isFinite(m.value) && (m.quality === 'valid' || m.quality === 'estimated')
      const ref: PreventionEvidenceRef = {
        id: m.id,
        kind: 'measurement',
        label: m.metric.replaceAll('_', ' '),
        timestamp: m.timestamp,
        source: m.source,
        origin: m.origin,
        quality: m.quality,
        summary: `${m.metric}: ${m.value ?? 'missing'} ${m.unit} (${m.source}/${m.origin}/${m.quality})`,
        usable,
        ...(!usable ? { reasonIfUnusable: 'Measurement value is missing or quality is invalid.' } : {}),
      }
      if (usable) matchedEvidence.push(ref)
      else invalidOrMissingEvidence.push(ref)
    } else if (a) {
      const recMs = Date.parse(a.timestamp)
      if (recMs > nowMs) {
        warnings.push(`Future-dated linked assessment ${a.id} (${a.timestamp}) excluded at ${evalAsOf}.`)
        continue
      }
      const usable = evaluateAssessmentUsability(a)
      const ref: PreventionEvidenceRef = {
        id: a.id,
        kind: 'assessment',
        label: `${a.kind} assessment`,
        timestamp: a.timestamp,
        source: a.source,
        origin: a.origin,
        quality: a.quality,
        summary: summarizeAssessment(a),
        usable,
        ...(!usable ? { reasonIfUnusable: 'Assessment has insufficient tracking coverage or missing summary metrics.' } : {}),
      }
      if (usable) matchedEvidence.push(ref)
      else invalidOrMissingEvidence.push(ref)
    } else if (act) {
      const recMs = Date.parse(act.endedAt ?? act.startedAt)
      if (recMs > nowMs) {
        warnings.push(`Future-dated linked activity ${act.id} (${act.startedAt}) excluded at ${evalAsOf}.`)
        continue
      }
      const usable = act.quality === 'valid' || act.quality === 'estimated'
      const ref: PreventionEvidenceRef = {
        id: act.id,
        kind: 'activity',
        label: `${act.kind} activity`,
        timestamp: act.endedAt ?? act.startedAt,
        source: act.source,
        origin: act.origin,
        quality: act.quality,
        summary: `${act.kind} (${act.source}/${act.origin}/${act.quality})${act.details?.durationMinutes ? ` · ${act.details.durationMinutes} min` : ''}${act.details?.repetitions != null ? ` · ${act.details.repetitions} reps` : ''}`,
        usable,
        ...(!usable ? { reasonIfUnusable: 'Activity record quality is missing or invalid.' } : {}),
      }
      if (usable) matchedEvidence.push(ref)
      else invalidOrMissingEvidence.push(ref)
    } else if (h) {
      const recMs = Date.parse(h.timestamp)
      if (recMs > nowMs) {
        warnings.push(`Future-dated linked hydration record ${h.id} (${h.timestamp}) excluded at ${evalAsOf}.`)
        continue
      }
      const usable = h.amountMl !== null && h.amountMl > 0 && (h.quality === 'valid' || h.quality === 'estimated')
      const ref: PreventionEvidenceRef = {
        id: h.id,
        kind: 'hydration',
        label: 'Hydration intake',
        timestamp: h.timestamp,
        source: h.source,
        origin: h.origin,
        quality: h.quality,
        summary: h.amount !== null ? `${h.amount} ${h.unit} (${h.amountMl} mL · ${h.source}/${h.origin})` : `Unavailable hydration record (${h.quality})`,
        usable,
        ...(!usable ? { reasonIfUnusable: 'Hydration amount is missing or invalid.' } : {}),
      }
      if (usable) matchedEvidence.push(ref)
      else invalidOrMissingEvidence.push(ref)
    }
  }

  // 2. Scan canonical workspace records matching the plan targetKind.
  const periodEndMs =
    plan.recurrence === 'daily'
      ? winStartMs + 86400000
      : plan.recurrence === 'per_shift'
        ? winStartMs + 8 * 3600000
        : winEndMs + 12 * 3600000

  const inActiveCycle = (iso: ISODateTime) => {
    const ms = Date.parse(iso)
    if (!Number.isFinite(ms)) return false
    if (ms > nowMs) {
      warnings.push('Future-dated workspace observations after evaluation time were excluded.')
      return false
    }
    return ms >= winStartMs && ms <= periodEndMs
  }

  // Also check if there is only stale evidence prior to winStartMs when no evidence is in the active cycle.
  let staleCandidateFound = false
  const maxFreshness = freshnessWindowMs(plan.targetKind)

  if (plan.targetKind === 'physical_assessment' || plan.targetKind === 'exercise_activity') {
    for (const a of subjectAssessments) {
      if (a.kind !== 'physical' || seenIds.has(a.id)) continue
      const ms = Date.parse(a.timestamp)
      if (ms > nowMs) {
        warnings.push('Future-dated physical assessment excluded.')
        continue
      }
      if (inActiveCycle(a.timestamp)) {
        seenIds.add(a.id)
        const usable = evaluateAssessmentUsability(a)
        const ref: PreventionEvidenceRef = {
          id: a.id,
          kind: 'assessment',
          label: 'Physical camera assessment',
          timestamp: a.timestamp,
          source: a.source,
          origin: a.origin,
          quality: a.quality,
          summary: summarizeAssessment(a),
          usable,
          ...(!usable ? { reasonIfUnusable: 'Insufficient visual geometry or missing repetitions; not counted as completed exercise.' } : {}),
        }
        if (usable) matchedEvidence.push(ref)
        else invalidOrMissingEvidence.push(ref)
      } else if (nowMs - ms > maxFreshness) {
        staleCandidateFound = true
      }
    }

    for (const act of subjectActivities) {
      if (act.kind !== 'exercise' || seenIds.has(act.id)) continue
      // Background synthetic compartment movement activities without explicit exercise details do not auto-complete physical_assessment plans.
      if (plan.targetKind === 'physical_assessment' && act.source === 'simulator' && !act.details?.exercise) continue
      const stamp = act.endedAt ?? act.startedAt
      const ms = Date.parse(stamp)
      if (ms > nowMs) {
        warnings.push('Future-dated exercise activity excluded.')
        continue
      }
      if (inActiveCycle(stamp)) {
        seenIds.add(act.id)
        const usable = act.quality === 'valid' || act.quality === 'estimated'
        const ref: PreventionEvidenceRef = {
          id: act.id,
          kind: 'activity',
          label: act.source === 'camera_pose' ? 'Camera-linked exercise activity' : 'Exercise activity',
          timestamp: stamp,
          source: act.source,
          origin: act.origin,
          quality: act.quality,
          summary: `${act.kind} (${act.source}/${act.origin}/${act.quality})${act.details?.durationMinutes ? ` · ${act.details.durationMinutes} min` : ''}${act.details?.repetitions !== undefined ? ` · ${act.details.repetitions ?? 'unavailable'} reps` : ''}`,
          usable,
          ...(!usable ? { reasonIfUnusable: 'Exercise activity record has missing/invalid quality.' } : {}),
        }
        if (usable) matchedEvidence.push(ref)
        else invalidOrMissingEvidence.push(ref)
      } else if (nowMs - ms > maxFreshness) {
        staleCandidateFound = true
      }
    }

    for (const m of subjectMeasurements) {
      if (!['exercise_duration', 'exercise_repetitions'].includes(m.metric) || seenIds.has(m.id)) continue
      // Unlinked continuous simulator background ticks do not auto-complete the countermeasure check-in.
      if (m.source === 'simulator' && m.acquisition?.deviceId === 'demo-mission-observations') continue
      const ms = Date.parse(m.timestamp)
      if (ms > nowMs) {
        warnings.push('Future-dated exercise measurement excluded.')
        continue
      }
      if (inActiveCycle(m.timestamp)) {
        seenIds.add(m.id)
        const usable = m.value !== null && m.value > 0 && (m.quality === 'valid' || m.quality === 'estimated')
        const ref: PreventionEvidenceRef = {
          id: m.id,
          kind: 'measurement',
          label: m.metric.replaceAll('_', ' '),
          timestamp: m.timestamp,
          source: m.source,
          origin: m.origin,
          quality: m.quality,
          summary: `${m.metric}: ${m.value ?? 'missing'} ${m.unit} (${m.source}/${m.origin})`,
          usable,
          ...(!usable ? { reasonIfUnusable: 'Exercise measurement is missing, zero, or invalid.' } : {}),
        }
        if (usable) matchedEvidence.push(ref)
        else invalidOrMissingEvidence.push(ref)
      } else if (nowMs - ms > maxFreshness) {
        staleCandidateFound = true
      }
    }
  } else if (plan.targetKind === 'sleep_observation' || plan.targetKind === 'fatigue_stress_check') {
    const targetMetrics =
      plan.targetKind === 'sleep_observation'
        ? ['sleep_duration']
        : ['reported_fatigue', 'reported_stress', 'reported_mood']
    for (const m of subjectMeasurements) {
      if (!targetMetrics.includes(m.metric) || seenIds.has(m.id)) continue
      const ms = Date.parse(m.timestamp)
      if (ms > nowMs) {
        warnings.push(`Future-dated ${m.metric} observation excluded.`)
        continue
      }
      if (inActiveCycle(m.timestamp)) {
        seenIds.add(m.id)
        const usable = m.value !== null && Number.isFinite(m.value) && (m.quality === 'valid' || m.quality === 'estimated')
        const ref: PreventionEvidenceRef = {
          id: m.id,
          kind: 'measurement',
          label: m.metric.replaceAll('_', ' '),
          timestamp: m.timestamp,
          source: m.source,
          origin: m.origin,
          quality: m.quality,
          summary: `${m.metric}: ${m.value ?? 'missing'} ${m.unit} (${m.source}/${m.origin}/${m.quality})`,
          usable,
          ...(!usable ? { reasonIfUnusable: 'Observation value is missing or invalid.' } : {}),
        }
        if (usable) matchedEvidence.push(ref)
        else invalidOrMissingEvidence.push(ref)
      } else if (nowMs - ms > maxFreshness) {
        staleCandidateFound = true
      }
    }
  } else if (
    plan.targetKind === 'reaction_assessment' ||
    plan.targetKind === 'typing_assessment' ||
    plan.targetKind === 'procedure_assessment'
  ) {
    const expectedKind =
      plan.targetKind === 'reaction_assessment'
        ? 'reaction'
        : plan.targetKind === 'typing_assessment'
          ? 'typing'
          : 'procedure'
    for (const a of subjectAssessments) {
      if (a.kind !== expectedKind || seenIds.has(a.id)) continue
      const ms = Date.parse(a.timestamp)
      if (ms > nowMs) {
        warnings.push(`Future-dated ${a.kind} assessment excluded.`)
        continue
      }
      if (inActiveCycle(a.timestamp)) {
        seenIds.add(a.id)
        const usable = evaluateAssessmentUsability(a)
        const ref: PreventionEvidenceRef = {
          id: a.id,
          kind: 'assessment',
          label: `${a.kind} assessment`,
          timestamp: a.timestamp,
          source: a.source,
          origin: a.origin,
          quality: a.quality,
          summary: summarizeAssessment(a),
          usable,
          ...(!usable ? { reasonIfUnusable: 'Assessment record is incomplete or has missing summary score.' } : {}),
        }
        if (usable) matchedEvidence.push(ref)
        else invalidOrMissingEvidence.push(ref)
      } else if (nowMs - ms > maxFreshness) {
        staleCandidateFound = true
      }
    }
  } else if (plan.targetKind === 'hydration_log') {
    for (const h of subjectHydration) {
      if (seenIds.has(h.id)) continue
      const ms = Date.parse(h.timestamp)
      if (ms > nowMs) {
        warnings.push('Future-dated hydration entry excluded.')
        continue
      }
      if (inActiveCycle(h.timestamp)) {
        seenIds.add(h.id)
        const usable = h.amountMl !== null && h.amountMl > 0 && (h.quality === 'valid' || h.quality === 'estimated')
        const ref: PreventionEvidenceRef = {
          id: h.id,
          kind: 'hydration',
          label: 'Hydration intake',
          timestamp: h.timestamp,
          source: h.source,
          origin: h.origin,
          quality: h.quality,
          summary: h.amount !== null ? `${h.amount} ${h.unit} (${h.amountMl} mL · ${h.source}/${h.origin})` : `Missing hydration entry (${h.quality})`,
          usable,
          ...(!usable ? { reasonIfUnusable: 'Hydration entry is marked missing/unavailable.' } : {}),
        }
        if (usable) matchedEvidence.push(ref)
        else invalidOrMissingEvidence.push(ref)
      } else if (nowMs - ms > maxFreshness) {
        staleCandidateFound = true
      }
    }
  }

  // If stale evidence exists outside the freshness window and nothing exists in the current window:
  if (matchedEvidence.length === 0 && invalidOrMissingEvidence.length === 0 && staleCandidateFound && nowMs > winEndMs) {
    invalidOrMissingEvidence.push({
      id: `stale-${plan.id}`,
      kind: 'measurement',
      label: 'Stale historical evidence only',
      timestamp: evalAsOf,
      source: 'assessment',
      origin: scope,
      quality: 'missing',
      summary: 'Earlier historical records exist outside the active schedule and freshness window; current window is unverified.',
      usable: false,
      reasonIfUnusable: 'Stale historical evidence outside active schedule window.',
    })
  }

  // Determine disjoint status.
  const hasWithheld = withheldSet.size > 0 && matchedEvidence.length === 0
  let status: PreventionStatus
  let statusExplanation: string

  if (matchedEvidence.length > 0) {
    status = 'completed'
    const latestMatch = matchedEvidence.slice().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).at(-1)!
    statusExplanation = `Completed with ${matchedEvidence.length} verified record(s). Latest: ${latestMatch.summary} at ${latestMatch.timestamp}.`
  } else if (hasWithheld || invalidOrMissingEvidence.length > 0) {
    status = 'insufficient_evidence'
    statusExplanation = `Insufficient or withheld evidence (${invalidOrMissingEvidence[0]!.reasonIfUnusable ?? invalidOrMissingEvidence[0]!.summary}). Completion is never inferred without usable linked data.`
  } else if (nowMs < winStartMs) {
    status = 'not_yet_due'
    statusExplanation = `Scheduled window starts at ${activeWindow.startAt} (current time ${evalAsOf}).`
  } else if (nowMs >= winStartMs && nowMs <= winEndMs) {
    status = 'due'
    statusExplanation = `Scheduled now (${activeWindow.startAt} → ${activeWindow.endAt}). No linked ${scope} completion record yet.`
  } else {
    status = 'unknown'
    statusExplanation = `Scheduled window (${activeWindow.startAt} → ${activeWindow.endAt}) has elapsed without a linked ${scope} record. Activity is unverified — never inferred as noncompliance or a medical issue.`
  }

  return {
    plan,
    status,
    activeWindow,
    matchedEvidence,
    invalidOrMissingEvidence,
    statusExplanation,
    recommendedRoute,
    warnings: [...new Set(warnings)],
  }
}

function evaluateAssessmentUsability(a: NonNullable<MissionState['assessments']>[number]): boolean {
  if (a.quality !== 'valid' && a.quality !== 'estimated') return false
  if (a.kind === 'physical') return a.result.sufficient && a.result.repetitions !== null
  if (a.kind === 'visual') return a.result.sufficient && a.result.blinkCount !== null
  if (a.kind === 'reaction') return a.result.meanMs !== null && Number.isFinite(a.result.meanMs)
  if (a.kind === 'typing') return a.result.typedCharacters > 0 && Number.isFinite(a.result.wpm)
  if (a.kind === 'procedure') return a.result.completed
  return false
}

function summarizeAssessment(a: NonNullable<MissionState['assessments']>[number]): string {
  if (a.kind === 'physical') {
    return a.result.sufficient
      ? `Right elbow flexion: ${a.result.repetitions} repetitions, range ${a.result.rangeDeg?.toFixed(1) ?? '—'}° (camera_pose/${a.origin}/experimental)`
      : `Physical camera assessment unavailable (insufficient tracking coverage ${(a.result.trackingCoverage * 100).toFixed(0)}%)`
  }
  if (a.kind === 'reaction') {
    return `Reaction mean ${a.result.meanMs?.toFixed(0) ?? 'unavailable'} ms (${a.source}/${a.origin}/${a.quality})`
  }
  if (a.kind === 'typing') {
    return `Typing ${a.result.wpm.toFixed(1)} WPM, ${a.result.accuracy.toFixed(1)}% accuracy (${a.source}/${a.origin}/${a.quality})`
  }
  if (a.kind === 'procedure') {
    return `Procedure check: ${a.result.completed ? 'completed' : 'incomplete'} (${a.result.attempts.length} attempts, ${a.source}/${a.origin})`
  }
  return `Visual assessment (${a.source}/${a.origin}/${a.quality})`
}

/**
 * Computes hydration totals for an explicit period without inventing targets or treating missing entries as zero.
 */
export function selectHydrationSummary(
  source: PreventionStateContainer | MissionState,
  subjectId: AstronautId,
  scope: DataOrigin = 'observed',
  asOf?: ISODateTime,
  windowHours = 24,
): HydrationPeriodSummary {
  const data = resolveWorkspaceRecords(source, scope)
  const evalAsOf = asOf ?? data.missionTime ?? SYNTHETIC_PREVENTION_EPOCH
  const nowMs = Date.parse(evalAsOf)
  const safeHours = Number.isFinite(windowHours) && windowHours > 0 ? windowHours : 24
  const startMs = Number.isFinite(nowMs) ? nowMs - safeHours * 3600000 : 0
  const windowStartAt = new Date(startMs).toISOString()

  if (!canReadSubject(source, subjectId)) {
    return {
      astronautId: subjectId,
      scope,
      asOf: evalAsOf,
      windowHours: safeHours,
      windowStartAt,
      totalMl: 0,
      usableEntriesCount: 0,
      missingEntriesCount: 0,
      convertedFromLitersCount: 0,
      userGoalMl: null,
      goalLabel: 'Access restricted in ordinary Astronaut Mode.',
      records: [],
      warnings: ['Subject hydration records are not accessible in ordinary Astronaut Mode.'],
    }
  }

  const allSubject = data.hydrationRecords
    .filter(r => r.astronautId === subjectId && r.origin === scope)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))

  const warnings: string[] = []
  const inWindow = allSubject.filter(r => {
    const ms = Date.parse(r.timestamp)
    if (ms > nowMs) {
      warnings.push(`Future-dated hydration entry ${r.id} (${r.timestamp}) excluded from period total.`)
      return false
    }
    return ms >= startMs && ms <= nowMs
  })

  let totalMl = 0
  let usableEntriesCount = 0
  let missingEntriesCount = 0
  let convertedFromLitersCount = 0

  for (const r of inWindow) {
    if (r.quality === 'missing' || r.quality === 'invalid' || r.amountMl === null) {
      missingEntriesCount++
      continue
    }
    totalMl += r.amountMl
    usableEntriesCount++
    if (r.unit === 'L') convertedFromLitersCount++
  }

  if (missingEntriesCount > 0) {
    warnings.push(`${missingEntriesCount} hydration record(s) have missing/unavailable amount and are not counted as zero.`)
  }
  if (convertedFromLitersCount > 0) {
    warnings.push(`${convertedFromLitersCount} entry/entries recorded in L were converted using 1 L = 1000 mL.`)
  }

  const hydrationPlan = data.preventionPlans
    .filter(p => p.astronautId === subjectId && p.origin === scope && p.category === 'hydration' && p.hydrationGoalMl != null)
    .at(-1)
  const userGoalMl = hydrationPlan?.hydrationGoalMl ?? null
  const goalLabel =
    userGoalMl !== null
      ? `${userGoalMl} mL (${hydrationPlan?.planSource === 'user_created' ? 'User-entered tracking goal — not a clinical prescription' : 'Synthetic demo reference — not a NASA or clinical requirement'})`
      : 'No tracking goal set (optional user-entered reference only)'

  return {
    astronautId: subjectId,
    scope,
    asOf: evalAsOf,
    windowHours: safeHours,
    windowStartAt,
    totalMl: Number(totalMl.toFixed(2)),
    usableEntriesCount,
    missingEntriesCount,
    convertedFromLitersCount,
    userGoalMl,
    goalLabel,
    records: inWindow,
    warnings,
  }
}

/**
 * Read-only sleep & recovery context selector.
 * Uses existing sleep observations, qualified baseline logic from src/health/intelligence.ts,
 * and existing CDSS cases without fabricating sleep values or modifying encounters.
 */
export function selectSleepRecoveryContext(
  source: PreventionStateContainer | MissionState,
  subjectId: AstronautId,
  scope: DataOrigin = 'observed',
  asOf?: ISODateTime,
): SleepRecoveryContext {
  const data = resolveWorkspaceRecords(source, scope)
  const evalAsOf = asOf ?? data.missionTime ?? SYNTHETIC_PREVENTION_EPOCH
  const nowMs = Date.parse(evalAsOf)

  if (!canReadSubject(source, subjectId)) {
    const emptyComparison = compareBaseline([], 'sleep_duration', evalAsOf)
    return {
      astronautId: subjectId,
      scope,
      asOf: evalAsOf,
      latestSleepHours: null,
      latestSleepTimestamp: null,
      latestSleepQuality: null,
      latestFatigueScore: null,
      latestStressScore: null,
      baselineComparison: emptyComparison,
      linkedEncounters: [],
      explanation: 'Access restricted: another crew member’s sleep and recovery history is not disclosed in ordinary Astronaut Mode.',
    }
  }

  const missionLike: MissionState = isAppContainer(source)
    ? {
        ...source.mission,
        measurements: data.measurements,
        assessments: data.assessments,
        activities: data.activities,
        encounters: data.encounters,
      }
    : source

  const observations = performanceObservations(missionLike, subjectId, scope)
  const baselineComparison = compareBaseline(observations, 'sleep_duration', evalAsOf)

  const validMeasurements = data.measurements
    .filter(r => r.astronautId === subjectId && r.origin === scope && Date.parse(r.timestamp) <= nowMs)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))

  const latestSleep = validMeasurements.filter(r => r.metric === 'sleep_duration').at(-1) ?? null
  const latestFatigue = validMeasurements.filter(r => r.metric === 'reported_fatigue' && r.value !== null && (r.quality === 'valid' || r.quality === 'estimated')).at(-1) ?? null
  const latestStress = validMeasurements.filter(r => r.metric === 'reported_stress' && r.value !== null && (r.quality === 'valid' || r.quality === 'estimated')).at(-1) ?? null

  const linkedEncounters = data.encounters.filter(
    e =>
      e.astronautId === subjectId &&
      e.origin === scope &&
      (e.alertId.includes('recovery') || e.alertId.includes('DEMO-MULTI-PERF-01') || e.title.toLowerCase().includes('recovery') || e.title.toLowerCase().includes('performance')),
  )

  let explanation: string
  if (baselineComparison.status === 'ready') {
    explanation = `Latest sleep is ${baselineComparison.current!.value} h vs qualified 3-session median baseline of ${baselineComparison.baseline!.toFixed(2)} h (Δ ${baselineComparison.delta!.toFixed(2)} h, ${baselineComparison.percentChange?.toFixed(1) ?? '0.0'}%). Descriptive comparison only; not a clinical diagnosis.`
  } else if (baselineComparison.status === 'insufficient_baseline') {
    explanation = `Latest sleep is ${baselineComparison.current?.value ?? 'unavailable'} h. Qualified baseline requires three earlier compatible sessions with recorded conditions (found ${baselineComparison.baselineRecords.length}). No baseline is fabricated.`
  } else if (baselineComparison.status === 'stale') {
    explanation = `Latest sleep record (${baselineComparison.current?.timestamp ?? 'unknown'}) is outside the 24-hour engineering freshness window at ${evalAsOf}.`
  } else if (baselineComparison.status === 'incompatible') {
    explanation = 'Latest sleep record lacks declared acquisition conditions/device/protocol, so a qualified baseline comparison is withheld.'
  } else if (baselineComparison.status === 'invalid') {
    explanation = 'Latest sleep entry is marked missing/invalid; earlier usable sleep records remain in history only.'
  } else {
    explanation = 'No usable sleep duration observations recorded in this workspace. Missing sleep data is never treated as zero or normal recovery.'
  }

  return {
    astronautId: subjectId,
    scope,
    asOf: evalAsOf,
    latestSleepHours: latestSleep?.value ?? null,
    latestSleepTimestamp: latestSleep?.timestamp ?? null,
    latestSleepQuality: latestSleep?.quality ?? null,
    latestFatigueScore: latestFatigue?.value ?? null,
    latestStressScore: latestStress?.value ?? null,
    baselineComparison,
    linkedEncounters,
    explanation,
  }
}

/**
 * Primary read-only selector for Preventive Health Management.
 * Suitable for direct consumption by the future Medical Assistant and the PreventiveHealth UI.
 */
export function selectPreventionSchedule(
  source: PreventionStateContainer | MissionState,
  subjectId: AstronautId,
  scope: DataOrigin = 'observed',
  asOf?: ISODateTime,
): PreventionScheduleSummary {
  const data = resolveWorkspaceRecords(source, scope)
  const evalAsOf = asOf ?? data.missionTime ?? SYNTHETIC_PREVENTION_EPOCH
  const counts: Record<PreventionStatus, number> = {
    completed: 0,
    due: 0,
    not_yet_due: 0,
    insufficient_evidence: 0,
    unknown: 0,
  }

  if (!canReadSubject(source, subjectId)) {
    return {
      astronautId: subjectId,
      scope,
      asOf: evalAsOf,
      accessRestricted: true,
      accessNotice: 'Ordinary Astronaut Mode restricts prevention schedules and medical evidence to the signed-in astronaut profile.',
      items: [],
      counts,
      hydrationSummary: selectHydrationSummary(source, subjectId, scope, evalAsOf),
      sleepRecoveryContext: selectSleepRecoveryContext(source, subjectId, scope, evalAsOf),
      limitations: [
        'Ordinary Astronaut Mode isolates personal health records and schedules to the active subject.',
      ],
    }
  }

  const subjectPlans = data.preventionPlans
    .filter(p => p.astronautId === subjectId && p.origin === scope)
    .sort((a, b) => Date.parse(a.plannedStartAt) - Date.parse(b.plannedStartAt))

  const items = subjectPlans.map(plan => selectPreventionItemStatus(source, plan, scope, evalAsOf))
  for (const item of items) {
    counts[item.status]++
  }

  return {
    astronautId: subjectId,
    scope,
    asOf: evalAsOf,
    accessRestricted: false,
    accessNotice: null,
    items,
    counts,
    hydrationSummary: selectHydrationSummary(source, subjectId, scope, evalAsOf),
    sleepRecoveryContext: selectSleepRecoveryContext(source, subjectId, scope, evalAsOf),
    limitations: [
      'Prevention schedules and windows are informational engineering or user-created items, not clinical orders or validated NASA flight rules.',
      'Completion requires verifiable linked or window-matched canonical records; opening an assessment view never marks a check complete.',
      'Missing or overdue records are reported as unknown/unverified or insufficient_evidence, never as noncompliance or a medical diagnosis.',
      'Elbow-flexion camera repetitions are viewpoint-dependent 2D geometry and do not measure or improve bone mineral density.',
      'Preventive actions never automatically modify, open, or resolve CDSS medical encounters.',
    ],
  }
}
