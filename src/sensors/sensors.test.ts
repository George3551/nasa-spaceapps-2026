/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Sensor provenance, units and persistence regression tests.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { syntheticAdapters, syntheticSample } from './adapters'
import { acquire, validateSensorBatch } from './ingestion'
import { appReducer, createAppState, selectWorkspace } from '../app/state/reducer'
import { persistState, restoreState, PREVIOUS_STORAGE_KEY, STORAGE_KEY } from '../app/state/persistence'
import { assessmentSchema } from '../shared/validation'

const request = { astronautId: 'crew-01', compartmentId: 'living', timestamp: '2026-11-14T08:00:00.000Z', seed: 100 }
const mission = () => appReducer(createAppState(), { type: 'mode/set', mode: 'mission' })
beforeEach(() => localStorage.clear())
describe('replaceable synthetic adapters and atomic canonical ingestion', () => {
  it.each(syntheticAdapters)('$category declares provenance and returns reproducible validated packets', async adapter => {
    const batch = await acquire(adapter, request)
    expect(await acquire(adapter, request)).toEqual(batch)
    const records = [...batch.measurements, ...batch.environment, ...batch.examinations]
    expect(records.length).toBeGreaterThan(0)
    expect(records.every(r => r.source === 'simulator' && r.origin === 'synthetic' && r.demonstrationOnly && r.acquisition?.deviceId === adapter.id)).toBe(true)
  })
  it('stores missing laboratory values as null with a named analyte and unit', () => {
    const batch = validateSensorBatch(syntheticSample('medical', request), 'synthetic')
    expect(batch.measurements.find(r => r.analyte === 'hemoglobin')).toMatchObject({ value: null, quality: 'missing', unit: 'g/L' })
    delete batch.measurements[0]!.analyte
    expect(() => validateSensorBatch(batch, 'synthetic')).toThrow()
  })
  it.each(['physiological', 'environmental'] as const)('rejects incorrect %s units and inconsistent missing values', category => {
    const batch = syntheticSample(category, request)
    const r = [...batch.measurements, ...batch.environment][0]!
    r.unit = 'incorrect'
    expect(() => validateSensorBatch(batch, 'synthetic')).toThrow()
    r.unit = category === 'physiological' ? 'bpm' : 'ppm'; r.value = null
    expect(() => validateSensorBatch(batch, 'synthetic')).toThrow()
  })
  it('rejects mismatched descriptor identity and requested subject', async () => {
    const adapter = syntheticAdapters[0]!
    await expect(acquire({ ...adapter, id: 'pretend-hardware' }, request)).rejects.toThrow('identity')
    await expect(acquire({ ...adapter, read: async () => syntheticSample('physiological', { ...request, astronautId: 'crew-02' }) }, request)).rejects.toThrow('subject')
  })
  it('does not admit synthetic packets into observed history', () => {
    const state = createAppState(), next = appReducer(state, { type: 'sensors/ingest', batch: syntheticSample('physiological', request) })
    expect(next.personal).toEqual(state.personal); expect(next.notice).toContain('Not saved')
  })
  it('is idempotent and retains all existing assessments', () => {
    const state = mission(), batch = syntheticSample('medical', request)
    const next = appReducer(state, { type: 'sensors/ingest', batch })
    expect(next.notice).not.toContain('Not saved')
    const replay = appReducer(next, { type: 'sensors/ingest', batch })
    expect(replay.mission.measurements).toEqual(next.mission.measurements)
    expect(replay.mission.examinations).toEqual(next.mission.examinations)
    expect(replay.mission.assessments).toEqual(state.mission.assessments)
  })
  it('rejects conflicting replay atomically, including otherwise valid examination entries', () => {
    const batch = syntheticSample('medical', request), first = appReducer(mission(), { type: 'sensors/ingest', batch })
    const changed = structuredClone(batch); changed.measurements[0]!.value = 42; changed.examinations[0]!.id += '-new'
    const next = appReducer(first, { type: 'sensors/ingest', batch: changed })
    expect(next.mission).toEqual(first.mission); expect(next.notice).toContain('Conflicting')
  })
  it('rejects packet duplicate IDs and IDs colliding with cognitive/CV records', () => {
    const state = mission(), batch = syntheticSample('physiological', request)
    batch.measurements[1]!.id = batch.measurements[0]!.id
    expect(appReducer(state, { type: 'sensors/ingest', batch }).notice).toContain('Duplicate')
    batch.measurements = [batch.measurements[0]!]; batch.measurements[0]!.id = state.mission.assessments![0]!.id
    expect(appReducer(state, { type: 'sensors/ingest', batch }).mission).toEqual(state.mission)
  })
  it('rejects other subjects in ordinary astronaut mode', () => {
    const state = appReducer(createAppState(), { type: 'scope/set', scope: 'synthetic' })
    const next = appReducer(state, { type: 'sensors/ingest', batch: syntheticSample('medical', { ...request, astronautId: 'crew-02' }) })
    expect(next.mission).toEqual(state.mission); expect(next.notice).toContain('not accessible')
  })
  it('requires explicit observed environmental subject association', () => {
    const batch = syntheticSample('environmental', request)
    batch.environment = batch.environment.map(r => { const next = { ...r, origin: 'observed' as const, source: 'environment_sensor' as const, demonstrationOnly: false }; delete next.astronautId; return next })
    expect(() => validateSensorBatch(batch, 'observed')).toThrow('subject')
  })
  it('round-trips new records and CV/cognitive history; v3 bytes remain unchanged', () => {
    const legacy = createAppState(); delete legacy.personal.environment; delete legacy.personal.examinations
    const raw = JSON.stringify({ version: 3, state: legacy }); localStorage.setItem(PREVIOUS_STORAGE_KEY, raw)
    const restored = restoreState(localStorage); expect(restored.error).toBeNull()
    let state = appReducer(restored.state!, { type: 'mode/set', mode: 'mission' })
    state = appReducer(state, { type: 'sensors/ingest', batch: syntheticSample('medical', request) })
    state = appReducer(state, { type: 'sensors/ingest', batch: syntheticSample('environmental', request) })
    persistState(localStorage, state)
    const loaded = restoreState(localStorage); expect(loaded.error).toBeNull()
    expect(loaded.state!.mission.examinations).toEqual(state.mission.examinations)
    expect(loaded.state!.mission.assessments).toEqual(state.mission.assessments)
    expect(loaded.state!.mission.environment).toEqual(state.mission.environment)
    expect(localStorage.getItem(PREVIOUS_STORAGE_KEY)).toBe(raw)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(4)
    expect(loaded.state!.mission.assessments!.every(r => assessmentSchema.safeParse(r).success)).toBe(true)
  })
  it('keeps periodic observed reports and environmental data in the existing personal store', () => {
    const batch = syntheticSample('medical', request)
    batch.measurements = []
    batch.examinations = batch.examinations.map(r => ({ ...r, source: 'manual', origin: 'observed', demonstrationOnly: false }))
    let state = appReducer(createAppState(), { type: 'sensors/ingest', batch })
    expect(state.personal.examinations).toHaveLength(2)
    expect(state.mission.examinations).toHaveLength(0)
    persistState(localStorage, state); state = restoreState(localStorage).state!
    expect(selectWorkspace(state).examinations).toHaveLength(2)
  })
})
