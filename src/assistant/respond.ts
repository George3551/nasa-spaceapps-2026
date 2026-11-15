import type { AcquisitionContext, AssessmentResult, BaselineComparison, EnvironmentalMeasurement, HealthAlert, MedicalEncounter, PerformanceObservation, PerformanceSignal } from '../../contracts/types'
import { formatTimestamp } from '../app/format'
import { compareBaseline } from '../health/intelligence'
import type { ScopedRecords, AssistantScope } from './scope'
import type { AssistantAction, AssistantReply, EvidenceAvailability, EvidenceItem, ParsedQuestion } from './types'

/** Builds replies ONLY from records in the scoped state passed in. No canned scenario
 *  values: every number, ID and timestamp below is read from a canonical record. */

const LABELS: Partial<Record<PerformanceSignal, string>> = {
  sleep_duration: 'Sleep duration', reported_fatigue: 'Self-reported fatigue (0–10)', reported_stress: 'Self-reported stress (0–10)', reported_mood: 'Self-reported mood (0–10)',
  reaction_mean: 'Reaction time (mean)', typing_wpm: 'Typing speed', visual_blink_rate: 'Blink rate (experimental)', visual_closure_proportion: 'Eye-closure proportion (experimental)',
  heart_rate: 'Heart rate', resting_heart_rate: 'Resting heart rate', oxygen_saturation: 'Oxygen saturation (SpO₂)', blood_pressure_systolic: 'Blood pressure, systolic', blood_pressure_diastolic: 'Blood pressure, diastolic',
  body_temperature: 'Body temperature', heart_rate_variability: 'Heart-rate variability (protocol-defined statistic)', exercise_duration: 'Exercise duration', physical_repetitions: 'Exercise repetitions (experimental camera)',
  cabin_co2: 'Cabin CO₂', cabin_temperature: 'Cabin temperature', cabin_pressure: 'Cabin pressure', radiation_dose: 'Radiation observation', laboratory: 'Laboratory value', bone_mineral_density: 'Bone mineral density', symptom_severity: 'Symptom severity (0–10)',
}
export const signalLabel = (s: PerformanceSignal) => LABELS[s] ?? s.replaceAll('_', ' ')
const PHYSIOLOGY: PerformanceSignal[] = ['heart_rate', 'resting_heart_rate', 'oxygen_saturation', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'body_temperature', 'heart_rate_variability']
const ENVIRONMENT: EnvironmentalMeasurement['metric'][] = ['cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose']
const SELF_REPORT: PerformanceSignal[] = ['reported_fatigue', 'reported_stress', 'reported_mood']
const MAX_EVIDENCE = 14

