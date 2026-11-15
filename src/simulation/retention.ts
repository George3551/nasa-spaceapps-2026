/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Retention of baselines and alert evidence.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * Synthetic demonstration data; no connected medical hardware or validated physiology model.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { MissionSnapshot, PerformanceObservation } from '../../contracts/types'
import { baselineRecordIds, performanceObservations } from '../health/intelligence'

function retain<T extends { id: string; generatedTelemetry?: true }>(records: T[], limit: number, pinned: Set<string>): T[] {
  const eligible = records.filter(r => r.generatedTelemetry && !pinned.has(r.id))
  const tail = new Set(eligible.slice(-limit).map(r => r.id))
  return records.filter(r => !r.generatedTelemetry || pinned.has(r.id) || tail.has(r.id))
}
/** Only explicitly marked clock telemetry is eligible for eviction. */
export function retainMissionRecords(state: MissionSnapshot) {
  const observations = state.crew.flatMap(person => (['synthetic', 'observed', 'research_dataset'] as const).flatMap(origin => performanceObservations(state, person.id, origin)))
  const environment: PerformanceObservation[] = state.environment.map(r => ({ ...r, signal: r.metric, astronautId: `environment:${r.compartmentId}:${r.astronautId ?? 'shared'}` }))
  const pinned = baselineRecordIds([...observations, ...environment])
  for (const alert of state.alerts) {
    for (const e of [...alert.evidence, ...(alert.updates ?? []).flatMap(u => u.evidence)]) pinned.add(e.observationId)
  }
  for (const encounter of state.encounters) for (const action of encounter.actions) for (const id of action.observationIds) pinned.add(id)
  state.measurements = retain(state.measurements, 3600, pinned)
  state.environment = retain(state.environment, 4800, pinned)
  state.assessments = retain(state.assessments, 1000, pinned)
  state.activities = retain(state.activities, 400, pinned)
}
