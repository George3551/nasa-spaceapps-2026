import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PhysicalAssessmentMetrics, TrackingIssue, VisualAssessmentMetrics } from '../../contracts/types'
import { PhysicalMetrics, VisualMetrics } from './metrics'
import { faceSignal, poseSignal, POSE_CONNECTIONS } from './signals'
import type { Point } from './signals'

export type SessionEndReason = 'user_stop' | 'tab_hidden' | 'stream_ended' | 'frames_stalled' | 'time_limit' | 'processing_error' | 'startup_error'
export interface CameraSnapshot {
  visual: VisualAssessmentMetrics | null
  physical: PhysicalAssessmentMetrics | null
  issue: TrackingIssue | null
  rawSignal: number | null
  visibility: number | null
  endReason: SessionEndReason | null
}
export class CameraSession {
  private stream: MediaStream | null = null
  private model: FaceLandmarker | PoseLandmarker | null = null
  private generation = 0
  private frame = 0
  private started = 0
  private lastFrame = -1
  private lastVideoTime = -1
  private lastFresh = 0
  private lastUi = 0
  private visual = new VisualMetrics()
  private physical = new PhysicalMetrics()
  private issue: TrackingIssue | null = null
  private rawSignal: number | null = null
  private visibility: number | null = null
  private endReason: SessionEndReason | null = null
  private center: { x: number; y: number; span: number } | null = null
  private onVisibility = () => { if (document.hidden) this.interrupted('Assessment stopped because the page became hidden.', 'tab_hidden') }
  constructor(private kind: 'visual' | 'physical', private video: HTMLVideoElement, private canvas: HTMLCanvasElement, private onSnapshot: (snapshot: CameraSnapshot) => void, private onFailure: (error: string) => void, private onEnded: (snapshot: CameraSnapshot) => void) {}
  async start() {
    const generation = ++this.generation
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) throw new Error('Camera requires HTTPS or localhost and a supported browser.')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return }
      this.stream = stream; this.video.srcObject = stream
      document.addEventListener('visibilitychange', this.onVisibility)
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => this.interrupted('Camera stream ended.', 'stream_ended'), { once: true }))
      await this.video.play()
      if (generation !== this.generation) return
      const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const root = `${import.meta.env.BASE_URL}models/vision`
      const files = await FilesetResolver.forVisionTasks(`${root}/wasm`)
      if (generation !== this.generation) return
      const model = this.kind === 'visual'
        ? await FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: `${root}/face_landmarker.task`, delegate: 'CPU' }, runningMode: 'VIDEO', numFaces: 2, minFaceDetectionConfidence: .6, minFacePresenceConfidence: .6, minTrackingConfidence: .6, outputFaceBlendshapes: false })
        : await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: `${root}/pose_landmarker_lite.task`, delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 2, minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6, outputSegmentationMasks: false })
      if (generation !== this.generation) { model.close(); return }
      this.model = model; this.started = performance.now(); this.lastFresh = this.started
      const loop = () => {
        if (generation !== this.generation) return
        const now = performance.now(), elapsed = now - this.started
        try {
          if (document.hidden) { this.interrupted('Assessment stopped because the page became hidden.', 'tab_hidden'); return }
          if (elapsed >= 120000) { const result = this.stop('time_limit'); this.onEnded(result); return }
          if (now - this.lastFrame >= 50 && this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
            this.lastFrame = now; this.lastVideoTime = this.video.currentTime; this.lastFresh = now
            this.process(now, elapsed)
          } else if (now - this.lastFresh > 750) {
            this.issue = 'camera_interrupted'; this.feedInvalid(elapsed)
            if (now - this.lastFresh > 3000) { this.interrupted('Camera frames stopped arriving.', 'frames_stalled'); return }
          }
          if (now - this.lastUi > 250) { this.lastUi = now; this.onSnapshot(this.snapshot(elapsed)) }
        } catch (error) { this.interrupted(`Camera processing failed: ${error instanceof Error ? error.message : 'unknown error'}`, 'processing_error'); return }
        this.frame = requestAnimationFrame(loop)
      }
      this.frame = requestAnimationFrame(loop)
    } catch (error) {
      this.stop('startup_error')
      if (generation + 1 !== this.generation) return
      throw error
    }
  }
  private feedInvalid(elapsed: number) {
    if (this.kind === 'visual') this.visual.feed(elapsed, { ear: null, issue: this.issue })
    else this.physical.feed(elapsed, { angle: null, visibility: null, issue: this.issue })
  }
  private process(now: number, elapsed: number) {
    const width = this.video.videoWidth, height = this.video.videoHeight
    this.canvas.width = width; this.canvas.height = height
    const context = this.canvas.getContext('2d')
    context?.clearRect(0, 0, width, height)
    if (this.kind === 'visual') {
      const result = (this.model as FaceLandmarker).detectForVideo(this.video, now)
      const signal = faceSignal(result.faceLandmarks, width, height)
      const face = result.faceLandmarks[0]
      if (!signal.issue && face?.[1] && face[33] && face[263]) {
        const current = { x: face[1].x, y: face[1].y, span: Math.hypot(face[33].x - face[263].x, face[33].y - face[263].y) }
        if (this.center && (Math.hypot(current.x - this.center.x, current.y - this.center.y) > .12 || Math.abs(current.span / this.center.span - 1) > .35)) { signal.issue = 'unstable'; signal.ear = null }
        this.center = current
      } else this.center = null
      this.issue = signal.issue; this.rawSignal = signal.ear
      this.visual.feed(elapsed, signal)
      this.draw(result.faceLandmarks[0] ?? [], context, width, height, false)
    } else {
      const result = (this.model as PoseLandmarker).detectForVideo(this.video, now)
      const signal = poseSignal(result.landmarks, width, height)
      this.issue = signal.issue; this.rawSignal = signal.angle; this.visibility = signal.visibility
      this.physical.feed(elapsed, signal)
      this.draw(result.landmarks[0] ?? [], context, width, height, true)
    }
  }
  private draw(points: Point[], context: CanvasRenderingContext2D | null, width: number, height: number, pose: boolean) {
    if (!context) return
    context.strokeStyle = this.issue ? '#e6bc77' : '#a8d8ce'; context.fillStyle = context.strokeStyle; context.lineWidth = 2
    if (pose) for (const [a, b] of POSE_CONNECTIONS) {
      if (!points[a] || !points[b]) continue
      context.beginPath(); context.moveTo(points[a]!.x * width, points[a]!.y * height); context.lineTo(points[b]!.x * width, points[b]!.y * height); context.stroke()
    }
    for (const point of points) { context.beginPath(); context.arc(point.x * width, point.y * height, pose ? 3 : 1.2, 0, Math.PI * 2); context.fill() }
  }
  snapshot(duration = this.started ? performance.now() - this.started : 0): CameraSnapshot {
    return { visual: this.kind === 'visual' ? this.visual.result(duration) : null, physical: this.kind === 'physical' ? this.physical.result(duration) : null, issue: this.issue, rawSignal: this.rawSignal, visibility: this.visibility, endReason: this.endReason }
  }
  private interrupted(message: string, reason: SessionEndReason) {
    if (!this.stream) return
    this.issue = 'camera_interrupted'; this.feedInvalid(this.started ? performance.now() - this.started : 0)
    const result = this.stop(reason); this.onFailure(message); this.onEnded(result)
  }
  stop(reason: SessionEndReason = 'user_stop'): CameraSnapshot {
    this.endReason ??= reason
    const snapshot = this.snapshot()
    ++this.generation; cancelAnimationFrame(this.frame)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null
    this.video.pause(); this.video.srcObject = null
    this.model?.close(); this.model = null
    return snapshot
  }
}
