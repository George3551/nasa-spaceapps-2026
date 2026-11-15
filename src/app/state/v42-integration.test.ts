/** AEGIS integration regression tests, team-directed and assisted by OpenAI Codex.
 * Synthetic fixtures/mocks only; no clinical or physical-hardware validation. */
import { beforeEach, expect, it } from 'vitest'
import { appReducer, createAppState } from './reducer'
import { persistState, restoreState, STORAGE_KEY } from './persistence'
import { buildHydrationRecord, buildManualExerciseCompletion } from '../../prevention/fixtures'
import { selectPreventionSchedule } from '../../prevention/selectors'
import { evaluateMedicalResource, queryEquipmentCapability } from '../../resources/selectors'
import { syntheticSample } from '../../sensors/adapters'

beforeEach(() => localStorage.clear())
const demo = () => appReducer(createAppState(), { type: 'demo/start' })
const hydration = (astronautId = 'crew-01') => buildHydrationRecord({ astronautId, origin: 'observed', amount: 250, unit: 'mL', timestamp: new Date().toISOString() })

it('keeps Guided Demo, qualified baselines, prevention schedules and equipment together', () => {
  const state = demo()
  expect(state.mission.alerts.some(a => a.evidence.length >= 4)).toBe(true)
  expect(state.mission.resources.some(r => r.id === 'ecg-12lead-01')).toBe(true)
  expect(selectPreventionSchedule(state, 'crew-01', 'synthetic', state.mission.missionTime).items.length).toBeGreaterThan(0)
})

it('rejects hydration ID overwrites across subjects, even in the medical demo context', () => {
  let state = appReducer(createAppState(), { type: 'mode/set', mode: 'medical' })
  const record = hydration()
  state = appReducer(state, { type: 'hydration/add', record })
  const rejected = appReducer(state, { type: 'hydration/add', record: { ...record, astronautId: 'crew-02', amount: 500, amountMl: 500 } })
  expect(rejected.personal).toEqual(state.personal)
  expect(rejected.notice).toMatch(/Not saved/)
})

it('keeps completion evidence immutable and rejects overwriting an existing baseline', () => {
  const state = demo(), plan = state.mission.preventionPlans![0]!, original = state.mission.measurements[0]!
  const completion = buildManualExerciseCompletion({ astronautId: plan.astronautId, origin: 'synthetic', completedAt: state.mission.missionTime, durationMinutes: 10 }).completion
  const next = appReducer(state, { type: 'prevention/complete', planId: plan.id, completion, measurement: { ...original, value: original.value! + 1 } })
  expect(next.mission).toEqual(state.mission)
  expect(next.notice).toMatch(/Not saved/)
})

it('withholds a plan link without deleting canonical alert evidence', () => {
  const state = demo(), plan = state.mission.preventionPlans![0]!, alert = state.mission.alerts[0]!
  const id = alert.evidence[0]!.observationId
  const next = appReducer(state, { type: 'prevention/evidence-withhold', planId: plan.id, evidenceId: id, removeCanonicalRecord: true, at: state.mission.missionTime })
  expect(next.mission.measurements).toEqual(state.mission.measurements)
  expect(next.mission.alerts).toEqual(state.mission.alerts)
  expect(next.mission.preventionPlans![0]!.withheldObservationIds).toContain(id)
})

it('rejects sensor packet IDs colliding with new hydration records atomically', () => {
  let state = demo()
  const record = { ...hydration(), origin: 'synthetic' as const, source: 'simulator' as const, demonstrationOnly: true }
  state = appReducer(state, { type: 'hydration/add', record })
  const batch = syntheticSample('physiological', { astronautId: 'crew-01', compartmentId: 'living', seed: 42, timestamp: state.mission.missionTime })
  batch.measurements[0]!.id = record.id
  expect(appReducer(state, { type: 'sensors/ingest', batch }).mission).toEqual(state.mission)
})

it('restores legacy v4 records with additive empty arrays and round-trips new data', () => {
  const state = demo(), legacy = structuredClone(state)
  delete legacy.personal.preventionPlans; delete legacy.personal.hydrationRecords
  delete legacy.mission.preventionPlans; delete legacy.mission.hydrationRecords
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, state: legacy }))
  const restored = restoreState(localStorage)
  expect(restored.error).toBeNull()
  expect(restored.state!.mission.measurements).toEqual(state.mission.measurements)
  expect(restored.state!.personal.preventionPlans).toEqual([])
  persistState(localStorage, state)
  expect(restoreState(localStorage).state!.mission.preventionPlans).toEqual(state.mission.preventionPlans)
})

it('never treats stale, future-verified or occupied equipment as ready', () => {
  const state = demo(), resource = state.mission.resources.find(r => r.id === 'ecg-12lead-01')!, now = state.mission.missionTime
  for (const change of [{ lastVerifiedAt: '2099-01-01T00:00:00Z' }, { lastVerifiedAt: '2020-01-01T00:00:00Z' }, { occupancy: 'in_use' as const }]) {
    expect(evaluateMedicalResource({ ...resource, ...change }, now).usableForExamination).toBe(false)
  }
  const future = { ...state, mission: { ...state.mission, resources: state.mission.resources.map(r => ({ ...r, lastVerifiedAt: '2099-01-01T00:00:00Z' })) } }
  expect(queryEquipmentCapability(future, 'ecg', 'synthetic').status).toBe('unknown')
})
