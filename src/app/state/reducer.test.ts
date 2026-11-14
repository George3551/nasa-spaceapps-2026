import { describe, expect, it } from 'vitest'
import { appReducer, createAppState } from './reducer'
import type { HealthAlert } from '../../../contracts/types'

describe('central integration state', () => {
  it('creates independent fixture snapshots and preserves provenance', () => {
    const first = createAppState(), second = createAppState()
    first.mission.crew.length = 0
    expect(second.mission.crew).toHaveLength(1)
    expect(second.mission.measurements[0]).toMatchObject({ origin: 'synthetic', demonstrationOnly: true, quality: 'valid' })
  })

  it('upserts measurements without duplicates, preserving missing values and immutability', () => {
    const state = createAppState()
    const original = state.mission.measurements[0]!
    const missing = { ...original, value: null, quality: 'missing' as const }
    const next = appReducer(state, { type: 'measurements/upsert', records: [missing, missing] })
    expect(next.mission.measurements).toEqual([missing])
    expect(state.mission.measurements[0]?.value).toBe(64)
  })

  it('keeps crew selection valid when a simulator replaces the mission', () => {
    const state = createAppState()
    const next = appReducer(state, { type: 'mission/replace', mission: { ...state.mission, crew: [], compartments: [] } })
    expect(next.selectedAstronautId).toBeNull()
    expect(next.selectedCompartmentId).toBeNull()
    expect(appReducer(state, { type: 'crew/select', id: 'unknown' })).toBe(state)
  })

  it('preserves acknowledgement across evaluator refreshes without inferring recovery', () => {
    const alert: HealthAlert = {
      id: 'test-alert', createdAt: '2026-11-14T08:00:00.000Z', level: 'information',
      title: 'Integration test only', explanation: 'Synthetic test message', evidence: [],
      safeNextStep: 'Inspect the test fixture', status: 'new', ruleId: 'test-only', demonstrationOnly: true,
    }
    const loaded = appReducer(createAppState(), { type: 'alerts/replace', alerts: [alert] })
    const read = appReducer(loaded, { type: 'alerts/acknowledge', id: alert.id })
    const refreshed = appReducer(read, { type: 'alerts/replace', alerts: [alert, alert] })
    expect(refreshed.mission.alerts).toHaveLength(1)
    expect(refreshed.mission.alerts[0]?.status).toBe('acknowledged')
    expect(refreshed.mission.measurements).toEqual(loaded.mission.measurements)
  })

  it('reset restores the same fixture without retaining incoming records', () => {
    const initial = createAppState()
    const changed = appReducer(initial, { type: 'events/upsert', records: [{
      id: 'test', at: initial.mission.missionTime, kind: 'routine', summary: 'Test event', synthetic: true,
    }] })
    expect(appReducer(changed, { type: 'fixture/reset' })).toEqual(initial)
  })
})
