/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Canonical schemas and camera/sensor result validation.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { z } from 'zod'
import type { HealthMeasurement, HydrationRecord, MedicalResource, PreventionPlanItem } from '../../contracts/types'

const id = z.string().min(1).max(200)
const timestamp = z.iso.datetime({ offset: true })
const finite = z.number().finite()
const positive = finite.nonnegative()
export const originSchema = z.enum(['synthetic', 'observed', 'research_dataset'])
const quality = z.enum(['valid', 'estimated', 'missing', 'invalid'])
const source = z.enum(['simulator', 'manual', 'wearable', 'medical_device', 'environment_sensor', 'camera_pose', 'camera_face', 'dataset_import', 'assessment'])
const metric = z.enum(['heart_rate', 'body_temperature', 'oxygen_saturation', 'heart_rate_variability', 'laboratory', 'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'sleep_duration', 'reported_stress', 'reported_fatigue', 'reported_mood', 'exercise_duration', 'exercise_repetitions', 'cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose', 'bone_mineral_density', 'movement_range', 'visual_fatigue', 'symptom_severity', 'other'])
export const acquisitionSchema = z.object({ deviceId: id, protocolId: id, condition: id, sessionId: id })
export const measurementSchema = z.object({
  generatedTelemetry: z.literal(true).optional(),
  id, astronautId: id, metric, value: finite.nullable(), unit: z.string().min(1), timestamp,
  source, origin: originSchema, quality, compartmentId: id.optional(), sourceRefId: id.optional(),
  demonstrationOnly: z.boolean().optional(), note: z.string().max(2000).optional(),
  acquisition: acquisitionSchema.optional(), analyte: id.optional(),
}).superRefine((record, ctx) => {
  if ((record.quality === 'missing') !== (record.value === null)) ctx.addIssue({ code: 'custom', message: 'Missing readings require null; available readings require a number.' })
  if (record.source === 'simulator' && record.origin !== 'synthetic') ctx.addIssue({ code: 'custom', message: 'Simulator data must be synthetic.' })
  if (record.metric === 'laboratory' && !record.analyte) ctx.addIssue({ code: 'custom', message: 'Laboratory records require an analyte and explicit unit.' })
  const rule = measurementRules[record.metric]
  if (rule && (record.unit !== rule.unit || (record.value !== null && (record.value < rule.min || record.value > rule.max)))) ctx.addIssue({ code: 'custom', message: `Use ${rule.unit}; accepted entry range ${rule.min}–${rule.max}. This is input validation, not a health range.` })
})

export const measurementRules: Partial<Record<HealthMeasurement['metric'], { label: string; unit: string; min: number; max: number }>> = {
  heart_rate: { label: 'Heart rate', unit: 'bpm', min: 0, max: 400 },
  body_temperature: { label: 'Body temperature', unit: '°C', min: -100, max: 150 },
  oxygen_saturation: { label: 'Oxygen saturation', unit: '%', min: 0, max: 100 },
  heart_rate_variability: { label: 'HRV · protocol identifies statistic', unit: 'ms', min: 0, max: 1000000 },
  resting_heart_rate: { label: 'Resting heart rate', unit: 'bpm', min: 0, max: 400 },
  blood_pressure_systolic: { label: 'Blood pressure · systolic', unit: 'mmHg', min: 0, max: 400 },
  blood_pressure_diastolic: { label: 'Blood pressure · diastolic', unit: 'mmHg', min: 0, max: 400 },
  sleep_duration: { label: 'Sleep duration', unit: 'h', min: 0, max: 24 },
  reported_fatigue: { label: 'Fatigue · 0 none, 10 maximum', unit: '0–10', min: 0, max: 10 },
  reported_mood: { label: 'Mood · 0 very low, 10 very good', unit: '0–10', min: 0, max: 10 },
  reported_stress: { label: 'Stress · 0 none, 10 maximum', unit: '0–10', min: 0, max: 10 },
  symptom_severity: { label: 'Symptom severity · describe below', unit: '0–10', min: 0, max: 10 },
  exercise_duration: { label: 'Exercise duration', unit: 'min', min: 0, max: 1440 },
  bone_mineral_density: { label: 'Bone mineral density · examination', unit: 'g/cm²', min: 0, max: 10 },
  cabin_co2: { label: 'Cabin CO₂', unit: 'ppm', min: 0, max: 1000000 },
  cabin_temperature: { label: 'Temperature', unit: '°C', min: -100, max: 150 },
  cabin_pressure: { label: 'Pressure', unit: 'kPa', min: 0, max: 1000 },
  radiation_dose: { label: 'Radiation dose', unit: 'mSv', min: 0, max: 1000000 },
}

const metadata = {
  generatedTelemetry: z.literal(true).optional(),
  id, astronautId: id, timestamp, source, origin: originSchema, quality,
  unit: z.string().min(1), sourceRefIds: z.array(id), demonstrationOnly: z.boolean(),
  acquisition: acquisitionSchema.optional(),
}
const typing = z.object({ durationMs: positive, typedCharacters: positive.int(), correctCharacters: positive.int(), errors: positive.int(), corrections: positive.int(), interKeyMs: z.array(positive), wpm: positive, accuracy: finite.min(0).max(100) })
const trial = z.object({ waitMs: positive, responseMs: positive.nullable(), outcome: z.enum(['response', 'missed', 'premature']) }).refine(t => (t.outcome === 'response') === (t.responseMs !== null), 'Response time only exists for a valid response')
const invalidInterval = z.object({ startMs: positive, endMs: positive, reason: z.enum(['no_face', 'multiple_faces', 'head_pose', 'unstable', 'out_of_frame', 'low_visibility', 'no_pose', 'multiple_poses', 'camera_interrupted', 'sampling_gap', 'calibrating']) }).refine(i => i.endMs >= i.startMs, 'Invalid tracking interval')
const proportion = finite.min(0).max(1)
const association = z.object({ kind: z.literal('fictional_demo_profile'), confirmedAt: timestamp })
const visualMetrics = z.object({ durationMs: positive, validObservationMs: positive, calibrationMs: positive, trackingCoverage: proportion,
  blinkCount: positive.int().nullable(), blinkRatePerMinute: positive.nullable(), blinkDurationsMs: z.array(positive), meanBlinkDurationMs: positive.nullable(), eyeClosureMs: positive.nullable(), prolongedClosureMs: positive.nullable(), closureProportion: proportion.nullable(), perclosInspiredProportion: proportion.nullable(), calibratedOpenEar: positive.nullable(), invalidIntervals: z.array(invalidInterval), sufficient: z.boolean(), algorithm: z.literal('ear-hysteresis-v1'),
}).superRefine((r, ctx) => {
  if (r.validObservationMs > r.durationMs || r.calibrationMs > r.durationMs || (r.eyeClosureMs !== null && r.eyeClosureMs > r.validObservationMs)) ctx.addIssue({ code: 'custom', message: 'Visual durations are inconsistent' })
  if (!r.sufficient && [r.blinkCount, r.blinkRatePerMinute, r.meanBlinkDurationMs, r.eyeClosureMs, r.prolongedClosureMs, r.closureProportion, r.perclosInspiredProportion].some(v => v !== null)) ctx.addIssue({ code: 'custom', message: 'Unavailable visual summary must use null' })
  if (r.sufficient && (r.validObservationMs < 10000 || r.trackingCoverage < .7 || !r.calibratedOpenEar || r.blinkCount === null || r.eyeClosureMs === null || r.blinkRatePerMinute === null || r.prolongedClosureMs === null || r.closureProportion === null || r.perclosInspiredProportion === null)) ctx.addIssue({ code: 'custom', message: 'Insufficient visual observation for an available summary' })
  if ((r.prolongedClosureMs ?? 0) > (r.eyeClosureMs ?? 0) || r.invalidIntervals.some(i => i.endMs > r.durationMs)) ctx.addIssue({ code: 'custom', message: 'Visual interval exceeds observed duration' })
})
const physicalMetrics = z.object({ exercise: z.literal('right_elbow_flexion'), durationMs: positive, validObservationMs: positive, trackingCoverage: proportion, repetitions: positive.int().nullable(), angleHistory: z.array(z.object({ atMs: positive, angleDeg: finite.min(0).max(180).nullable() })).max(2500), rangeDeg: finite.min(0).max(180).nullable(), invalidIntervals: z.array(invalidInterval), sufficient: z.boolean(), algorithm: z.literal('elbow-cycle-v1') }).superRefine((r, ctx) => {
  if (r.validObservationMs > r.durationMs || (!r.sufficient && (r.repetitions !== null || r.rangeDeg !== null))) ctx.addIssue({ code: 'custom', message: 'Physical quality/summary mismatch' })
  if ((r.sufficient && (r.validObservationMs < 3000 || r.trackingCoverage < .7 || r.repetitions === null || r.rangeDeg === null)) || r.angleHistory.some(p => p.atMs > r.durationMs) || r.invalidIntervals.some(i => i.endMs > r.durationMs)) ctx.addIssue({ code: 'custom', message: 'Physical intervals or availability are inconsistent' })
})
export const assessmentSchema = z.discriminatedUnion('kind', [
  z.object({ ...metadata, kind: z.literal('typing'), result: typing }),
  z.object({ ...metadata, kind: z.literal('reaction'), result: z.object({ durationMs: positive, mode: z.enum(['demo', 'extended']), trials: z.array(trial), meanMs: positive.nullable(), medianMs: positive.nullable(), missed: positive.int(), premature: positive.int() }) }),
  z.object({ ...metadata, kind: z.literal('procedure'), result: z.object({ attempts: z.array(z.object({ field: id, unit: z.string().min(1), expected: finite, entered: finite, matched: z.boolean(), elapsedMs: positive })), completed: z.boolean() }) }),
  z.object({ ...metadata, kind: z.literal('visual'), source: z.enum(['camera_face', 'simulator']), origin: z.enum(['observed', 'synthetic']), experimental: z.literal(true), demonstrationOnly: z.literal(true), association, result: visualMetrics }),
  z.object({ ...metadata, kind: z.literal('physical'), source: z.literal('camera_pose'), origin: z.literal('observed'), experimental: z.literal(true), demonstrationOnly: z.literal(true), association, result: physicalMetrics }),
]).superRefine((r, ctx) => {
  if ((r.kind === 'visual' || r.kind === 'physical') && r.quality !== (r.result.sufficient ? 'estimated' : 'missing')) ctx.addIssue({ code: 'custom', message: 'Camera quality must match available observations' })
  if (r.kind === 'visual' && ((r.origin === 'synthetic') !== (r.source === 'simulator'))) ctx.addIssue({ code: 'custom', message: 'Visual source/origin mismatch' })
})
export const actionSchema = z.object({ ...metadata, kind: z.enum(['review', 'follow_up']), note: z.string().min(1).max(2000), observationIds: z.array(id), completed: z.boolean() })
export const encounterSchema = z.object({ ...metadata, alertId: id, title: z.string(), status: z.enum(['open', 'under_review', 'resolved']), actions: z.array(actionSchema), resolvedAt: timestamp.optional() })
const alertUpdateSchema = z.object({ at: timestamp, title: z.string(), explanation: z.string(), evidence: z.array(z.object({ observationId: id, explanation: z.string() })), safeNextStep: z.string(), ruleId: id })
export const alertSchema = z.object({ updates: z.array(alertUpdateSchema).optional(), id, astronautId: id.optional(), compartmentId: id.optional(), createdAt: timestamp, level: z.enum(['information', 'attention', 'review']), title: z.string(), explanation: z.string(), evidence: z.array(z.object({ observationId: id, explanation: z.string() })), safeNextStep: z.string(), status: z.enum(['new', 'acknowledged']), ruleId: id, demonstrationOnly: z.boolean(), sourceRefIds: z.array(id).optional() })
export const activitySchema = z.object({ generatedTelemetry: z.literal(true).optional(), id, astronautId: id, kind: z.enum(['exercise', 'sleep', 'work', 'rest', 'self_report', 'medical_check']), startedAt: timestamp, endedAt: timestamp.optional(), source, origin: originSchema, quality, acquisition: acquisitionSchema.optional(), details: z.record(z.string(), z.union([finite, z.string(), z.boolean(), z.null()])).optional() })
export const environmentSchema = z.object({ generatedTelemetry: z.literal(true).optional(), id, compartmentId: id, astronautId: id.optional(), metric: z.enum(['cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose', 'other']), value: finite.nullable(), unit: z.string().min(1), timestamp, source: z.enum(['simulator', 'environment_sensor', 'dataset_import']), origin: originSchema, quality, sourceRefId: id.optional(), demonstrationOnly: z.boolean().optional(), acquisition: acquisitionSchema.optional() }).superRefine((r, ctx) => {
  if ((r.quality === 'missing') !== (r.value === null) || (r.source === 'simulator' && r.origin !== 'synthetic')) ctx.addIssue({ code: 'custom', message: 'Environmental quality/provenance mismatch' })
  const rule = measurementRules[r.metric]
  if (rule && (rule.unit !== r.unit || (r.value !== null && (r.value < rule.min || r.value > rule.max)))) ctx.addIssue({ code: 'custom', message: 'Environmental unit/entry bounds mismatch; not a clinical range' })
})
export const examinationSchema = z.object({ ...metadata, kind: z.enum(['ecg', 'ultrasound']), summary: z.string().trim().min(1).max(2000).nullable() }).superRefine((r, ctx) => {
  if ((r.quality === 'missing') !== (r.summary === null) || (r.source === 'simulator' && r.origin !== 'synthetic')) ctx.addIssue({ code: 'custom', message: 'Examination quality/provenance mismatch' })
})
export const sensorBatchSchema = z.object({ measurements: z.array(measurementSchema), environment: z.array(environmentSchema), examinations: z.array(examinationSchema) })
export const preventionCompletionSchema = z.object({
  id, astronautId: id, completedAt: timestamp, source, origin: originSchema, quality,
  evidenceIds: z.array(id), note: z.string().max(1000).optional(), demonstrationOnly: z.boolean(),
}).superRefine((r, ctx) => {
  if (r.source === 'simulator' && r.origin !== 'synthetic') ctx.addIssue({ code: 'custom', message: 'Simulator completion must be synthetic' })
})
export const preventionHistorySchema = z.object({
  id, at: timestamp, action: z.enum(['created', 'updated', 'completed_manual', 'evidence_linked', 'evidence_withheld']),
  summary: z.string().trim().min(1).max(1000), evidenceIds: z.array(id).optional(),
})
export const preventionPlanSchema = z.object({
  id, astronautId: id, origin: originSchema,
  category: z.enum(['exercise', 'sleep_recovery', 'self_assessment', 'hydration']),
  targetKind: z.enum(['exercise_activity', 'physical_assessment', 'sleep_observation', 'fatigue_stress_check', 'reaction_assessment', 'typing_assessment', 'procedure_assessment', 'hydration_log']),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(2000),
  plannedStartAt: timestamp, plannedEndAt: timestamp,
  recurrence: z.enum(['once', 'daily', 'per_shift']),
  planSource: z.enum(['synthetic_demo', 'user_created']),
  sourceRefIds: z.array(id), demonstrationOnly: z.boolean(),
  createdAt: timestamp, updatedAt: timestamp,
  linkedObservationIds: z.array(id),
  withheldObservationIds: z.array(id).optional(),
  completions: z.array(preventionCompletionSchema),
  history: z.array(preventionHistorySchema),
  hydrationGoalMl: finite.gt(0).max(10000).nullable().optional(),
}).superRefine((r, ctx) => {
  if (Date.parse(r.plannedEndAt) < Date.parse(r.plannedStartAt)) ctx.addIssue({ code: 'custom', message: 'Planned schedule end must not precede start.' })
  if (r.origin === 'observed' && r.planSource === 'synthetic_demo') ctx.addIssue({ code: 'custom', message: 'Synthetic demo plans cannot enter observed records.' })
  if (r.origin === 'synthetic' && !r.demonstrationOnly) ctx.addIssue({ code: 'custom', message: 'Synthetic plans must declare demonstrationOnly.' })
  if (r.completions.some(c => c.astronautId !== r.astronautId || c.origin !== r.origin)) ctx.addIssue({ code: 'custom', message: 'Completion subject/origin must match plan.' })
})
export const hydrationRecordSchema = z.object({
  id, astronautId: id, timestamp,
  amount: finite.gt(0).max(10000).nullable(),
  unit: z.enum(['mL', 'L']),
  amountMl: finite.gt(0).max(10000).nullable(),
  source: z.enum(['manual', 'simulator']),
  origin: originSchema, quality,
  demonstrationOnly: z.boolean(),
  sourceRefIds: z.array(id),
  note: z.string().max(1000).optional(),
  linkedPlanId: id.optional(),
}).superRefine((r, ctx) => {
  if ((r.quality === 'missing') !== (r.amount === null || r.amountMl === null) || (r.amount === null) !== (r.amountMl === null)) {
    ctx.addIssue({ code: 'custom', message: 'Missing hydration entries require null amount and quality=missing; available entries require positive numbers.' })
  }
  if (r.source === 'simulator' && r.origin !== 'synthetic') ctx.addIssue({ code: 'custom', message: 'Simulator hydration entries must be synthetic.' })
  if (r.origin === 'synthetic' && !r.demonstrationOnly) ctx.addIssue({ code: 'custom', message: 'Synthetic hydration entries must declare demonstrationOnly.' })
  if (r.amount !== null && r.amountMl !== null) {
    const expectedMl = r.unit === 'L' ? r.amount * 1000 : r.amount
    if (Math.abs(r.amountMl - expectedMl) > 0.01) ctx.addIssue({ code: 'custom', message: 'Hydration mL normalization does not match declared amount and unit.' })
  }
})
export const resourceHistorySchema = z.object({
  id, at: timestamp,
  availability: z.enum(['available', 'unavailable', 'unknown']),
  operability: z.enum(['functional', 'out_of_service', 'unknown']),
  occupancy: z.enum(['free', 'in_use', 'reserved', 'unknown']),
  quantity: positive.int().nullable(),
  reason: z.string().trim().min(1).max(1000),
  actorRole: z.string().max(200).optional(),
})
export const resourceSchema = z.object({
  id, label: z.string().trim().min(1).max(300), quantity: positive.nullable(), unit: z.string().min(1),
  origin: originSchema, quality, timestamp, source, sourceRefIds: z.array(id),
  category: z.enum(['cardiac_monitoring', 'imaging', 'vital_signs', 'first_aid', 'laboratory_point_of_care', 'general_equipment']).optional(),
  availability: z.enum(['available', 'unavailable', 'unknown']).optional(),
  operability: z.enum(['functional', 'out_of_service', 'unknown']).optional(),
  occupancy: z.enum(['free', 'in_use', 'reserved', 'unknown']).optional(),
  compartmentId: id.optional(),
  requiredQualification: z.enum(['any_crew', 'trained_operator', 'crew_medical_officer', 'unknown']).optional(),
  qualificationNote: z.string().max(1000).optional(),
  lastVerifiedAt: timestamp.nullable().optional(),
  statusReason: z.string().max(1000).optional(),
  constraints: z.string().max(1000).optional(),
  demonstrationOnly: z.boolean().optional(),
  history: z.array(resourceHistorySchema).optional(),
}).superRefine((r, ctx) => {
  if (r.source === 'simulator' && r.origin !== 'synthetic') ctx.addIssue({ code: 'custom', message: 'Simulator resource records must be synthetic.' })
})
export const clinicalSchema = z.object({ measurements: z.array(measurementSchema), assessments: z.array(assessmentSchema), alerts: z.array(alertSchema), encounters: z.array(encounterSchema), activities: z.array(activitySchema).default([]), environment: z.array(environmentSchema).default([]), examinations: z.array(examinationSchema).default([]), preventionPlans: z.array(preventionPlanSchema).default([]), hydrationRecords: z.array(hydrationRecordSchema).default([]) })
const sourceRef = z.object({ id, title: z.string(), url: z.url().optional(), kind: z.enum(['research', 'dataset', 'synthetic_fixture', 'user_entry', 'device']), note: z.string().optional() })
export const missionSchema = z.object({
  missionTime: timestamp, paused: z.boolean(), speed: finite.min(1).max(3600), activeScenario: z.enum(['normal-day', 'sleep-disruption', 'co2-excursion', 'radiation-event']), seed: positive.int().max(4294967295),
  crew: z.array(z.object({ id, displayName: z.string(), role: z.string(), baselines: z.partialRecord(metric, finite), currentCompartmentId: id, syntheticIdentity: z.boolean() })),
  compartments: z.array(z.object({ id, label: z.string(), category: z.enum(['living', 'exercise', 'medical', 'work', 'life_support', 'shelter']) })),
  ...clinicalSchema.shape,
  environment: z.array(environmentSchema),
  activities: z.array(activitySchema),
  events: z.array(z.object({ id, at: timestamp, kind: z.enum(['crew_movement', 'routine', 'measurement', 'environment_incident', 'radiation_incident', 'health_alert', 'operator_action']), astronautId: id.optional(), compartmentId: id.optional(), summary: z.string(), scenarioId: z.enum(['normal-day', 'sleep-disruption', 'co2-excursion', 'radiation-event']).optional(), synthetic: z.boolean() })),
  sources: z.array(sourceRef),
  resources: z.array(resourceSchema),
})

export function validateMeasurement(input: unknown): HealthMeasurement {
  return measurementSchema.parse(input) as HealthMeasurement
}

export function readableValidationError(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map(i => i.message).slice(0, 2).join(" ")
  return error instanceof Error ? error.message : "Invalid input. Check the value, unit and date."
}
export function validatePreventionPlan(input: unknown): PreventionPlanItem {
  return preventionPlanSchema.parse(input) as PreventionPlanItem
}
export function validateHydrationRecord(input: unknown): HydrationRecord {
  return hydrationRecordSchema.parse(input) as HydrationRecord
}
export function validateResource(input: unknown): MedicalResource {
  return resourceSchema.parse(input) as MedicalResource
}
