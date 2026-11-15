import type { HealthMeasurement, MetricKey } from '../../contracts/types'
import { appReducer, createAppState } from '../app/state/reducer'
import type { AppState } from '../app/state/reducer'
import type { ScenarioId } from '../../contracts/types'

/** Test-only helpers. Fixtures go through the real reducer so validation and CDSS run. */
export function scenarioAsAstronaut(scenario: ScenarioId, seed = 42, seconds = 180): AppState {
  let state = appReducer(createAppState(), { type: 'mode/set', mode: 'mission' })
  state = appReducer(state, { type: 'mission/scenario', scenario, seed })
  state = appReducer(state, { type: 'mission/advance', seconds })
  state = appReducer(state, { type: 'mode/set', mode: 'astronaut' })
  return appReducer(state, { type: 'scope/set', scope: 'synthetic' })
}

export const NOW = new Date('2026-11-15T12:00:00.000Z')
export const minutesAgo = (minutes: number, from = NOW) => new Date(from.getTime() - minutes * 60000).toISOString()

export function observed(id: string, metric: MetricKey, value: number | null, unit: string, timestamp: string, extra: Partial<HealthMeasurement> = {}): HealthMeasurement {
  return { id, astronautId: 'crew-01', metric, value, unit, timestamp, source: 'manual', origin: 'observed', quality: value === null ? 'missing' : 'valid', sourceRefId: 'manual-entry',
    acquisition: { deviceId: 'manual-entry', protocolId: `manual-${metric}-v1`, condition: 'quiet-seated', sessionId: `session-${id}` }, ...extra }
}

export function observedState(records: HealthMeasurement[]): AppState {
  const state = appReducer(createAppState(), { type: 'measurements/upsert', records })
  if (state.notice?.startsWith('Not saved')) throw new Error(state.notice)
  return state
}
