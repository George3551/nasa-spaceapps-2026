/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Camera-record validation and persistence tests.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { appReducer, createAppState, selectWorkspace } from '../app/state/reducer'
import { LEGACY_STORAGE_KEY, persistState, restoreState, STORAGE_KEY } from '../app/state/persistence'
import { assessmentSchema } from '../shared/validation'
import { PhysicalMetrics, VisualMetrics } from './metrics'
import { cameraRecord } from './records'
const association = { kind: 'fictional_demo_profile' as const, confirmedAt: '2026-11-14T10:00:00Z' }
function physical() {
  const metrics = new PhysicalMetrics()
  for (let at = 0; at <= 4000; at += 50) metrics.feed(at, { angle: 170, visibility: .99, issue: null })
  return cameraRecord('physical', 'crew-01', association, metrics.result(4000), '2026-11-14T10:01:00Z')
}
beforeEach(() => localStorage.clear())
describe('canonical observed camera records', () => {
  it('serializes assessment and activity atomically, restores them and keeps simulation unchanged', () => {
    const initial = createAppState(), record = physical()
    const state = appReducer(initial, { type: 'assessment/add', record })
    expect(state.personal.assessments).toHaveLength(1)
    expect(state.personal.activities).toHaveLength(1)
    expect(state.personal.activities![0]).toMatchObject({ source: 'camera_pose', origin: 'observed', quality: 'estimated', details: { experimental: true, assessmentId: record.id } })
    expect(state.mission).toEqual(initial.mission)
    persistState(localStorage, state)
    expect(restoreState(localStorage).state?.personal).toEqual(state.personal)
    expect(selectWorkspace(state).activities).toHaveLength(1)
    const again = appReducer(state, { type: 'assessment/add', record })
    expect(again.personal.activities).toHaveLength(1)
  })
  it('requires explicit association and authentic provenance in serialized data', () => {
    const record = physical()
    for (const change of [{ association: undefined }, { origin: 'synthetic' }, { source: 'simulator' }, { quality: 'valid' }, { experimental: false }]) expect(assessmentSchema.safeParse({ ...record, ...change }).success).toBe(false)
  })
  it('rejects forged availability and invalid histories on restoration', () => {
    const record = physical()
    expect(assessmentSchema.safeParse({ ...record, result: { ...record.result, validObservationMs: 10 } }).success).toBe(false)
    expect(assessmentSchema.safeParse({ ...record, result: { ...record.result, angleHistory: [{ atMs: 9000, angleDeg: 90 }] } }).success).toBe(false)
  })
  it('saves unreliable observations honestly and does not create diagnostic alerts', () => {
    const result = new VisualMetrics().result(1000)
    const record = cameraRecord('visual', 'crew-01', association, result)
    const state = appReducer(createAppState(), { type: 'assessment/add', record })
    expect(state.personal.assessments[0]).toMatchObject({ quality: 'missing', result: { blinkCount: null } })
    expect(state.personal.alerts).toEqual([])
  })
  it('blocks live camera writes in simulation and other astronauts in ordinary astronaut mode', () => {
    const initial = createAppState()
    const synthetic = appReducer(initial, { type: 'scope/set', scope: 'synthetic' })
    expect(appReducer(synthetic, { type: 'assessment/add', record: physical() }).personal.assessments).toEqual([])
    expect(appReducer(initial, { type: 'assessment/add', record: { ...physical(), astronautId: 'crew-02' } }).personal.assessments).toEqual([])
  })
  it('migrates v2 additively and retains original bytes until explicit replacement', () => {
    const state = createAppState(); delete state.personal.activities
    const raw = JSON.stringify({ version: 2, state })
    localStorage.setItem(LEGACY_STORAGE_KEY, raw)
    const restored = restoreState(localStorage)
    expect(restored.error).toBeNull(); expect(restored.state?.personal.activities).toEqual([])
    persistState(localStorage, restored.state!)
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(raw)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(4)
  })
})
