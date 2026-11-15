/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Deterministic scenario tests.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { describe, expect, it } from 'vitest'
import { initialState, runScenario, step } from './engine'
import { evaluate } from '../health/engine'

describe('mission simulator', () => {
  it('repeats the same seed and actions exactly', () => {
    const run = () => step({ ...runScenario(initialState(123), 'sleep-disruption'), paused: false }, 180)
    expect(run()).toEqual(run())
    expect(initialState(123).measurements).not.toEqual(initialState(124).measurements)
  })
  it('samples independently of tick partitioning', () => {
    const start = { ...initialState(42), paused: false }
    expect(step(start, 120)).toEqual(step(step(start, 60), 60))
  })
  it('does not advance while paused or mutate the original state', () => {
    const state = initialState()
    expect(step(state, 180)).toEqual(state)
    step({ ...state, paused: false }, 180)
    expect(state.events).toHaveLength(3)
  })
  it('generates observations, never medical alerts, for disrupted sleep', () => {
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    expect(state.alerts).toHaveLength(0)
    expect(evaluate(state)[0]?.evidence.length).toBeGreaterThanOrEqual(4)
  })
  it('links coincident compartment conditions and two symptom reports', () => {
    const state = step({ ...runScenario(initialState(), 'co2-excursion'), paused: false }, 60)
    const alerts = evaluate(state)
    expect(alerts).toHaveLength(2)
    expect(alerts.every(a => a.demonstrationOnly && a.compartmentId === 'living')).toBe(true)
    const own = alerts[0]!
    expect(own.evidence.every(e => !e.observationId.includes('crew-02'))).toBe(true)
  })
  it('does not flag normal mission fixtures and labels all data synthetic', () => {
    const state = step({ ...initialState(), paused: false }, 180)
    expect(evaluate(state)).toEqual([])
    expect(state.measurements.every(r => r.origin === 'synthetic')).toBe(true)
  })
})
