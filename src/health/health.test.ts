import { describe, expect, it } from 'vitest'
import type { MedicalEncounter } from '../../contracts/types'
import { validateMeasurement } from '../shared/validation'
import { initialState, runScenario, step } from '../simulation/engine'
import { evaluate } from './engine'
import { assessProcedure, classifyResponse, scoreReaction, scoreTyping } from './assessmentMetrics'
import { transitionEncounter } from './clinical'

const measurement = initialState().measurements[0]!
describe('measurement validation', () => {
  it('rejects wrong units and nonfinite input', () => {
    expect(() => validateMeasurement({ ...measurement, unit: 'h' })).toThrow()
    expect(() => validateMeasurement({ ...measurement, value: NaN })).toThrow()
    expect(() => validateMeasurement({ ...measurement, value: '64' })).toThrow()
  })
  it('distinguishes unavailable from an actual zero', () => {
    expect(validateMeasurement({ ...measurement, metric: 'sleep_duration', unit: 'h', value: 0 }).value).toBe(0)
    expect(validateMeasurement({ ...measurement, value: null, quality: 'missing' }).value).toBeNull()
    expect(() => validateMeasurement({ ...measurement, value: null, quality: 'valid' })).toThrow()
    expect(() => validateMeasurement({ ...measurement, value: 0, quality: 'missing' })).toThrow()
  })
  it('rejects impossible entry duration without claiming a medical threshold', () => {
    expect(() => validateMeasurement({ ...measurement, metric: 'sleep_duration', unit: 'h', value: 25 })).toThrow()
  })
})
describe('assessment metrics', () => {
  it('defines final text accuracy, gross WPM and corrections independently', () => {
    const score = scoreTyping('abcXe', 'abcde', 30000, 2, [100, 200])
    expect(score).toMatchObject({ wpm: 2, accuracy: 80, errors: 1, corrections: 2, correctCharacters: 4 })
    expect(score.interKeyMs).toEqual([100, 200])
    expect(scoreTyping('', 'abc', 30000, 0, []).accuracy).toBe(0)
  })
  it('counts excess characters as mismatches', () => {
    expect(scoreTyping('abcd', 'abc', 30000, 0, []).errors).toBe(1)
  })
  it('scores reaction means/medians using only valid responses', () => {
    const result = scoreReaction([classifyResponse(2000, 100), classifyResponse(2000, 200), classifyResponse(2000, null), classifyResponse(2000, 1600)], 30000, 'demo')
    expect(result).toMatchObject({ meanMs: 150, medianMs: 150, missed: 1, premature: 1 })
    expect(scoreReaction([], 30000, 'demo').meanMs).toBeNull()
  })
  it('records reference input mistakes and elapsed time', () => {
    expect(assessProcedure('volume', 12, 21, 450, 'mL')).toEqual({ field: 'volume', unit: 'mL', expected: 12, entered: 21, matched: false, elapsedMs: 450 })
    expect(assessProcedure('volume', 12, 12, 700).matched).toBe(true)
  })
})
describe('explainable rules and clinical lifecycle', () => {
  it('requires same-origin evidence and available quality', () => {
    const state = step({ ...runScenario(initialState(), 'sleep-disruption'), paused: false }, 180)
    expect(evaluate(state)).toHaveLength(1)
    const unavailable = { ...state, measurements: state.measurements.map(r => r.metric === 'reported_fatigue' ? { ...r, quality: 'invalid' as const } : r) }
    expect(evaluate(unavailable)).toHaveLength(0)
    const mixed = { ...state, measurements: state.measurements.map(r => r.metric === 'reported_fatigue' ? { ...r, origin: 'observed' as const } : r) }
    expect(evaluate(mixed)).toHaveLength(0)
  })
  it('requires review and completed follow-up before resolution', () => {
    const encounter: MedicalEncounter = { id: 'case', astronautId: 'crew-01', alertId: 'alert', title: 'Review', timestamp: '2026-11-14T08:00:00.000Z', source: 'assessment', origin: 'synthetic', quality: 'estimated', unit: 'encounter', sourceRefIds: [], demonstrationOnly: true, status: 'open', actions: [] }
    expect(() => transitionEncounter(encounter, 'resolve', encounter.timestamp)).toThrow()
    expect(() => transitionEncounter(transitionEncounter(encounter, 'review', encounter.timestamp), 'resolve', encounter.timestamp)).toThrow()
  })
})
