import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraSession } from './CameraSession'
const model = vi.hoisted(() => ({ close: vi.fn(), create: vi.fn() }))
vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) }, FaceLandmarker: { createFromOptions: model.create }, PoseLandmarker: { createFromOptions: model.create } }))
function setup() {
  const stop = vi.fn(), track = { stop, addEventListener: vi.fn() }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] }
  const getUserMedia = vi.fn(async () => stream)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  const video = document.createElement('video'); video.play = vi.fn(async () => {}); video.pause = vi.fn()
  const ended = vi.fn(), failure = vi.fn()
  const session = new CameraSession('visual', video, document.createElement('canvas'), vi.fn(), failure, ended)
  return { session, stop, stream, track, getUserMedia, ended, failure }
}
beforeEach(() => {
  vi.stubGlobal('isSecureContext', true); vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  model.create.mockResolvedValue({ close: model.close }); model.close.mockClear()
})
afterEach(() => vi.unstubAllGlobals())
describe('camera resource lifetime', () => {
  it('releases tracks and the model on explicit stop', async () => {
    const { session, stop, failure, ended } = setup(); await session.start(); const result = session.stop()
    expect(stop).toHaveBeenCalledOnce(); expect(model.close).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ endReason: 'user_stop', issue: null })
    expect(failure).not.toHaveBeenCalled(); expect(ended).not.toHaveBeenCalled()
  })
  it('releases late permission results after startup cancellation', async () => {
    const { session, stop, stream, getUserMedia } = setup()
    let grant!: (s: typeof stream) => void
    getUserMedia.mockImplementation(() => new Promise(resolve => { grant = resolve }))
    const pending = session.start(); session.stop(); grant(stream); await pending
    expect(stop).toHaveBeenCalledOnce()
  })
  it('propagates permission denial and leaves no active tracks', async () => {
    const { session, stop, getUserMedia } = setup()
    getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
    await expect(session.start()).rejects.toThrow('Permission denied'); expect(stop).not.toHaveBeenCalled()
  })
  it('closes a model that finishes initializing after cancellation', async () => {
    const { session, stop } = setup()
    let finish!: (value: { close: typeof model.close }) => void
    model.create.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const pending = session.start()
    await vi.waitFor(() => expect(finish).toBeDefined())
    session.stop(); finish({ close: model.close }); await pending
    expect(stop).toHaveBeenCalledOnce(); expect(model.close).toHaveBeenCalledOnce()
  })
  it('releases the stream if local model initialization fails', async () => {
    const { session, stop } = setup(); model.create.mockRejectedValueOnce(new Error('Missing model'))
    await expect(session.start()).rejects.toThrow('Missing model'); expect(stop).toHaveBeenCalledOnce()
  })
  it('stops immediately on visibility change, without depending on an animation frame', async () => {
    const { session, stop, ended, failure } = setup(); await session.start()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(stop).toHaveBeenCalledOnce(); expect(ended).toHaveBeenCalledOnce(); expect(failure).toHaveBeenCalled()
    expect(ended.mock.calls[0]![0]).toMatchObject({ endReason: 'tab_hidden', issue: 'camera_interrupted' })
    expect(session.stop().endReason).toBe('tab_hidden')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })
  it('distinguishes external stream end from an explicit user stop', async () => {
    const { session, track, ended } = setup(); await session.start()
    const callback = track.addEventListener.mock.calls[0]![1] as EventListener
    callback(new Event('ended'))
    expect(ended.mock.calls[0]![0]).toMatchObject({ endReason: 'stream_ended', issue: 'camera_interrupted' })
  })
})
