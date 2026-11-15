import type {
  ActivityRecord,
  AstronautId,
  DataOrigin,
  HydrationRecord,
  HydrationUnit,
  ISODateTime,
  PreventionCategory,
  PreventionCompletionRecord,
  PreventionPlanItem,
  PreventionRecurrence,
  PreventionTargetKind,
} from '../../contracts/types'
import { activitySchema, validateHydrationRecord, validatePreventionPlan } from '../shared/validation'

export const SYNTHETIC_PREVENTION_EPOCH = '2026-11-14T08:00:00.000Z'

export function createSyntheticPreventionPlans(
  crewIds: AstronautId[] = ['crew-01', 'crew-02', 'crew-03'],
  baseTime: ISODateTime = SYNTHETIC_PREVENTION_EPOCH,
): PreventionPlanItem[] {
  const createdAt = '2026-11-14T07:00:00.000Z'
  const updatedAt = Number.isFinite(Date.parse(baseTime)) ? baseTime : SYNTHETIC_PREVENTION_EPOCH
  const plans: PreventionPlanItem[] = []

  for (const astronautId of crewIds) {
    plans.push(
      validatePreventionPlan({
        id: `plan-synthetic-${astronautId}-exercise`,
        astronautId,
        origin: 'synthetic',
        category: 'exercise',
        targetKind: 'physical_assessment',
        title: 'Scheduled Upper-Body Resistance & Range Check',
        description:
          'Planned countermeasure exercise and range-of-motion check-in. Informational schedule only; elbow-flexion repetitions do not measure or predict bone mineral density.',
        plannedStartAt: '2026-11-14T08:00:00.000Z',
        plannedEndAt: '2026-11-14T08:30:00.000Z',
        recurrence: 'daily',
        planSource: 'synthetic_demo',
        sourceRefIds: ['synthetic-v2', 'hrp-risks'],
        demonstrationOnly: true,
        createdAt,
        updatedAt,
        linkedObservationIds: [],
        withheldObservationIds: [],
        completions: [],
        history: [
          {
            id: `hist-plan-${astronautId}-exercise-init`,
            at: createdAt,
            action: 'created',
            summary: 'Synthetic demonstration exercise schedule initialized.',
          },
        ],
      }),
      validatePreventionPlan({
        id: `plan-synthetic-${astronautId}-sleep`,
        astronautId,
        origin: 'synthetic',
        category: 'sleep_recovery',
        targetKind: 'sleep_observation',
        title: 'Daily Sleep Duration & Recovery Baseline Check',
        description:
          'Review recorded sleep duration and subjective recovery against qualified individual baseline without fabricating missing sleep values.',
        plannedStartAt: '2026-11-14T07:30:00.000Z',
        plannedEndAt: '2026-11-14T08:15:00.000Z',
        recurrence: 'daily',
        planSource: 'synthetic_demo',
        sourceRefIds: ['synthetic-v2', 'hrp-risks'],
        demonstrationOnly: true,
        createdAt,
        updatedAt,
        linkedObservationIds: [],
        withheldObservationIds: [],
        completions: [],
        history: [
          {
            id: `hist-plan-${astronautId}-sleep-init`,
            at: createdAt,
            action: 'created',
            summary: 'Synthetic demonstration sleep/recovery follow-up schedule initialized.',
          },
        ],
      }),
      validatePreventionPlan({
        id: `plan-synthetic-${astronautId}-reaction`,
        astronautId,
        origin: 'synthetic',
        category: 'self_assessment',
        targetKind: 'reaction_assessment',
        title: 'Post-Wake Reaction Time Check (PVT-inspired)',
        description:
          'Scheduled 30-second reaction self-assessment under comparable quiet-seated conditions. Completion requires a saved usable assessment record.',
        plannedStartAt: '2026-11-14T08:00:00.000Z',
        plannedEndAt: '2026-11-14T08:20:00.000Z',
        recurrence: 'daily',
        planSource: 'synthetic_demo',
        sourceRefIds: ['synthetic-v2', 'hrr-721'],
        demonstrationOnly: true,
        createdAt,
        updatedAt,
        linkedObservationIds: [],
        withheldObservationIds: [],
        completions: [],
        history: [
          {
            id: `hist-plan-${astronautId}-reaction-init`,
            at: createdAt,
            action: 'created',
            summary: 'Synthetic demonstration reaction self-assessment schedule initialized.',
          },
        ],
      }),
      validatePreventionPlan({
        id: `plan-synthetic-${astronautId}-typing`,
        astronautId,
        origin: 'synthetic',
        category: 'self_assessment',
        targetKind: 'typing_assessment',
        title: 'Mid-Morning Typing Performance Check-in',
        description:
          'Scheduled 30-second typing check. Opening the assessment view without completing a session never marks this item complete.',
        plannedStartAt: '2026-11-14T08:15:00.000Z',
        plannedEndAt: '2026-11-14T08:45:00.000Z',
        recurrence: 'daily',
        planSource: 'synthetic_demo',
        sourceRefIds: ['synthetic-v2'],
        demonstrationOnly: true,
        createdAt,
        updatedAt,
        linkedObservationIds: [],
        withheldObservationIds: [],
        completions: [],
        history: [
          {
            id: `hist-plan-${astronautId}-typing-init`,
            at: createdAt,
            action: 'created',
            summary: 'Synthetic demonstration typing self-assessment schedule initialized.',
          },
        ],
      }),
      validatePreventionPlan({
        id: `plan-synthetic-${astronautId}-hydration`,
        astronautId,
        origin: 'synthetic',
        category: 'hydration',
        targetKind: 'hydration_log',
        title: 'Morning Fluid Intake Log',
        description:
          'Scheduled fluid intake check-in. Reference goal is an authored demonstration figure, not a clinical prescription or NASA target.',
        plannedStartAt: '2026-11-14T08:00:00.000Z',
        plannedEndAt: '2026-11-14T09:00:00.000Z',
        recurrence: 'daily',
        planSource: 'synthetic_demo',
        sourceRefIds: ['synthetic-v2'],
        demonstrationOnly: true,
        createdAt,
        updatedAt,
        linkedObservationIds: [],
        withheldObservationIds: [],
        completions: [],
        history: [
          {
            id: `hist-plan-${astronautId}-hydration-init`,
            at: createdAt,
            action: 'created',
            summary: 'Synthetic demonstration hydration schedule initialized.',
          },
        ],
        hydrationGoalMl: 500,
      }),
    )
  }

  return plans
}

