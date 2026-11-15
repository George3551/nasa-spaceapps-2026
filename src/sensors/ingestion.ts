/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Canonical sensor packet validation and conflict rejection.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * Synthetic demonstration data; no connected medical hardware or validated physiology model.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { DataOrigin, SensorAdapter, SensorBatch, SensorRequest } from '../../contracts/types'
import { sensorBatchSchema } from '../shared/validation'

export function validateSensorBatch(input: unknown, origin: DataOrigin): SensorBatch {
  const batch = sensorBatchSchema.parse(input) as SensorBatch
  const records = [...batch.measurements, ...batch.environment, ...batch.examinations]
  if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('Duplicate ID inside acquisition batch.')
  for (const r of records) {
    delete r.generatedTelemetry // Explicit acquisitions are never disposable clock telemetry.
    if (r.origin !== origin || !r.acquisition) throw new Error('Acquisition context and workspace origin must match.')
    if (origin === 'synthetic' && (r.source !== 'simulator' || !r.demonstrationOnly)) throw new Error('Synthetic adapters must declare simulator/demo provenance.')
    if (origin === 'observed' && (r.source === 'simulator' || !r.astronautId)) throw new Error('Observed records require explicit subject association and non-simulator acquisition.')
  }
  return batch
}
export async function acquire(adapter: SensorAdapter, request: SensorRequest): Promise<SensorBatch> {
  const batch = validateSensorBatch(await adapter.read(request), adapter.origin)
  if ([...batch.measurements, ...batch.environment, ...batch.examinations].some(r => r.acquisition!.deviceId !== adapter.id || r.astronautId !== request.astronautId)) throw new Error('Adapter identity/subject does not match its request.')
  return batch
}
const stable = (value: unknown) => JSON.stringify(value, (_key, item: unknown) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
export function appendAcquisition<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map(r => [r.id, r]))
  for (const record of incoming) {
    const previous = byId.get(record.id)
    if (previous && stable(previous) !== stable(record)) throw new Error(`Conflicting acquisition ID ${record.id}; existing record retained.`)
    byId.set(record.id, record)
  }
  return [...byId.values()]
}
