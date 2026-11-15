import { describe, expect, it } from 'vitest'
import type { PerformanceObservation } from '../../contracts/types'
import { assessPerformance, compareBaseline } from './intelligence'
import { initialState, runScenario, step } from '../simulation/engine'
import { synchronizeClinical } from './engine'
import { appReducer, createAppState, selectWorkspace } from '../app/state/reducer'

const asOf = '2026-11-14T08:00:00.000Z'
const observation = (i: number, value: number | null = 60): PerformanceObservation => ({ id: `r-${i}`, astronautId: 'crew-01', signal: 'heart_rate', value, unit: 'bpm', timestamp: new Date(Date.parse(asOf) - (4 - i) * 60000).toISOString(), source: 'wearable', origin: 'observed', quality: value === null ? 'missing' : 'valid', acquisition: { deviceId: 'declared-device', protocolId: 'hr-v1', condition: 'quiet-seated', sessionId: `session-${i}` } })
const series = () => [observation(0, 50), observation(1, 60), observation(2, 70), observation(4, 90)]
describe('qualified individual baselines and incomplete modalities', () => {
  it('uses the median of three earlier distinct sessions and excludes the current session', () => {
    const c = compareBaseline(series(), 'heart_rate', asOf)
    expect(c).toMatchObject({ status: 'ready', baseline: 60, delta: 30, percentChange: 50 })
    expect(c.baselineRecords.map(r => r.id)).toEqual(['r-0', 'r-1', 'r-2'])
  })
  it('orders timestamp offsets by their actual instant, not their text representation', () => {
    const records = series(); records[0]!.timestamp = '2026-11-14T12:56:00+05:00'
    expect(compareBaseline(records, 'heart_rate', asOf)).toMatchObject({ baseline: 60, current: { id: 'r-4' }, status: 'ready' })
  })
  it('does not count two timestamp offsets of the same instant as separate baseline samples', () => {
    const records = series(); records[1]!.timestamp = '2026-11-14T12:56:00+05:00'
    expect(compareBaseline(records, 'heart_rate', asOf).baselineRecords).toHaveLength(2)
  })
  it.each(['unit', 'source', 'origin', 'astronautId', 'analyte'] as const)('does not silently pool a different %s', key => {
    const records = series(); records[0] = { ...records[0]!, [key]: 'different' } as PerformanceObservation
    const c = compareBaseline(records, 'heart_rate', asOf)
    expect(c.baseline).toBeNull(); expect(c.warnings.join()).toContain('excluded')
  })
  it.each(['deviceId', 'protocolId', 'condition'] as const)('requires matching acquisition %s', key => {
    const records = series(); records[0]!.acquisition![key] = 'different'
    expect(compareBaseline(records, 'heart_rate', asOf).status).toBe('insufficient_baseline')
  })
  it('does not invent conditions for old or unspecified records', () => {
    const records = series(); delete records[3]!.acquisition
    expect(compareBaseline(records, 'heart_rate', asOf).status).toBe('incompatible')
    records[3]!.acquisition = { ...records[0]!.acquisition!, condition: 'unspecified' }
    expect(compareBaseline(records, 'heart_rate', asOf).baseline).toBeNull()
  })
  it('does not treat repeated frames or one session as multiple baseline sessions', () => {
    const records = series(); records[1]!.acquisition!.sessionId = records[0]!.acquisition!.sessionId
    expect(compareBaseline(records, 'heart_rate', asOf).baselineRecords).toHaveLength(2)
  })
  it('withholds qualification when a physiological device or statistic is unknown', () => {
    const records = series(); records[3]!.acquisition!.protocolId = 'not_recorded'
    expect(compareBaseline(records, 'heart_rate', asOf).status).toBe('incompatible')
  })
  it('does not divide by zero or interpret missing as zero', () => {
    const records = series().map(r => ({ ...r, value: 0 }))
    expect(compareBaseline(records, 'heart_rate', asOf)).toMatchObject({ baseline: 0, percentChange: null, status: 'ready' })
    expect(compareBaseline([], 'heart_rate', asOf).status).toBe('missing')
    expect(compareBaseline([observation(4, null)], 'heart_rate', asOf).baseline).toBeNull()
  })
  it('does not reuse a prior usable value when the latest entry is unavailable', () => {
    const records = series(); records.push(observation(5, null))
    const c = compareBaseline(records, 'heart_rate', new Date(Date.parse(asOf) + 60000).toISOString())
    expect(c.status).toBe('invalid'); expect(c.current!.value).toBe(90); expect(c.latestEntry!.value).toBeNull()
  })
  it('excludes future data and flags stale data and expired baseline history', () => {
    const records = series(); records.push(observation(10, 500))
    expect(compareBaseline(records, 'heart_rate', asOf).current!.value).toBe(90)
    expect(compareBaseline(records, 'heart_rate', '2026-11-14T10:00:00.000Z').status).toBe('stale')
    const old = series(); old.slice(0, 3).forEach(r => { r.timestamp = r.timestamp.replace('11-14', '09-14') })
    expect(compareBaseline(old, 'heart_rate', asOf).status).toBe('insufficient_baseline')
  })
  it('does not derive good health or an emergency from one changed physiological signal', () => {
    const state = initialState(); state.measurements = []; state.assessments = []
    const result = assessPerformance(state, 'crew-01', 'observed', asOf)
    expect(result.findings).toEqual([]); expect(result.comparisons.every(c => c.status === 'missing')).toBe(true)
  })
})
describe('multimodal simulation with human-controlled CDSS', () => {
  it('reproduces sleep/performance co-change with descriptive visual evidence and one existing case', () => {
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    const result = assessPerformance(state, 'crew-01', 'synthetic', state.missionTime)
    expect(result.findings.map(f => f.ruleId)).toContain('DEMO-MULTI-PERF-01')
    expect(result.findings[0]!.evidence.some(e => e.observationId.startsWith('visual-fixture'))).toBe(true)
    expect(result.comparisons.find(c => c.signal === 'reaction_mean')).toMatchObject({ baseline: 260, status: 'ready' })
    const clinical = synchronizeClinical(state)
    expect(clinical.encounters).toHaveLength(1); expect(clinical.encounters[0]!.status).toBe('open')
    expect(clinical.alerts[0]!.explanation).toContain('demonstration choices')
    expect(assessPerformance(state, 'crew-01', 'observed', state.missionTime).findings).toEqual([])
  })
  it('withholds co-change if performance is missing or has incompatible conditions', () => {
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    state.assessments = state.assessments!.filter(a => a.kind !== 'reaction')
    expect(assessPerformance(state, 'crew-01', 'synthetic', state.missionTime).findings).toEqual([])
  })
  it('supports typing as alternative performance evidence without adding a universal score', () => {
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    state.assessments = state.assessments!.flatMap(a => a.kind === 'reaction' ? [{ ...a, kind: 'typing' as const, acquisition: { ...a.acquisition!, protocolId: 'typing-30000-fixture' }, result: { durationMs: 30000, typedCharacters: 100, correctCharacters: 100, errors: 0, corrections: 0, interKeyMs: [], wpm: a.result.meanMs === 260 ? 50 : 30, accuracy: 100 } }] : [])
    const result = assessPerformance(state, 'crew-01', 'synthetic', state.missionTime)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]!.evidence.some(e => e.explanation.startsWith('typing_wpm'))).toBe(true)
    expect(result).not.toHaveProperty('stressPercentage')
  })
  it('evaluates an observed-workspace test fixture independently of synthetic history', () => {
    // Unit-test fixture only; these values are never persisted as actual observations.
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    state.measurements = state.measurements.map(r => ({ ...r, origin: 'observed', source: 'manual' }))
    state.assessments = state.assessments!.filter(a => a.kind === 'reaction').map(a => ({ ...a, origin: 'observed', source: 'assessment' }))
    const result = assessPerformance(state, 'crew-01', 'observed', state.missionTime)
    expect(result.findings).toHaveLength(1)
    expect(result.comparisons.flatMap(c => c.baselineRecords).every(r => r.origin === 'observed')).toBe(true)
    expect(assessPerformance(state, 'crew-01', 'synthetic', state.missionTime).findings).toHaveLength(0)
  })
  it('withholds findings for incompatible current performance protocols', () => {
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    state.assessments!.filter(a => a.kind === 'reaction' && Date.parse(a.timestamp) >= Date.parse(asOf)).forEach(a => { a.acquisition!.protocolId = 'incompatible-test' })
    expect(assessPerformance(state, 'crew-01', 'synthetic', state.missionTime).findings).toHaveLength(0)
  })
  it('explains environmental association without disclosing another astronaut’s medical records', () => {
    let state = appReducer(createAppState(), { type: 'mode/set', mode: 'mission' })
    state = appReducer(state, { type: 'mission/scenario', scenario: 'co2-excursion', seed: 42 })
    state = appReducer(state, { type: 'mission/advance', seconds: 180 })
    state = appReducer(state, { type: 'mode/set', mode: 'astronaut' }); state = appReducer(state, { type: 'scope/set', scope: 'synthetic' })
    const workspace = selectWorkspace(state), result = assessPerformance(workspace, 'crew-01', 'synthetic', workspace.missionTime)
    expect(result.findings[0]!.ruleId).toBe('DEMO-MULTI-ENV-01')
    expect(result.findings[0]!.explanation).toContain('not proof')
    expect(result.findings[0]!.evidence.every(e => !e.observationId.includes('crew-02'))).toBe(true)
    expect(workspace.measurements.every(r => r.astronautId === 'crew-01')).toBe(true)
  })
  it('requires contemporaneous own symptoms, not other crew or future entries', () => {
    const state = step({ ...runScenario(initialState(), 'co2-excursion'), paused: false }, 180)
    state.measurements = state.measurements.filter(r => r.metric !== 'symptom_severity' || r.astronautId !== 'crew-01')
    expect(assessPerformance(state, 'crew-01', 'synthetic', state.missionTime).findings).toEqual([])
  })
})
