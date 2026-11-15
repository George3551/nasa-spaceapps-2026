import { describe, expect, it } from 'vitest'
import { faceFixture, poseFixture } from './fixtures'
import { faceSignal, poseSignal } from './signals'
import { PhysicalMetrics, VisualMetrics } from './metrics'
import { recordedFace, recordedPose } from './recorded-fixture'

function visualSession() {
  const metrics = new VisualMetrics()
  for (let at = 0; at <= 15000; at += 50) {
    const closed = (at >= 6000 && at < 6200) || (at >= 9000 && at < 10000)
    metrics.feed(at, faceSignal([faceFixture(closed ? .06 : .3)], 600, 600))
  }
  return metrics
}
describe('elapsed-time eye measurements from deterministic landmark fixtures', () => {
  it('excludes the full calibration phase from coverage, including an initial tracking delay', () => {
    const metrics = new VisualMetrics()
    for (let at = 0; at <= 59700; at += 50) metrics.feed(at, at < 10400 ? { ear: null, issue: 'no_face' } : { ear: .298, issue: null })
    const result = metrics.result(59800)
    expect(result.calibrationMs).toBe(13400)
    expect(result.trackingCoverage).toBeCloseTo(result.validObservationMs / (59800 - 13400), 10)
    expect((result.trackingCoverage * 100).toFixed(1)).toBe('99.7')
    expect(result.validObservationMs / result.durationMs).toBeLessThan(.78)
  })
  it('accepts recorded SDK geometry and a controlled eyelid episode derived from it', () => {
    const face = recordedFace(), pose = recordedPose()
    expect(faceSignal([face], 640, 640).ear).toBeCloseTo(.208, 2)
    expect(poseSignal([pose], 640, 640).angle).toBeCloseTo(175.13, 1)
    const metrics = new VisualMetrics()
    for (let at = 0; at <= 16000; at += 50) {
      const frame = recordedFace()
      // Controlled synthetic closure applied to a recorded open-eye frame,
      // not presented as a recording of an actual human blink.
      if (at >= 6000 && at < 6200) for (const [a, b] of [[160, 144], [158, 153], [385, 380], [387, 373]]) {
        const middle = (frame[a!]!.y + frame[b!]!.y) / 2
        frame[a!]!.y = middle + (frame[a!]!.y - middle) * .1
        frame[b!]!.y = middle + (frame[b!]!.y - middle) * .1
      }
      metrics.feed(at, faceSignal([frame], 640, 640))
    }
    expect(metrics.result(16000)).toMatchObject({ sufficient: true, blinkCount: 1 })
  })
  it('calibrates open eyes and counts a complete blink separately from prolonged closure', () => {
    const result = visualSession().result(15000)
    expect(result.sufficient).toBe(true); expect(result.blinkCount).toBe(1)
    expect(result.blinkDurationsMs[0]).toBeGreaterThanOrEqual(150)
    expect(result.prolongedClosureMs).toBeGreaterThanOrEqual(900)
    expect(result.eyeClosureMs).toBeGreaterThan(result.prolongedClosureMs!)
    expect(result.closureProportion).toBeCloseTo(result.eyeClosureMs! / result.validObservationMs)
    expect(result.blinkRatePerMinute).toBeCloseTo(60000 / result.validObservationMs)
  })
  it('does not count missing faces as closed eyes or bridge blinks across lost tracking', () => {
    const metrics = new VisualMetrics()
    for (let at = 0; at <= 18000; at += 50) {
      const signal = at >= 6000 && at < 6050 ? faceSignal([faceFixture(.06)], 600, 600) : at >= 6050 && at < 7000 ? faceSignal([], 600, 600) : faceSignal([faceFixture()], 600, 600)
      metrics.feed(at, signal)
    }
    const result = metrics.result(18000)
    expect(result.blinkCount).toBe(0); expect(result.prolongedClosureMs).toBe(0)
    expect(result.invalidIntervals.some(i => i.reason === 'no_face')).toBe(true)
    expect(result.validObservationMs).toBeLessThan(15000)
  })
  it('excludes long scheduling gaps and keeps unavailable summaries null', () => {
    const metrics = new VisualMetrics()
    for (let at = 0; at <= 4000; at += 50) metrics.feed(at, { ear: .3, issue: null })
    metrics.feed(10000, { ear: .03, issue: null }); metrics.feed(10050, { ear: .3, issue: null })
    const result = metrics.result(10050)
    expect(result.blinkCount).toBeNull(); expect(result.closureProportion).toBeNull()
    expect(result.invalidIntervals).toContainEqual({ startMs: 4000, endMs: 10000, reason: 'sampling_gap' })
    expect(result.validObservationMs).toBeLessThan(1100)
  })
  it('never reports a calibrated assessment when only closed eyes or multiple faces are supplied', () => {
    for (const signal of [{ ear: .06, issue: null }, faceSignal([faceFixture(), faceFixture()], 600, 600)]) {
      const metrics = new VisualMetrics()
      for (let at = 0; at <= 16000; at += 50) metrics.feed(at, signal)
      expect(metrics.result(16000)).toMatchObject({ sufficient: false, calibratedOpenEar: null, blinkCount: null, eyeClosureMs: null })
    }
  })
  it('rejects rotation, out-of-frame landmarks and missing faces without invented confidence', () => {
    const rotated = faceFixture(); rotated[263]!.y = .65
    expect(faceSignal([rotated], 600, 600).issue).toBe('head_pose')
    const outside = faceFixture(); outside[33]!.x = -1
    expect(faceSignal([outside], 600, 600).issue).toBe('out_of_frame')
    expect(faceSignal([], 600, 600)).toEqual({ ear: null, issue: 'no_face' })
  })
  it('uses elapsed time consistently for different frame intervals', () => {
    const values = [40, 100].map(step => {
      const metrics = new VisualMetrics()
      for (let at = 0; at <= 16000; at += step) metrics.feed(at, { ear: at >= 8000 && at < 9000 ? .05 : .3, issue: null })
      return metrics.result(16000)
    })
    expect(Math.abs(values[0]!.eyeClosureMs! - values[1]!.eyeClosureMs!)).toBeLessThanOrEqual(150)
  })
})
describe('projected right-elbow exercise cycles', () => {
  it('counts complete cycles once and keeps a movement history', () => {
    const metrics = new PhysicalMetrics()
    for (let at = 0; at <= 5000; at += 50) metrics.feed(at, poseSignal([poseFixture(at >= 1500 && at < 3000 ? 40 : 170)], 600, 600))
    const result = metrics.result(5000)
    expect(result.repetitions).toBe(1); expect(result.rangeDeg).toBeGreaterThan(120)
    expect(result.angleHistory.length).toBeGreaterThan(40)
  })
  it('does not count a flexed start, static poses, or a cycle interrupted by tracking loss', () => {
    for (const loss of [false, true]) {
      const metrics = new PhysicalMetrics()
      for (let at = 0; at <= 5000; at += 50) {
        const angle = loss ? at >= 1000 && at < 2500 ? 40 : 170 : at < 2500 ? 40 : 170
        metrics.feed(at, loss && at >= 2500 && at < 3000 ? poseSignal([], 600, 600) : poseSignal([poseFixture(angle)], 600, 600))
      }
      expect(metrics.result(5000).repetitions).toBe(0)
    }
  })
  it('rejects visibility failures and multiple people, without using missing as zero', () => {
    expect(poseSignal([poseFixture(90, .2)], 600, 600)).toMatchObject({ issue: 'low_visibility', angle: null, visibility: .2 })
    expect(poseSignal([poseFixture(), poseFixture()], 600, 600).issue).toBe('multiple_poses')
    const metrics = new PhysicalMetrics(); metrics.feed(0, poseSignal([], 600, 600)); metrics.feed(100, poseSignal([], 600, 600))
    expect(metrics.result(100).repetitions).toBeNull()
  })
})
