/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Storage and recovery regression tests.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { appReducer, createAppState } from './reducer'
import { persistState, restoreState, STORAGE_KEY } from './persistence'

beforeEach(() => localStorage.clear())
describe('validated persistence', () => {
  it('round-trips progress and acknowledgements but restores a safe personal context', () => {
    let state = appReducer(createAppState(), { type: 'mode/set', mode: 'mission' })
    state = appReducer(state, { type: 'mission/scenario', scenario: 'sleep-disruption', seed: 42 })
    state = appReducer(state, { type: 'mission/advance', seconds: 180 })
    state = appReducer(state, { type: 'alerts/acknowledge', id: state.mission.alerts[0]!.id })
    persistState(localStorage, state)
    const result = restoreState(localStorage)
    expect(result.error).toBeNull(); expect(result.state?.mission.alerts[0]?.status).toBe('acknowledged')
    expect(result.state?.mission.missionTime).toBe(state.mission.missionTime)
    expect(result.state?.mode).toBe('astronaut'); expect(result.state?.mission.paused).toBe(true)
  })
  it('preserves corrupt and incompatible bytes for explicit recovery', () => {
    for (const raw of ['broken json', JSON.stringify({ version: 99, state: createAppState() })]) {
      localStorage.setItem(STORAGE_KEY, raw)
      expect(restoreState(localStorage).error).not.toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
    }
  })
  it('rejects foreign provenance and malformed nested records', () => {
    const state = createAppState()
    state.personal.measurements = [{ ...state.mission.measurements[0]! }]
    expect(() => persistState(localStorage, state)).toThrow()
    const fresh = createAppState()
    const raw = JSON.parse(JSON.stringify({ version: 2, state: fresh }))
    raw.state.mission.measurements[0].value = 'invalid'
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))
    expect(restoreState(localStorage).error).not.toBeNull()
  })
  it('propagates quota errors without removing the old stored state', () => {
    expect(() => persistState({ setItem: () => { throw new DOMException('Quota full', 'QuotaExceededError') } }, createAppState())).toThrow()
  })
})
