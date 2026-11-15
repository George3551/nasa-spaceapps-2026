/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Release audit-defect regression tests.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { describe, expect, it } from 'vitest'
import { appReducer, createAppState } from '../app/state/reducer'
import { initialState, runScenario, step } from '../simulation/engine'
import { syntheticSample } from '../sensors/adapters'
import { assessPerformance } from './intelligence'
import { evaluate, synchronizeClinical } from './engine'
import { persistState, restoreState, STORAGE_KEY } from '../app/state/persistence'
import { compareBaseline } from './intelligence'

const disrupted = () => step({ ...runScenario(initialState(42), 'sleep-disruption'), paused: false }, 180)
describe('release-blocking audit regressions', () => {
  it('A1 retains the original baseline and fixture after 3/60/120/240 virtual minutes', () => {
    let mission = disrupted()
    const original = assessPerformance(mission, 'crew-01', 'synthetic', mission.missionTime).comparisons.find(c => c.signal === 'sleep_duration')!
    for (const minute of [3, 60, 120, 240]) {
      mission = step(mission, (minute * 60000 - (Date.parse(mission.missionTime) - Date.parse('2026-11-14T08:00:00Z'))) / 1000)
      const assessment = assessPerformance(mission, 'crew-01', 'synthetic', mission.missionTime)
      expect.soft(assessment.findings.some(f => f.ruleId === 'DEMO-MULTI-PERF-01')).toBe(true)
      expect.soft(assessment.comparisons.find(c => c.signal === 'sleep_duration')!.baseline).toBe(original.baseline)
      expect.soft(mission.measurements.some(r => r.id === 'preflight-bmd-crew-01')).toBe(true)
    }
  }, 30000)
  it.each([86400000, -200 * 86400000])('A2 excludes observations shifted by %i ms from current cases', shift => {
    const mission = disrupted()
    mission.measurements = mission.measurements.map(r => ({ ...r, timestamp: new Date(Date.parse(r.timestamp) + shift).toISOString() }))
    mission.assessments = []; mission.alerts = []; mission.encounters = []
    expect(evaluate(mission, mission.missionTime)).toEqual([])
    expect(synchronizeClinical(mission, mission.missionTime).encounters).toHaveLength(0)
  })
  it('A2 does not count three copies from the same sleep session as independent observations', () => {
    const mission = disrupted()
    mission.measurements.filter(r => r.metric === 'sleep_duration').forEach(r => { r.acquisition!.sessionId = 'same-session' })
    expect(evaluate(mission, mission.missionTime)).toEqual([])
  })
  it('A3 a spot packet does not replace sleep history or suppress the scenario finding', () => {
    let state = appReducer(createAppState(), { type: 'mode/set', mode: 'mission' })
    state = appReducer(state, { type: 'mission/scenario', scenario: 'sleep-disruption', seed: 42 })
    state = appReducer(state, { type: 'mission/advance', seconds: 180 })
    const packet = syntheticSample('physiological', { astronautId: 'crew-01', compartmentId: 'living', timestamp: state.mission.missionTime, seed: 43 })
    expect.soft(packet.measurements.some(r => ['sleep_duration', 'exercise_duration'].includes(r.metric))).toBe(false)
    state = appReducer(state, { type: 'sensors/ingest', batch: packet })
    expect(assessPerformance(state.mission, 'crew-01', 'synthetic', state.mission.missionTime).findings.some(f => f.ruleId === 'DEMO-MULTI-PERF-01')).toBe(true)
  })
  it('A4 rejects a cross-subject ID collision without overwriting the existing record', () => {
    let state = appReducer(createAppState(), { type: 'mode/set', mode: 'medical' })
    const record = { ...state.mission.measurements[0]!, id: 'same-id', source: 'manual' as const, origin: 'observed' as const, astronautId: 'crew-02' }
    delete record.generatedTelemetry
    state = appReducer(state, { type: 'measurements/upsert', records: [record] })
    state = appReducer(state, { type: 'mode/set', mode: 'astronaut' })
    state = appReducer(state, { type: 'measurements/upsert', records: [{ ...record, astronautId: 'crew-01', value: 10 }] })
    expect(state.personal.measurements).toEqual([record]); expect(state.notice).toContain('Not saved')
  })
  it('A5 keeps the originally acknowledged evidence and appends a dated update', () => {
    let mission = disrupted(); mission = { ...mission, ...synchronizeClinical(mission) }
    const original = structuredClone(mission.alerts[0]!)
    mission.alerts[0]!.status = 'acknowledged'
    mission = step(mission, 60); mission = { ...mission, ...synchronizeClinical(mission) }
    expect(mission.alerts[0]!.evidence).toEqual(original.evidence)
    expect(mission.alerts[0]!.createdAt).toBe(original.createdAt)
    expect(mission.alerts[0]!.status).toBe('acknowledged')
    expect(mission.alerts[0]!.updates?.at(-1)?.at).toBe(mission.missionTime)
    expect(mission.encounters).toHaveLength(1)
  })
  it('retains manual, ingested and clinical-evidence records through long simulation and persistence', () => {
    localStorage.clear()
    let state = appReducer(createAppState(), { type: 'demo/start' })
    const originalEvidence = state.mission.alerts[0]!.evidence.map(e => e.observationId)
    const record = { ...state.mission.measurements[0]!, id: 'manual-protected', source: 'manual' as const }
    state = appReducer(state, { type: 'measurements/upsert', records: [record] })
    const packet = syntheticSample('medical', { astronautId: 'crew-01', compartmentId: 'living', timestamp: state.mission.missionTime, seed: 100 })
    state = appReducer(state, { type: 'sensors/ingest', batch: packet })
    state = appReducer(state, { type: 'mission/advance', seconds: 237 * 60 })
    const ids = new Set([...state.mission.measurements, ...state.mission.assessments!, ...state.mission.environment].map(r => r.id))
    expect(ids.has('manual-protected')).toBe(true)
    for (const id of [...originalEvidence, ...packet.measurements.map(r => r.id)]) expect(ids.has(id)).toBe(true)
    persistState(localStorage, state)
    expect(restoreState(localStorage).error).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  }, 30000)
  it('A3 flags conflicting same-instant results independently of insertion order', () => {
    const mission = disrupted(), records = mission.measurements.filter(r => r.astronautId === 'crew-01' && r.metric === 'heart_rate').map(r => ({ ...r, signal: r.metric }))
    const conflict = { ...records.at(-1)!, id: 'conflicting-spot', value: 10 }
    for (const list of [[...records, conflict], [conflict, ...records]]) {
      const c = compareBaseline(list, 'heart_rate', mission.missionTime)
      expect(c.status).toBe('invalid'); expect(c.current).toBeNull(); expect(c.warnings.join()).toContain('Conflicting')
    }
  })
  it('A4 also rejects changed source or origin and keeps the existing record', () => {
    let state = appReducer(createAppState(), { type: 'demo/start' })
    const original = structuredClone(state.mission.measurements[0]!)
    state = appReducer(state, { type: 'measurements/upsert', records: [{ ...original, source: 'manual' }] })
    expect(state.notice).toContain('Not saved'); expect(state.mission.measurements[0]).toEqual(original)
    state = appReducer(state, { type: 'mode/set', mode: 'astronaut' })
    state = appReducer(state, { type: 'measurements/upsert', records: [{ ...original, source: 'manual', origin: 'observed' }] })
    expect(state.notice).toContain('Not saved'); expect(state.personal.measurements).toHaveLength(0)
  })
})
