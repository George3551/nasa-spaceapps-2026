import { z } from 'zod'
import type { HealthMeasurement } from '../../contracts/types'

const id = z.string().min(1).max(200)
const timestamp = z.iso.datetime({ offset: true })
const finite = z.number().finite()
const positive = finite.nonnegative()
export const originSchema = z.enum(['synthetic', 'observed', 'research_dataset'])
const quality = z.enum(['valid', 'estimated', 'missing', 'invalid'])
const source = z.enum(['simulator', 'manual', 'wearable', 'environment_sensor', 'camera_pose', 'dataset_import', 'assessment'])
const metric = z.enum(['heart_rate', 'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'sleep_duration', 'reported_stress', 'reported_fatigue', 'reported_mood', 'exercise_duration', 'exercise_repetitions', 'cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose', 'bone_mineral_density', 'movement_range', 'visual_fatigue', 'symptom_severity', 'other'])
export const measurementSchema = z.object({
  id, astronautId: id, metric, value: finite.nullable(), unit: z.string().min(1), timestamp,
  source, origin: originSchema, quality, compartmentId: id.optional(), sourceRefId: id.optional(),
  demonstrationOnly: z.boolean().optional(), note: z.string().max(2000).optional(),
}).superRefine((record, ctx) => {
  if ((record.quality === 'missing') !== (record.value === null)) ctx.addIssue({ code: 'custom', message: 'Missing readings require null; available readings require a number.' })
  if (record.source === 'simulator' && record.origin !== 'synthetic') ctx.addIssue({ code: 'custom', message: 'Simulator data must be synthetic.' })
  const rule = measurementRules[record.metric]
  if (rule && (record.unit !== rule.unit || (record.value !== null && (record.value < rule.min || record.value > rule.max)))) ctx.addIssue({ code: 'custom', message: `Use ${rule.unit}; accepted entry range ${rule.min}–${rule.max}. This is input validation, not a health range.` })
})

export const measurementRules: Partial<Record<HealthMeasurement['metric'], { label: string; unit: string; min: number; max: number }>> = {
  heart_rate: { label: 'Heart rate', unit: 'bpm', min: 0, max: 400 },
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
  id, astronautId: id, timestamp, source, origin: originSchema, quality,
  unit: z.string().min(1), sourceRefIds: z.array(id), demonstrationOnly: z.boolean(),
}
const typing = z.object({ durationMs: positive, typedCharacters: positive.int(), correctCharacters: positive.int(), errors: positive.int(), corrections: positive.int(), interKeyMs: z.array(positive), wpm: positive, accuracy: finite.min(0).max(100) })
const trial = z.object({ waitMs: positive, responseMs: positive.nullable(), outcome: z.enum(['response', 'missed', 'premature']) }).refine(t => (t.outcome === 'response') === (t.responseMs !== null), 'Response time only exists for a valid response')
export const assessmentSchema = z.discriminatedUnion('kind', [
  z.object({ ...metadata, kind: z.literal('typing'), result: typing }),
  z.object({ ...metadata, kind: z.literal('reaction'), result: z.object({ durationMs: positive, mode: z.enum(['demo', 'extended']), trials: z.array(trial), meanMs: positive.nullable(), medianMs: positive.nullable(), missed: positive.int(), premature: positive.int() }) }),
  z.object({ ...metadata, kind: z.literal('procedure'), result: z.object({ attempts: z.array(z.object({ field: id, unit: z.string().min(1), expected: finite, entered: finite, matched: z.boolean(), elapsedMs: positive })), completed: z.boolean() }) }),
])
export const actionSchema = z.object({ ...metadata, kind: z.enum(['review', 'follow_up']), note: z.string().min(1).max(2000), observationIds: z.array(id), completed: z.boolean() })
export const encounterSchema = z.object({ ...metadata, alertId: id, title: z.string(), status: z.enum(['open', 'under_review', 'resolved']), actions: z.array(actionSchema), resolvedAt: timestamp.optional() })
export const alertSchema = z.object({ id, astronautId: id.optional(), compartmentId: id.optional(), createdAt: timestamp, level: z.enum(['information', 'attention', 'review']), title: z.string(), explanation: z.string(), evidence: z.array(z.object({ observationId: id, explanation: z.string() })), safeNextStep: z.string(), status: z.enum(['new', 'acknowledged']), ruleId: id, demonstrationOnly: z.boolean(), sourceRefIds: z.array(id).optional() })
export const clinicalSchema = z.object({ measurements: z.array(measurementSchema), assessments: z.array(assessmentSchema), alerts: z.array(alertSchema), encounters: z.array(encounterSchema) })
const sourceRef = z.object({ id, title: z.string(), url: z.url().optional(), kind: z.enum(['research', 'dataset', 'synthetic_fixture', 'user_entry', 'device']), note: z.string().optional() })
export const missionSchema = z.object({
  missionTime: timestamp, paused: z.boolean(), speed: finite.min(1).max(3600), activeScenario: z.enum(['normal-day', 'sleep-disruption', 'co2-excursion', 'radiation-event']), seed: positive.int().max(4294967295),
  crew: z.array(z.object({ id, displayName: z.string(), role: z.string(), baselines: z.partialRecord(metric, finite), currentCompartmentId: id, syntheticIdentity: z.boolean() })),
  compartments: z.array(z.object({ id, label: z.string(), category: z.enum(['living', 'exercise', 'medical', 'work', 'life_support', 'shelter']) })),
  ...clinicalSchema.shape,
  environment: z.array(z.object({ id, compartmentId: id, metric: z.enum(['cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose', 'other']), value: finite.nullable(), unit: z.string(), timestamp, source: z.enum(['simulator', 'environment_sensor', 'dataset_import']), origin: originSchema, quality, sourceRefId: id.optional(), demonstrationOnly: z.boolean().optional() })),
  activities: z.array(z.object({ id, astronautId: id, kind: z.enum(['exercise', 'sleep', 'work', 'rest', 'self_report', 'medical_check']), startedAt: timestamp, endedAt: timestamp.optional(), source, origin: originSchema, quality, details: z.record(z.string(), z.union([finite, z.string(), z.boolean(), z.null()])).optional() })),
  events: z.array(z.object({ id, at: timestamp, kind: z.enum(['crew_movement', 'routine', 'measurement', 'environment_incident', 'radiation_incident', 'health_alert', 'operator_action']), astronautId: id.optional(), compartmentId: id.optional(), summary: z.string(), scenarioId: z.enum(['normal-day', 'sleep-disruption', 'co2-excursion', 'radiation-event']).optional(), synthetic: z.boolean() })),
  sources: z.array(sourceRef),
  resources: z.array(z.object({ id, label: z.string(), quantity: positive.nullable(), unit: z.string(), origin: originSchema, quality, timestamp, source, sourceRefIds: z.array(id) })),
})

export function validateMeasurement(input: unknown): HealthMeasurement {
  return measurementSchema.parse(input) as HealthMeasurement
}
