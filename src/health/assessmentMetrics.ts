import type { ReactionMetrics, ReactionTrial, TypingMetrics } from '../../contracts/types'

export const TYPING_TEXT = 'During the mission I record my sleep, review my observations, and report changes to the crew medical officer.'
export const TYPING_DURATION_MS = 30000

// Final-text position accuracy, gross five-character WPM, and edit-operation counts.
export function scoreTyping(text: string, reference: string, durationMs: number, corrections: number, interKeyMs: number[]): TypingMetrics {
  const typed = Array.from(text), expected = Array.from(reference)
  const correctCharacters = typed.filter((character, index) => character === expected[index]).length
  return {
    durationMs, typedCharacters: typed.length, correctCharacters,
    errors: typed.length - correctCharacters, corrections, interKeyMs,
    wpm: durationMs > 0 ? (typed.length / 5) / (durationMs / 60000) : 0,
    accuracy: typed.length ? correctCharacters / typed.length * 100 : 0,
  }
}

export function scoreReaction(trials: ReactionTrial[], durationMs: number, mode: ReactionMetrics['mode']): ReactionMetrics {
  const times = trials.flatMap(t => t.outcome === 'response' && t.responseMs !== null ? [t.responseMs] : []).sort((a, b) => a - b)
  const middle = Math.floor(times.length / 2)
  return {
    durationMs, mode, trials,
    meanMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    medianMs: times.length ? (times.length % 2 ? times[middle]! : (times[middle - 1]! + times[middle]!) / 2) : null,
    missed: trials.filter(t => t.outcome === 'missed').length,
    premature: trials.filter(t => t.outcome === 'premature').length,
  }
}

export function assessProcedure(field: string, expected: number, entered: number, elapsedMs: number, unit = 'demo units') {
  return { field, unit, expected, entered, matched: expected === entered, elapsedMs }
}

export function classifyResponse(waitMs: number, responseMs: number | null): ReactionTrial {
  return { waitMs, responseMs: responseMs !== null && responseMs < 1500 ? responseMs : null, outcome: responseMs === null ? 'premature' : responseMs >= 1500 ? 'missed' : 'response' }
}