export function createSyntheticHydrationRecords(
  crewIds: AstronautId[] = ['crew-01', 'crew-02', 'crew-03'],
): HydrationRecord[] {
  return crewIds.map((astronautId, index) =>
    validateHydrationRecord({
      id: `hydration-synthetic-pre-${astronautId}`,
      astronautId,
      timestamp: '2026-11-14T07:15:00.000Z',
      amount: 250 + index * 50,
      unit: 'mL',
      amountMl: 250 + index * 50,
      source: 'simulator',
      origin: 'synthetic',
      quality: 'estimated',
      demonstrationOnly: true,
      sourceRefIds: ['synthetic-v2'],
      note: 'Synthetic earlier-morning fluid intake fixture before 08:00 UTC schedule window.',
    }),
  )
}

export function ensureSyntheticPreventionPlans(
  existing: PreventionPlanItem[] | undefined,
  crewIds: AstronautId[] = ['crew-01', 'crew-02', 'crew-03'],
  baseTime: ISODateTime = SYNTHETIC_PREVENTION_EPOCH,
): PreventionPlanItem[] {
  const defaults = createSyntheticPreventionPlans(crewIds, baseTime)
  if (!existing || existing.length === 0) return defaults
  const byId = new Map(existing.map(p => [p.id, p]))
  for (const def of defaults) {
    if (!byId.has(def.id)) byId.set(def.id, def)
  }
  return [...byId.values()]
}

export interface CreateUserPlanInput {
  id?: string;
  astronautId: AstronautId;
  origin: DataOrigin;
  category: PreventionCategory;
  targetKind: PreventionTargetKind;
  title: string;
  description: string;
  plannedStartAt: ISODateTime;
  plannedEndAt: ISODateTime;
  recurrence?: PreventionRecurrence;
  now: ISODateTime;
  hydrationGoalMl?: number | null;
}