export const formatNumber = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? null : String(Number(value.toFixed(2)))
const withUnit = (value: number | null | undefined, unit: string) => { const v = formatNumber(value); return v === null ? 'no usable value' : `${v} ${unit}` }
const signed = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(value)}`
const at = (timestamp: string) => formatTimestamp(timestamp)
export const acquisitionText = (a?: AcquisitionContext) => a ? `${a.deviceId} · ${a.protocolId} · ${a.condition} · session ${a.sessionId}` : 'Acquisition conditions unrecorded'
const originBadge = (scope: ScopedRecords) => scope.origin === 'synthetic' ? 'SYNTHETIC mission preview' : 'OBSERVED records'

function provenanceNote(scope: ScopedRecords) {
  return scope.origin === 'synthetic'
    ? 'SYNTHETIC: fictional scenario data produced by the AEGIS simulator and demo fixtures. Not real astronaut or NASA telemetry.'
    : 'OBSERVED: records entered or captured on this device. Device/protocol labels are self-declared, not verified hardware calibration.'
}
const freshnessNote = (scope: ScopedRecords) => scope.performance.limitations.find(l => l.startsWith('Freshness')) ?? 'Freshness windows are engineering choices.'
const baselineNote = (scope: ScopedRecords) => scope.performance.limitations.find(l => l.startsWith('Baseline')) ?? 'Baselines require earlier compatible sessions.'

function kindOf(scope: ScopedRecords, id: string): EvidenceItem['kind'] {
  if (scope.measurements.some(r => r.id === id)) return 'measurement'
  if (scope.assessments.some(r => r.id === id)) return 'assessment'
  if (scope.environmentAll.some(r => r.id === id)) return 'environment'
  return 'examination'
}

function observationEvidence(scope: ScopedRecords, r: PerformanceObservation, availability: EvidenceAvailability, detail?: string): EvidenceItem {
  const value = formatNumber(r.value)
  const measurement = scope.measurements.find(m => m.id === r.id)
  return {
    id: r.id, kind: kindOf(scope, r.id), label: signalLabel(r.signal) + (r.analyte ? ` · ${r.analyte}` : ''), value, unit: r.unit, timestamp: r.timestamp,
    origin: r.origin, source: r.source, quality: r.quality, acquisition: acquisitionText(r.acquisition), availability,
    ...(measurement?.demonstrationOnly || scope.assessments.find(a => a.id === r.id)?.demonstrationOnly || scope.environmentAll.find(e => e.id === r.id)?.demonstrationOnly ? { demonstrationOnly: true } : {}),
    ...(detail ? { detail } : {}), ...(measurement?.note ? { userNote: measurement.note } : {}),
  }
}

interface Described { sentence: string; evidence: EvidenceItem[]; warnings: string[]; ready: boolean; hasCurrent: boolean }

/** Explains one BaselineComparison from the v4.1 engine without adding inference. */
export function describeComparison(scope: ScopedRecords, c: BaselineComparison, label = signalLabel(c.signal)): Described {
  const warnings = c.warnings.filter(w => !w.startsWith('Declared acquisition labels'))
  const base = { warnings, ready: false, hasCurrent: false }
  const latest = c.latestEntry, current = c.current
  if (c.status === 'missing') {
    if (!latest) return { ...base, sentence: `${label}: no record in this workspace. Missing data is not zero and does not indicate good or poor health.`, evidence: [] }
    return { ...base, sentence: `${label}: the latest entry (${latest.id}, ${at(latest.timestamp)}) has no usable value (quality: ${latest.quality}). Missing is not zero.`, evidence: [observationEvidence(scope, latest, latest.quality === 'invalid' ? 'invalid' : 'missing')] }
  }
  if (!current) return { ...base, sentence: `${label}: no usable value.`, evidence: [] }
  if (c.status === 'invalid') {
    const ev = [observationEvidence(scope, current, 'historical'), ...(latest ? [observationEvidence(scope, latest, latest.quality === 'invalid' ? 'invalid' : 'missing')] : [])]
    return { ...base, sentence: `${label}: the latest entry${latest ? ` (${latest.id}, ${at(latest.timestamp)}, quality ${latest.quality})` : ''} has no usable value. The earlier value ${withUnit(current.value, current.unit)} from ${at(current.timestamp)} is history only and is not reported as current.`, evidence: ev }
  }
  if (c.status === 'stale') return { ...base, sentence: `${label}: the most recent usable value is ${withUnit(current.value, current.unit)} from ${at(current.timestamp)}, which is outside the demonstration freshness window as of ${at(scope.asOf)}. It is not reported as a current value.`, evidence: [observationEvidence(scope, current, 'stale')] }
  const latestText = `${label}: ${withUnit(current.value, current.unit)} at ${at(current.timestamp)} (${current.source}, ${current.origin}, quality ${current.quality})`
  if (c.status === 'ready' && c.baseline !== null && c.delta !== null) {
    const pct = c.percentChange === null ? 'percentage unavailable' : `${signed(c.percentChange)}%`
    return { warnings, ready: true, hasCurrent: true, sentence: `${latestText}. Qualified ${ENVIRONMENT.includes(c.signal as EnvironmentalMeasurement['metric']) ? '' : 'personal '}baseline: ${withUnit(c.baseline, current.unit)} (median of ${c.baselineRecords.length} earlier compatible sessions: ${c.baselineRecords.map(r => r.id).join(', ')}). Difference ${signed(c.delta)} ${current.unit} (${pct}).`, evidence: [observationEvidence(scope, current, 'current'), ...c.baselineRecords.map(r => observationEvidence(scope, r, 'baseline'))] }
  }
  const reason = c.status === 'incompatible' ? 'no qualified baseline comparison because acquisition context is unrecorded or earlier sessions are not compatible' : `no qualified baseline yet (${warnings.find(w => w.startsWith('Need three')) ?? 'fewer than three earlier compatible sessions'})`
  return { ...base, hasCurrent: true, sentence: `${latestText}; ${reason}.`, evidence: [observationEvidence(scope, current, 'current')] }
}

function reply(scope: ScopedRecords | null, partial: Omit<AssistantReply, 'scope' | 'provider' | 'policyNotes' | 'evidence' | 'actions' | 'limitations'> & Partial<Pick<AssistantReply, 'evidence' | 'actions' | 'limitations'>>): AssistantReply {
  const evidence = dedupe(partial.evidence ?? [])
  const limitations = [...(partial.limitations ?? [])]
  if (evidence.length > MAX_EVIDENCE) limitations.push(`Showing ${MAX_EVIDENCE} of ${evidence.length} cited records; open the linked section for the full list.`)
  if (scope && evidence.some(e => e.demonstrationOnly)) limitations.push('Records marked "demonstration only" come from labelled demo fixtures or rules. Their cut-offs are not clinical thresholds or flight limits.')
  if (scope) limitations.push(provenanceNote(scope))
  return {
    ...partial, evidence: evidence.slice(0, MAX_EVIDENCE), actions: partial.actions ?? [], limitations: [...new Set(limitations)], provider: 'local-rules', policyNotes: [],
    scope: scope ? { subjectId: scope.subject.id, subjectName: scope.subject.displayName, origin: scope.origin, asOf: scope.asOf } : null,
  }
}
function dedupe(items: EvidenceItem[]) {
  const seen = new Map<string, EvidenceItem>()
  for (const item of items) { const key = `${item.kind}:${item.id}:${item.label}`; if (!seen.has(key)) seen.set(key, item) }
  return [...seen.values()]
}
const act = (label: string, section: AssistantAction['section']): AssistantAction => ({ label, section })
const comparison = (scope: ScopedRecords, signal: PerformanceSignal) => scope.performance.comparisons.find(c => c.signal === signal)
const intro = (scope: ScopedRecords) => `${scope.subject.displayName} · ${originBadge(scope)} · records as of ${at(scope.asOf)}.`

function alertEvidence(alert: HealthAlert): EvidenceItem {
  return { id: alert.id, kind: 'alert', label: `Alert: ${alert.title}`, value: alert.status === 'acknowledged' ? 'acknowledged' : 'not yet acknowledged', timestamp: alert.createdAt, availability: 'record', detail: `${alert.level} level · rule ${alert.ruleId}`, ...(alert.demonstrationOnly ? { demonstrationOnly: true } : {}) }
}
function caseEvidence(encounter: MedicalEncounter): EvidenceItem {
  return { id: encounter.id, kind: 'case', label: `Case: ${encounter.title}`, value: encounter.status.replace('_', ' '), timestamp: encounter.timestamp, origin: encounter.origin, source: encounter.source, quality: encounter.quality, availability: 'record', ...(encounter.demonstrationOnly ? { demonstrationOnly: true } : {}) }
}
/** Resolves an alert/finding evidence ID to the scoped record, never to another subject's. */
function citedEvidence(scope: ScopedRecords, observationId: string, detail: string): EvidenceItem | null {
  const obs = scope.observations.find(r => r.id === observationId)
  if (obs) return observationEvidence(scope, obs, 'record', detail)
  const env = scope.environmentAll.find(r => r.id === observationId)
  if (env) return { id: env.id, kind: 'environment', label: `${signalLabel(env.metric)} · ${compartmentLabel(scope, env.compartmentId)}`, value: formatNumber(env.value), unit: env.unit, timestamp: env.timestamp, origin: env.origin, source: env.source, quality: env.quality, acquisition: acquisitionText(env.acquisition), availability: 'record', detail, ...(env.demonstrationOnly ? { demonstrationOnly: true } : {}) }
  const measurement = scope.measurements.find(r => r.id === observationId)
  if (measurement) return observationEvidence(scope, { ...measurement, signal: measurement.metric }, 'record', detail)
  return null
}
const compartmentLabel = (scope: ScopedRecords, id: string) => scope.compartments.find(c => c.id === id)?.label ?? id

/* ---------------- intent builders ---------------- */

function overview(scope: ScopedRecords): AssistantReply {
  const described = scope.performance.comparisons.filter(c => c.latestEntry).map(c => ({ c, d: describeComparison(scope, c) }))
  const total = scope.measurements.length + scope.assessments.length + scope.examinations.length
  if (!total) return reply(scope, { intent: 'overview', status: 'insufficient', headline: 'No health observations are recorded for you in this workspace yet.',
    body: [intro(scope), 'I cannot describe how you are doing without records, and I do not compute a health score or clearance. Missing data does not mean good or poor health.', scope.origin === 'observed' ? 'You can add a manual observation in My Health or run a Daily Assessment; results will be stored only in your observed records.' : 'Load and advance a scenario in Mission Overview to generate synthetic records.'],
    actions: [act('Open My Health', 'health'), act('Open Daily Assessments', 'assessments')], limitations: ['No universal health score is computed.'] })
  const byKind = scope.assessments.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.kind]: (acc[a.kind] ?? 0) + 1 }), {})
  const current = described.filter(x => x.d.hasCurrent), notCurrent = described.filter(x => !x.d.hasCurrent)
  const openCases = scope.encounters.filter(e => e.status !== 'resolved').length
  const body = [intro(scope), 'This is a description of available records, not a health status. AEGIS does not compute a universal health score or clearance.',
    `Recorded: ${scope.measurements.length} numeric observations, ${scope.assessments.length} assessments${Object.keys(byKind).length ? ` (${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', ')})` : ''}, ${scope.examinations.length} examination reports, ${scope.environment.length} environmental records in context.`,
    current.length ? `Current usable values exist for: ${current.map(x => signalLabel(x.c.signal)).join(', ')}. Of these, ${current.filter(x => x.d.ready).length} have a qualified personal baseline.` : 'No indicator currently has a usable value inside its freshness window.',
    ...(notCurrent.length ? [`Not current (missing, invalid or stale): ${notCurrent.map(x => `${signalLabel(x.c.signal)} (${x.c.status.replace('_', ' ')})`).join(', ')}.`] : []),
    scope.performance.findings.length ? `Demonstration findings: ${scope.performance.findings.map(f => `“${f.title}” (${f.ruleId})`).join('; ')}. Ask “Why did my performance indicators change?” for the evidence.` : 'No demonstration finding is established from compatible evidence. This is not health clearance.',
    `Alerts: ${scope.alerts.length} (${scope.alerts.filter(a => a.status === 'new').length} not yet acknowledged). Cases: ${scope.encounters.length} (${openCases} not resolved).`]
  return reply(scope, { intent: 'overview', status: 'answered', headline: `Summary of your accessible records (${originBadge(scope)}).`, body,
    evidence: current.flatMap(x => x.d.evidence.filter(e => e.availability === 'current')).slice(0, 8),
    actions: [act('Open My Health', 'health'), act('Open Human Performance Assessment', 'performance'), ...(scope.alerts.length ? [act('Open Events & Alerts', 'events' as const)] : [])],
    limitations: ['No universal health score is computed.', freshnessNote(scope)] })
}

function performanceFindings(scope: ScopedRecords): AssistantReply {
  const findings = scope.performance.findings
  if (!findings.length) {
    const parts = (['sleep_duration', 'reported_fatigue', 'reaction_mean', 'typing_wpm'] as const).map(s => comparison(scope, s)).filter((c): c is BaselineComparison => !!c).map(c => describeComparison(scope, c))
    return reply(scope, { intent: 'performance_findings', status: 'insufficient', headline: 'No demonstration performance finding is currently established.',
      body: [intro(scope), 'The v4.1 Human Performance Assessment did not establish a demonstration combination from compatible evidence. This is not health clearance; missing modalities and baselines are listed below.', ...parts.map(p => p.sentence)],
      evidence: parts.flatMap(p => p.evidence.filter(e => e.availability !== 'baseline')),
      actions: [act('Open Human Performance Assessment', 'performance'), act('Open Daily Assessments', 'assessments')],
      limitations: [...new Set(parts.flatMap(p => p.warnings))].concat([baselineNote(scope), freshnessNote(scope)]) })
  }
  const body = [intro(scope), `The v4.1 Human Performance Assessment reports ${findings.length} demonstration finding${findings.length === 1 ? '' : 's'}. These are descriptive co-changes under labelled demonstration rules, not a diagnosis or a cause.`]
  const evidence: EvidenceItem[] = [], actions: AssistantAction[] = [act('Open Human Performance Assessment', 'performance')]
  const limitations: string[] = []
  for (const f of findings) {
    body.push(`“${f.title}” (rule ${f.ruleId}, demonstration only). Recorded rule explanation: ${f.explanation}`)
    for (const e of f.evidence) { const item = citedEvidence(scope, e.observationId, e.explanation); if (item) evidence.push(item); else limitations.push(`Cited record ${e.observationId} is not in your scoped records and is not shown.`) }
    const behind = scope.performance.comparisons.filter(c => c.status === 'ready' && c.current && f.evidence.some(e => e.observationId === c.current!.id))
    if (behind.length) body.push('Qualified comparisons behind this finding (from the v4.1 engine):', ...behind.map(c => describeComparison(scope, c).sentence))
    body.push(`Recorded next evaluation: ${f.nextStep}`)
    const ids = new Set(f.evidence.map(e => e.observationId))
    for (const alert of scope.alerts.filter(a => a.evidence.some(e => ids.has(e.observationId)))) {
      const encounter = scope.encounters.find(e => e.alertId === alert.id)
      body.push(`This finding is attached to alert “${alert.title}” (${alert.id}, ${alert.status === 'acknowledged' ? 'acknowledged' : 'not yet acknowledged'})${encounter ? ` and case ${encounter.id} (${encounter.status.replace('_', ' ')})` : ''}.`)
      evidence.push(alertEvidence(alert)); if (encounter) evidence.push(caseEvidence(encounter))
    }
  }
  if (evidence.some(e => e.kind === 'alert')) actions.push(act('Open Events & Alerts (review and follow-up)', 'events'))
  return reply(scope, { intent: 'performance_findings', status: 'answered', headline: findings.length === 1 ? `Finding: ${findings[0]!.title}.` : `${findings.length} demonstration findings.`, body, evidence, actions,
    limitations: [...limitations, scope.performance.limitations[0]!, baselineNote(scope), freshnessNote(scope)] })
}

function baselineCompare(scope: ScopedRecords, parsed: ParsedQuestion): AssistantReply {
  const focus = parsed.focus.filter(s => scope.performance.comparisons.some(c => c.signal === s))
  const pool = scope.performance.comparisons.filter(c => focus.length ? focus.includes(c.signal) : !!c.latestEntry)
  const described = pool.map(c => ({ c, d: describeComparison(scope, c) }))
  const ready = described.filter(x => x.d.ready), other = described.filter(x => !x.d.ready)
  const selfReport = pool.some(c => SELF_REPORT.includes(c.signal)) ? ['Fatigue, stress and mood are descriptive 0–10 self-ratings, not validated questionnaires or psychological assessments.'] : []
  if (!described.length || (!focus.length && !scope.performance.comparisons.some(c => c.latestEntry))) return reply(scope, { intent: 'baseline_compare', status: 'insufficient', headline: 'There are no records to compare with a baseline.',
    body: [intro(scope), 'No baseline comparison is possible without records. I will not invent a trend.'], actions: [act('Open My Health', 'health'), act('Open Daily Assessments', 'assessments')], limitations: [baselineNote(scope)] })
  const body = [intro(scope), ready.length ? `${ready.length} indicator${ready.length === 1 ? ' has' : 's have'} a qualified personal baseline comparison:` : 'No indicator in this request has a qualified personal baseline comparison yet. I will not invent a trend.', ...ready.map(x => x.d.sentence)]
  if (other.length) body.push(ready.length ? 'Withheld or unavailable comparisons, with the exact reason:' : 'Available records and why a comparison is withheld:', ...other.map(x => x.d.sentence))
  return reply(scope, { intent: 'baseline_compare', status: ready.length ? 'answered' : 'insufficient', headline: ready.length ? `${ready.length} qualified baseline comparison${ready.length === 1 ? '' : 's'} available.` : 'No qualified baseline comparison is available yet.', body,
    evidence: [...ready, ...other].flatMap(x => x.d.evidence), actions: [act('Open Human Performance Assessment', 'performance')],
    limitations: [...selfReport, baselineNote(scope), freshnessNote(scope), ...new Set(described.flatMap(x => x.d.warnings))] })
}

function single(scope: ScopedRecords, intent: AssistantReply['intent'], signals: PerformanceSignal[], extraBody: string[], actions: AssistantAction[], notes: string[]): AssistantReply {
  const described = signals.map(s => comparison(scope, s)).filter((c): c is BaselineComparison => !!c).map(c => describeComparison(scope, c))
  const anyCurrent = described.some(d => d.hasCurrent)
  const headline = anyCurrent ? described.find(d => d.hasCurrent)!.sentence.split(' at ')[0]! + '.' : `No current ${signals.map(signalLabel).join(' / ').toLowerCase()} value is available.`
  return reply(scope, { intent, status: anyCurrent ? 'answered' : 'insufficient', headline, body: [intro(scope), ...described.map(d => d.sentence), ...extraBody], evidence: described.flatMap(d => d.evidence), actions,
    limitations: [...notes, ...new Set(described.flatMap(d => d.warnings)), freshnessNote(scope)] })
}

function latestAssessment<K extends AssessmentResult['kind']>(scope: ScopedRecords, kind: K) {
  return scope.assessments.filter((a): a is Extract<AssessmentResult, { kind: K }> => a.kind === kind && Date.parse(a.timestamp) <= Date.parse(scope.asOf)).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).at(-1)
}

function reaction(scope: ScopedRecords): AssistantReply {
  const record = latestAssessment(scope, 'reaction')
  const details = record ? [`Latest reaction session ${record.id} (${at(record.timestamp)}, ${record.result.mode} mode): ${record.result.trials.length} trial${record.result.trials.length === 1 ? '' : 's'}, mean ${withUnit(record.result.meanMs, 'ms')}, median ${withUnit(record.result.medianMs, 'ms')}, ${record.result.missed} missed, ${record.result.premature} premature.`] : []
  return single(scope, 'reaction', ['reaction_mean'], details, [act('Open Daily Assessments', 'assessments'), act('Open Human Performance Assessment', 'performance')], ['Reaction timing is a measured value; it does not diagnose fatigue or any condition. AEGIS timing and scoring are independent design choices.'])
}
function typing(scope: ScopedRecords): AssistantReply {
  const record = latestAssessment(scope, 'typing')
  const details = record ? [`Latest typing session ${record.id} (${at(record.timestamp)}): ${withUnit(record.result.wpm, 'WPM')}, accuracy ${withUnit(record.result.accuracy, '%')}, ${record.result.errors} errors, ${record.result.corrections} corrections over ${withUnit(record.result.durationMs / 1000, 's')}.`] : ['No typing session is recorded. The typing assessment is available in Daily Assessments (observed workspace).']
  return single(scope, 'typing', ['typing_wpm'], details, [act('Open Daily Assessments', 'assessments')], ['Typing metrics are measured values only. No psychological, cognitive or emotional inference is made.'])
}
function sleep(scope: ScopedRecords): AssistantReply {
  return single(scope, 'sleep', ['sleep_duration'], scope.origin === 'synthetic' ? ['Synthetic sleep histories are compressed test fixtures (one record per virtual minute), not a model of human sleep.'] : [], [act('Open My Health', 'health'), act('Open Human Performance Assessment', 'performance')], ['Sleep duration is shown as recorded; AEGIS does not assess sleep disorders.'])
}
function physiology(scope: ScopedRecords, parsed: ParsedQuestion): AssistantReply {
  const focus = parsed.focus.filter(s => PHYSIOLOGY.includes(s))
  return single(scope, 'physiology', focus.length ? focus : PHYSIOLOGY, [], [act('Open My Health', 'health'), act('Open Sensor Integration', 'sensors')], ['No physical medical device is connected. Synthetic values are engineering fixtures, not physiological simulations. Values are not compared with clinical normal ranges.'])
}
function visual(scope: ScopedRecords): AssistantReply {
  const record = latestAssessment(scope, 'visual')
  const notes = ['Experimental eyelid-geometry measurements. Blink rate or eye closure alone does not diagnose fatigue, stress, emotion or any condition.', 'The assistant never starts the camera. Visual Assessment is optional and opt-in.']
  const actions = [...(scope.origin === 'observed' ? [act('Open Visual Assessment (opt-in camera)', 'visual' as const)] : []), act('Open Human Performance Assessment', 'performance')]
  if (!record) return reply(scope, { intent: 'visual', status: 'insufficient', headline: 'No visual (eye) assessment is recorded.', body: [intro(scope), 'There is no eye/visual assessment record in this workspace, so there is nothing to report. Other AEGIS features work without the camera.', scope.origin === 'observed' ? 'You can run the optional Visual Assessment; it processes video on this device and does not store video.' : 'Live camera sessions are only available in the observed workspace.'], actions, limitations: notes })
  const r = record.result
  const simulated = record.source === 'simulator'
  const base = single(scope, 'visual', ['visual_blink_rate', 'visual_closure_proportion'], [
    `Latest visual session ${record.id} (${at(record.timestamp)}, ${simulated ? 'synthetic simulator fixture — not a live camera session' : `${record.source}, local camera`}): ${r.sufficient ? 'sufficient' : 'insufficient'} tracking, coverage ${formatNumber(r.trackingCoverage * 100)}%, ${withUnit(r.validObservationMs / 1000, 's')} usable of ${withUnit(r.durationMs / 1000, 's')}, blink count ${formatNumber(r.blinkCount) ?? 'unavailable'}, ${r.invalidIntervals.length} invalid tracking interval${r.invalidIntervals.length === 1 ? '' : 's'}, algorithm ${r.algorithm}, quality ${record.quality}.`,
  ], actions, notes)
  return { ...base, evidence: [{ id: record.id, kind: 'assessment', label: 'Visual assessment session (experimental)', value: r.sufficient ? 'sufficient tracking' : 'insufficient tracking', timestamp: record.timestamp, origin: record.origin, source: record.source, quality: record.quality, acquisition: acquisitionText(record.acquisition), availability: 'record', ...(record.demonstrationOnly ? { demonstrationOnly: true } : {}) }, ...base.evidence] }
}

function environment(scope: ScopedRecords, parsed: ParsedQuestion): AssistantReply {
  const focus = parsed.focus.filter((s): s is EnvironmentalMeasurement['metric'] => (ENVIRONMENT as string[]).includes(s))
  const metrics = focus.length ? focus : ENVIRONMENT
  const where = scope.origin === 'synthetic' ? `your scenario compartment, ${compartmentLabel(scope, scope.subject.currentCompartmentId)} (a fictional position, not a measured personal exposure)` : 'environmental records explicitly associated with you'
  const described = metrics.map(metric => {
    const series = scope.environment.filter(r => r.metric === metric).map(r => ({ ...r, astronautId: scope.subject.id, signal: metric }) as PerformanceObservation)
    return describeComparison(scope, compareBaseline(series, metric, scope.asOf), signalLabel(metric))
  })
  const body = [intro(scope), `Environmental context from ${where}:`, ...described.map(d => d.sentence)]
  const evidence: EvidenceItem[] = described.flatMap(d => d.evidence).map(e => ({ ...e, kind: 'environment' }))
  const associations = scope.alerts.filter(a => a.ruleId === 'DEMO-ENV-01' || a.ruleId === 'DEMO-MULTI-ENV-01' || a.evidence.some(e => scope.environmentAll.some(r => r.id === e.observationId)))
  for (const a of associations) {
    body.push(`Recorded association: alert “${a.title}” (${a.id}, ${a.status === 'acknowledged' ? 'acknowledged' : 'not yet acknowledged'}) links environmental and your own observations by time and location. This is an association, not proof that the environment caused a symptom or illness, and not a personal exposure estimate.`)
    evidence.push(alertEvidence(a))
    for (const e of a.evidence) { const item = citedEvidence(scope, e.observationId, e.explanation); if (item) evidence.push(item) }
  }
  for (const f of scope.performance.findings.filter(f => f.ruleId === 'DEMO-MULTI-ENV-01')) body.push(`Human Performance Assessment finding “${f.title}” (${f.ruleId}, demonstration only): ${f.explanation}`)
  const anyCurrent = described.some(d => d.hasCurrent)
  return reply(scope, { intent: 'environment', status: anyCurrent ? 'answered' : 'insufficient', headline: anyCurrent ? `${described.filter(d => d.hasCurrent).length} current environmental reading${described.filter(d => d.hasCurrent).length === 1 ? '' : 's'} in your context.` : 'No current environmental reading is available in your context.', body, evidence,
    actions: [act('Open Human Performance Assessment', 'performance'), ...(associations.length ? [act('Open Events & Alerts', 'events' as const)] : [])],
    limitations: ['Radiation observations are scenario/sensor telemetry; no dose-to-health prediction is made.', 'No causal link between environment and health is established by AEGIS.', freshnessNote(scope), ...new Set(described.flatMap(d => d.warnings))] })
}

function alerts(scope: ScopedRecords): AssistantReply {
  const list = scope.alerts.slice().sort((a, b) => (a.status === b.status ? 0 : a.status === 'new' ? -1 : 1) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
  if (!list.length) return reply(scope, { intent: 'alerts', status: 'insufficient', headline: 'No alerts are recorded for you in this workspace.', body: [intro(scope), 'No demonstration rule has created an alert for your records. Having no alert does not establish good health; missing measurements are not evaluated.'], actions: [act('Open Events & Alerts', 'events'), act('Open Human Performance Assessment', 'performance')] })
  const body = [intro(scope), `${list.length} alert${list.length === 1 ? '' : 's'} recorded (${list.filter(a => a.status === 'new').length} not yet acknowledged). All AEGIS alert rules are labelled demonstration rules, not clinical thresholds.`]
  const evidence: EvidenceItem[] = []
  for (const a of list.slice(0, 3)) {
    const encounter = scope.encounters.find(e => e.alertId === a.id)
    body.push(`“${a.title}” — ${a.level} level, ${a.status === 'acknowledged' ? 'acknowledged' : 'not yet acknowledged'}, created ${at(a.createdAt)}, rule ${a.ruleId}${a.demonstrationOnly ? ' (demonstration only)' : ''}.`, `Why it was created (recorded explanation): ${a.explanation}`, `Recorded next check: ${a.safeNextStep}`)
    if (encounter) body.push(`Linked case ${encounter.id}: ${encounter.status.replace('_', ' ')}. Ask “What is the status of my follow-up?” for details.`)
    evidence.push(alertEvidence(a))
    for (const e of a.evidence) { const item = citedEvidence(scope, e.observationId, e.explanation); if (item) evidence.push(item) }
    if (encounter) evidence.push(caseEvidence(encounter))
  }
  if (list.length > 3) body.push(`${list.length - 3} further alert(s) are listed in Events & Alerts.`)
  return reply(scope, { intent: 'alerts', status: 'answered', headline: `Alert: ${list[0]!.title} (${list[0]!.status === 'acknowledged' ? 'acknowledged' : 'not yet acknowledged'}).`, body, evidence,
    actions: [act(`Open Events & Alerts — ${list[0]!.title}`, 'events'), act('Open Human Performance Assessment', 'performance')],
    limitations: ['Detection history may include an earlier condition that is no longer present.', 'The assistant cannot acknowledge alerts; use the Acknowledge control in Events & Alerts.'] })
}

function caseStatus(scope: ScopedRecords): AssistantReply {
  const cases = scope.encounters.slice().sort((a, b) => (a.status === 'resolved' ? 1 : 0) - (b.status === 'resolved' ? 1 : 0) || Date.parse(b.timestamp) - Date.parse(a.timestamp))
  if (!cases.length) return reply(scope, { intent: 'case_status', status: 'insufficient', headline: 'No medical case or follow-up is recorded for you in this workspace.', body: [intro(scope), 'Cases are created by AEGIS only when an alert is detected. There is no case status to report.'], actions: [act('Open Events & Alerts', 'events')] })
  const body = [intro(scope), 'AEGIS keeps four steps separate: alert acknowledged, review begun, follow-up recorded, and case resolved. Only recorded states are reported.']
  const evidence: EvidenceItem[] = []
  let headline = ''
  for (const e of cases.slice(0, 3)) {
    const alert = scope.alerts.find(a => a.id === e.alertId)
    const followUps = e.actions.filter(a => a.kind === 'follow_up'), done = followUps.filter(a => a.completed)
    const latest = followUps.slice().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).at(-1)
    body.push(`Case ${e.id} — “${e.title}” (opened ${at(e.timestamp)}):`,
      `• Alert acknowledged: ${alert ? (alert.status === 'acknowledged' ? 'yes' : 'no') : 'alert record not found'}.`,
      `• Review begun: ${e.status === 'open' ? 'no (case is open)' : 'yes'}.`,
      `• Follow-up recorded: ${followUps.length ? `${followUps.length} entr${followUps.length === 1 ? 'y' : 'ies'}, ${done.length} marked completed by the user, ${followUps.length - done.length} pending; latest at ${at(latest!.timestamp)}` : 'none'}.`,
      `• Case resolved: ${e.status === 'resolved' ? `yes, by explicit medical-officer action at ${e.resolvedAt ? at(e.resolvedAt) : 'an unrecorded time'}. Resolution is not a diagnosis or proof of recovery` : 'no. Resolution requires an explicit Crew Medical Officer review action; a recorded follow-up does not resolve the case'}.`)
    if (!headline) headline = e.status === 'resolved' ? `Case resolved (${e.title}).` : done.length ? `A follow-up marked completed is recorded; the case is ${e.status === 'open' ? 'open (review not begun)' : 'under review'} and not resolved.` : followUps.length ? `A follow-up is recorded but not marked completed; the case is ${e.status.replace('_', ' ')}.` : `No follow-up recorded yet; the case is ${e.status === 'open' ? 'open' : 'under review'}.`
    evidence.push(caseEvidence(e))
    if (alert) evidence.push(alertEvidence(alert))
    for (const a of followUps) evidence.push({ id: a.id, kind: 'follow_up', label: 'Follow-up entry', value: a.completed ? 'marked completed' : 'pending', timestamp: a.timestamp, origin: a.origin, source: a.source, quality: a.quality, availability: 'record', userNote: Array.from(a.note).slice(0, 200).join(''), ...(a.observationIds.length ? { detail: `Linked observations: ${a.observationIds.join(', ')}` } : {}) })
  }
  if (cases.length > 3) body.push(`${cases.length - 3} further case(s) are listed in Events & Alerts.`)
  return reply(scope, { intent: 'case_status', status: 'answered', headline, body, evidence, actions: [act('Open Events & Alerts (case review and follow-up)', 'events')],
    limitations: ['The assistant cannot change case status. Begin review, record follow-up and resolution are explicit actions in Events & Alerts; resolution requires the Crew Medical Officer demo context.', '"Marked completed" means the user ticked the follow-up checkbox; it is not a clinical verification.'] })
}

function availableTests(scope: ScopedRecords): AssistantReply {
  const observed = scope.origin === 'observed'
  const body = [intro(scope), observed ? 'In your observed workspace you can perform these existing AEGIS assessments. Results are stored locally and only in your observed records:' : 'This is the synthetic mission preview. Assessment results here are read-only scenario records; live assessments are performed only in the observed workspace (switch Data workspace → Observed records):',
    '• Daily Assessments: typing test, reaction-time test and a fictional numeric procedure check.',
    '• Visual Assessment (optional, opt-in camera, eyelid geometry; experimental): observed workspace only.',
    '• Physical Performance (optional, opt-in camera, right-elbow flexion repetitions; experimental): observed workspace only.',
    '• My Health: manual self-report or measurement entry with declared device/protocol/conditions.',
    observed ? '• Sensor Integration: manual entry of an existing examination report or named laboratory value.' : '• Sensor Integration: labelled synthetic demo packets (no hardware is connected).',
    'Preventive Health Management and Mission Medical Resources are not available in this build.']
  return reply(scope, { intent: 'available_tests', status: 'answered', headline: observed ? 'Assessments you can perform now.' : 'Assessments (live sessions require the observed workspace).', body,
    actions: [act('Open Daily Assessments', 'assessments'), ...(observed ? [act('Open Visual Assessment (opt-in camera)', 'visual' as const), act('Open Physical Performance (opt-in camera)', 'physical' as const)] : []), act('Open My Health', 'health'), act('Open Sensor Integration', 'sensors')],
    limitations: ['The assistant does not start any assessment or the camera; you start them yourself.', 'Assessment results are measured values, not diagnoses.'] })
}

function unsupportedMedical(scope: ScopedRecords, parsed: ParsedQuestion): AssistantReply {
  const openCases = scope.encounters.filter(e => e.status !== 'resolved').length
  const body = [
    ...(parsed.flags.urgent ? ['If this may be urgent, do not wait for this software: contact your crew medical officer or mission medical support now and follow your mission’s established procedures. AEGIS cannot assess urgent situations.'] : []),
    'AEGIS Guided Assistant is an offline, rules-based research prototype. It cannot provide a diagnosis, medication, dose, treatment plan or medical procedure, and it cannot rule a condition in or out.',
    'Facial or eye measurements, blink rate, heart-rate variability and self-ratings in AEGIS do not diagnose depression, anxiety, stress, burnout or sleep disorders.',
    'What I can do: show your recorded observations, personal baselines and demonstration findings with their provenance.',
    `For a medical concern, use the human-reviewed workflow: Events & Alerts lists your recorded alerts and cases${openCases ? ` (${openCases} not resolved)` : ''}, and your crew medical officer or mission medical support can review them.`]
  return reply(scope, { intent: 'unsupported_medical', status: 'refused', headline: 'I can’t diagnose, prescribe or recommend treatment.', body, actions: [act('Open Events & Alerts (human review)', 'events'), act('Open My Health', 'health')], limitations: ['No diagnosis, prescription or treatment engine exists in AEGIS.'] })
}

export function buildReply(parsed: ParsedQuestion, scope: AssistantScope): AssistantReply {
  if (!scope.ok) return reply(null, { intent: parsed.intent, status: 'refused', headline: 'The assistant cannot read records in this context.', body: [scope.reason], limitations: ['Demo role switching is not authentication or authorization.'] })
  const r = (() => {
    switch (parsed.intent) {
      case 'overview': return overview(scope)
      case 'performance_findings': return performanceFindings(scope)
      case 'baseline_compare': return baselineCompare(scope, parsed)
      case 'sleep': return sleep(scope)
      case 'reaction': return reaction(scope)
      case 'typing': return typing(scope)
      case 'visual': return visual(scope)
      case 'physiology': return physiology(scope, parsed)
      case 'environment': return environment(scope, parsed)
      case 'alerts': return alerts(scope)
      case 'case_status': return caseStatus(scope)
      case 'available_tests': return availableTests(scope)
      case 'unsupported_medical': return unsupportedMedical(scope, parsed)
      case 'other_subject': return reply(scope, { intent: 'other_subject', status: 'refused', headline: 'I can only read your own records.', body: ['In Astronaut Mode the assistant reads only the signed-in astronaut’s records in the selected workspace. I cannot show, compare or confirm anything about another crew member.', 'Demo role switching in AEGIS is not authentication or authorization; it is a UI isolation boundary only.'], actions: [act('Open My Health', 'health')] })
      case 'action_request': return reply(scope, { intent: 'action_request', status: 'refused', headline: 'The assistant is read-only and did not change anything.', body: ['I cannot acknowledge alerts, begin reviews, record follow-ups, resolve cases, start the camera or an assessment, or change any record. No action was taken.', 'Use the existing controls in Events & Alerts or the relevant section; each action there is explicit and user-controlled.'], actions: [act('Open Events & Alerts', 'events')] })
      case 'module_unavailable': return reply(scope, { intent: 'module_unavailable', status: 'unsupported', headline: `${parsed.flags.module === 'resources' ? 'Mission Medical Resources' : 'Preventive Health Management'} is not available in this build.`, body: [`The ${parsed.flags.module === 'resources' ? 'Mission Medical Resources module (inventory, supplies)' : 'Preventive Health Management module'} is not implemented in this AEGIS build, so I have no records to report and will not estimate any.`], actions: [act('Open My Health', 'health')] })
      case 'help': return reply(scope, { intent: 'help', status: 'answered', headline: 'What you can ask.', body: [intro(scope), ...HELP_TOPICS] })
      case 'unknown': return reply(scope, { intent: 'unknown', status: 'unsupported', headline: 'I don’t have a supported answer for that question.', body: ['This prototype only answers a fixed set of questions about your own accessible records. It is not a general chatbot.', ...HELP_TOPICS] })
    }
  })()
  if (parsed.contextual) r.body.unshift('Continuing from your previous question.')
  return r
}
const HELP_TOPICS = ['Supported topics: overview of your records · performance findings · baseline comparisons · sleep · reaction time · typing · visual (eye) assessment · pulse, SpO₂, blood pressure, temperature, HRV · cabin environment · alerts · case/follow-up status · available assessments.']
