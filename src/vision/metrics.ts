/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: EAR closure/blink timing, coverage and elbow-cycle rules.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Google MediaPipe supplies pretrained landmarks; AEGIS measurements are experimental, not clinically validated.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { InvalidTrackingInterval, PhysicalAssessmentMetrics, TrackingIssue, VisualAssessmentMetrics } from '../../contracts/types'
import type { FaceSignal, PoseSignal } from './signals'

export class TrackingClock {
  validMs = 0
  intervals: InvalidTrackingInterval[] = []
  previous: { at: number; issue: TrackingIssue | null } | null = null
  feed(at: number, issue: TrackingIssue | null) {
    const before = this.previous
    this.previous = { at, issue }
    if (!before || at <= before.at) return 0
    const dt = at - before.at
    const invalid = dt > 250 ? 'sampling_gap' : issue ?? before.issue
    if (invalid) {
      const last = this.intervals.at(-1)
      if (last?.reason === invalid && last.endMs === before.at) last.endMs = at
      else this.intervals.push({ startMs: before.at, endMs: at, reason: invalid })
      return 0
    }
    this.validMs += dt
    return dt
  }
}

export class VisualMetrics {
  readonly clock = new TrackingClock()
  baseline: number | null = null
  calibrationMs = 0
  private calibration: { at: number; ear: number }[] = []
  private smooth: number | null = null
  private last = 0
  private closed = false
  private episode = 0
  private closedMs = 0
  private prolongedMs = 0
  private blinks: number[] = []
  private endEpisode(censored: boolean) {
    if (!censored && this.episode >= 80 && this.episode < 500) this.blinks.push(this.episode)
    if (this.episode >= 500) this.prolongedMs += this.episode
    this.episode = 0; this.closed = false
  }
  feed(at: number, signal: FaceSignal) {
    const delta = this.last ? at - this.last : 0
    this.last = at
    if (this.baseline === null) {
      this.calibrationMs = at
      this.clock.feed(at, signal.issue ?? 'calibrating')
      if (signal.issue || signal.ear === null || signal.ear < .18 || signal.ear > .5 || delta > 250) { this.calibration = []; return }
      this.calibration.push({ at, ear: signal.ear }); this.calibration = this.calibration.slice(-80)
      if (this.calibration.length >= 20 && at - this.calibration[0]!.at >= 3000) {
        const values = this.calibration.map(s => s.ear).sort((a, b) => a - b)
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const deviation = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
        if (deviation / mean < .12) this.baseline = values[Math.floor(values.length / 2)]!
      }
      return
    }
    const dt = this.clock.feed(at, signal.issue)
    if (!dt || signal.issue || signal.ear === null) { this.endEpisode(true); this.smooth = null; return }
    this.smooth = this.smooth === null ? signal.ear : this.smooth + (signal.ear - this.smooth) * (1 - Math.exp(-dt / 80))
    const ratio = this.smooth / this.baseline
    if (!this.closed && ratio < .65) this.closed = true
    else if (this.closed && ratio > .8) this.endEpisode(false)
    if (this.closed) { this.closedMs += dt; this.episode += dt }
  }
  result(durationMs: number): VisualAssessmentMetrics {
    const denominator = Math.max(0, durationMs - this.calibrationMs)
    const coverage = denominator ? Math.min(1, this.clock.validMs / denominator) : 0
    const sufficient = this.baseline !== null && this.clock.validMs >= 10000 && coverage >= .7
    const prolonged = this.prolongedMs + (this.episode >= 500 ? this.episode : 0)
    return {
      durationMs, validObservationMs: this.clock.validMs, calibrationMs: Math.min(durationMs, this.calibrationMs), trackingCoverage: coverage,
      blinkCount: sufficient ? this.blinks.length : null, blinkRatePerMinute: sufficient ? this.blinks.length / (this.clock.validMs / 60000) : null,
      blinkDurationsMs: [...this.blinks], meanBlinkDurationMs: sufficient && this.blinks.length ? this.blinks.reduce((a, b) => a + b, 0) / this.blinks.length : null,
      eyeClosureMs: sufficient ? this.closedMs : null, prolongedClosureMs: sufficient ? prolonged : null,
      closureProportion: sufficient ? this.closedMs / this.clock.validMs : null,
      perclosInspiredProportion: sufficient ? prolonged / this.clock.validMs : null,
      calibratedOpenEar: this.baseline, invalidIntervals: this.clock.intervals.map(i => ({ ...i })), sufficient, algorithm: 'ear-hysteresis-v1',
    }
  }
}

export class PhysicalMetrics {
  readonly clock = new TrackingClock()
  private phase: 'unready' | 'extended' | 'flexed' = 'unready'
  private candidate: 'extended' | 'flexed' | null = null
  private candidateMs = 0
  private smooth: number | null = null
  private reps = 0
  private history: { atMs: number; angleDeg: number | null }[] = []
  feed(at: number, signal: PoseSignal) {
    const dt = this.clock.feed(at, signal.issue)
    if (!dt || signal.angle === null) { this.phase = 'unready'; this.candidate = null; this.candidateMs = 0; this.smooth = null }
    else {
      this.smooth = this.smooth === null ? signal.angle : this.smooth + (signal.angle - this.smooth) * (1 - Math.exp(-dt / 80))
      const next = this.smooth > 150 ? 'extended' : this.smooth < 65 ? 'flexed' : null
      if (next !== this.candidate) { this.candidate = next; this.candidateMs = 0 }
      else if (next) this.candidateMs += dt
      if (next && this.candidateMs >= 200) {
        if (next === 'extended' && this.phase === 'flexed') this.reps++
        if (next === 'extended' || this.phase !== 'unready') this.phase = next
      }
    }
    if (!this.history.length || at - this.history.at(-1)!.atMs >= 100) this.history.push({ atMs: at, angleDeg: signal.issue ? null : this.smooth })
  }
  result(durationMs: number): PhysicalAssessmentMetrics {
    const coverage = durationMs ? Math.min(1, this.clock.validMs / durationMs) : 0
    const sufficient = this.clock.validMs >= 3000 && coverage >= .7
    const angles = this.history.flatMap(p => p.angleDeg === null ? [] : [p.angleDeg])
    return { exercise: 'right_elbow_flexion', durationMs, validObservationMs: this.clock.validMs, trackingCoverage: coverage,
      repetitions: sufficient ? this.reps : null, angleHistory: this.history.map(p => ({ ...p })), rangeDeg: sufficient && angles.length ? Math.max(...angles) - Math.min(...angles) : null,
      invalidIntervals: this.clock.intervals.map(i => ({ ...i })), sufficient, algorithm: 'elbow-cycle-v1' }
  }
}