export function buildUserPreventionPlan(input: CreateUserPlanInput): PreventionPlanItem {
  const id = input.id ?? `plan-${input.origin}-${input.astronautId}-${crypto.randomUUID()}`
  return validatePreventionPlan({
    id,
    astronautId: input.astronautId,
    origin: input.origin,
    category: input.category,
    targetKind: input.targetKind,
    title: input.title.trim(),
    description: input.description.trim(),
    plannedStartAt: input.plannedStartAt,
    plannedEndAt: input.plannedEndAt,
    recurrence: input.recurrence ?? 'once',
    planSource: 'user_created',
    sourceRefIds: ['manual-entry'],
    demonstrationOnly: input.origin === 'synthetic',
    createdAt: input.now,
    updatedAt: input.now,
    linkedObservationIds: [],
    withheldObservationIds: [],
    completions: [],
    history: [
      {
        id: `hist-${id}-created`,
        at: input.now,
        action: 'created',
        summary: `User-created ${input.category} plan item (${input.origin} workspace).`,
      },
    ],
    ...(input.hydrationGoalMl !== undefined ? { hydrationGoalMl: input.hydrationGoalMl } : {}),
  })
}

export interface CreateHydrationInput {
  id?: string;
  astronautId: AstronautId;
  timestamp: ISODateTime;
  amount: number | null;
  unit: HydrationUnit;
  origin: DataOrigin;
  source?: 'manual' | 'simulator';
  missing?: boolean;
  note?: string;
  linkedPlanId?: string;
}

export function buildHydrationRecord(input: CreateHydrationInput): HydrationRecord {
  const isMissing = Boolean(input.missing || input.amount === null)
  const amount = isMissing ? null : Number(input.amount)
  const amountMl = isMissing || amount === null ? null : input.unit === 'L' ? Number((amount * 1000).toFixed(2)) : amount
  return validateHydrationRecord({
    id: input.id ?? `hydration-${input.origin}-${crypto.randomUUID()}`,
    astronautId: input.astronautId,
    timestamp: input.timestamp,
    amount,
    unit: input.unit,
    amountMl,
    source: input.source ?? 'manual',
    origin: input.origin,
    quality: isMissing ? 'missing' : 'valid',
    demonstrationOnly: input.origin === 'synthetic',
    sourceRefIds: [input.source === 'simulator' ? 'synthetic-v2' : 'manual-entry'],
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(input.linkedPlanId ? { linkedPlanId: input.linkedPlanId } : {}),
  })
}

export interface ManualExerciseCompletionBundle {
  activity: ActivityRecord;
  completion: PreventionCompletionRecord;
}

export function buildManualExerciseCompletion(params: {
  astronautId: AstronautId;
  origin: DataOrigin;
  completedAt: ISODateTime;
  durationMinutes: number;
  exerciseLabel?: string;
  note?: string;
}): ManualExerciseCompletionBundle {
  if (!Number.isFinite(params.durationMinutes) || params.durationMinutes <= 0 || params.durationMinutes > 1440) {
    throw new Error('Enter a valid exercise duration between 1 and 1440 minutes.')
  }
  const endedMs = Date.parse(params.completedAt)
  const startedAt = new Date(endedMs - params.durationMinutes * 60000).toISOString()
  const activityId = `activity-manual-${params.origin}-${crypto.randomUUID()}`
  const activity = activitySchema.parse({
    id: activityId,
    astronautId: params.astronautId,
    kind: 'exercise',
    startedAt,
    endedAt: params.completedAt,
    source: 'manual',
    origin: params.origin,
    quality: 'valid',
    details: {
      exercise: params.exerciseLabel?.trim() || 'manual_countermeasure_exercise',
      durationMinutes: params.durationMinutes,
      manualConfirmation: true,
      cameraMeasured: false,
      ...(params.note?.trim() ? { note: params.note.trim() } : {}),
    },
  }) as ActivityRecord

  const completion: PreventionCompletionRecord = {
    id: `completion-${crypto.randomUUID()}`,
    astronautId: params.astronautId,
    completedAt: params.completedAt,
    source: 'manual',
    origin: params.origin,
    quality: 'valid',
    evidenceIds: [activity.id],
    ...(params.note?.trim() ? { note: params.note.trim() } : {}),
    demonstrationOnly: params.origin === 'synthetic',
  }

  return { activity, completion }
}
