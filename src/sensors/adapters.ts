/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Replaceable synthetic sensor adapters.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * Synthetic demonstration data; no connected medical hardware or validated physiology model.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { HealthMeasurement, SensorAdapter, SensorBatch, SensorRequest } from '../../contracts/types'

// Reproducible engineering fixtures. Values do not simulate human physiology.
export function syntheticSample(category: SensorAdapter['category'], request: SensorRequest): SensorBatch {
  const { astronautId, compartmentId, timestamp, seed } = request
  const minute = Math.floor(Date.parse(timestamp) / 60000)
  const jitter = ((Math.imul(minute, 31) ^ seed) >>> 0) % 3
  const id = `sensor-${category}-${astronautId}-${seed}-${timestamp}`
  const acquisition = { deviceId: `demo-${category}-01`, protocolId: `demo-${category}-v1`, condition: 'quiet-seated', sessionId: id }
  const metadata = { astronautId, timestamp, source: 'simulator' as const, origin: 'synthetic' as const, quality: 'estimated' as const, demonstrationOnly: true, acquisition }
  const result: SensorBatch = { measurements: [], environment: [], examinations: [] }
  const add = (metric: HealthMeasurement['metric'], value: number | null, unit: string, analyte?: string) => result.measurements.push({ ...metadata, id: `${id}-${metric}${analyte ?? ''}`, metric, value, unit, quality: value === null ? 'missing' : 'estimated', sourceRefId: 'synthetic-sensors-v4', ...(analyte ? { analyte } : {}) })
  if (category === 'physiological') {
    add('heart_rate', 65 + jitter, 'bpm'); add('blood_pressure_systolic', 118 + jitter, 'mmHg'); add('blood_pressure_diastolic', 76, 'mmHg')
    add('body_temperature', 36.7, '°C'); add('oxygen_saturation', 98, '%'); add('heart_rate_variability', 45 + jitter, 'ms')
  } else if (category === 'medical') {
    for (const kind of ['ecg', 'ultrasound'] as const) result.examinations.push({ ...metadata, id: `${id}-${kind}`, kind, unit: 'report', sourceRefIds: ['synthetic-sensors-v4'], summary: `Synthetic ${kind} examination record; no raw image/waveform or automated interpretation.` })
    add('laboratory', 5, 'mmol/L', 'glucose'); add('laboratory', null, 'g/L', 'hemoglobin')
  } else {
    for (const [metric, value, unit] of [['cabin_co2', 600 + jitter, 'ppm'], ['cabin_temperature', 22, '°C'], ['cabin_pressure', 101, 'kPa'], ['radiation_dose', .001, 'mSv']] as const) result.environment.push({ ...metadata, id: `${id}-${metric}`, compartmentId, metric, value, unit, sourceRefId: 'synthetic-sensors-v4' })
  }
  return result
}
export const syntheticAdapters: SensorAdapter[] = (['physiological', 'medical', 'environmental'] as const).map(category => ({
  id: `demo-${category}-01`, label: `Synthetic ${category} adapter`, category, cadence: category === 'medical' ? 'periodic' : 'continuous', origin: 'synthetic',
  read: async request => syntheticSample(category, request),
}))
