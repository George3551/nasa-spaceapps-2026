/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Opt-in camera assessment and summary-saving UI.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Google MediaPipe supplies pretrained landmarks; AEGIS measurements are experimental, not clinically validated.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { useEffect, useRef, useState } from 'react'
import type { AcquisitionContext, DemoAssociation } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { Badge, Callout, Disclosure, PageHeader } from '../app/components/ui'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { CameraSession } from './CameraSession'
import type { CameraSnapshot, SessionEndReason } from './CameraSession'
import { cameraRecord } from './records'
import { MovementHistory } from './MovementHistory'
import { acquisition, Conditions } from '../health/Conditions'

const number = (value: number | null | undefined, digits = 1) => value == null ? 'Unavailable' : value.toFixed(digits)
const endLabel: Record<SessionEndReason, string> = {
  user_stop: 'Stopped by you.', tab_hidden: 'Stopped because the page became hidden (privacy safeguard).',
  stream_ended: 'Camera stream ended unexpectedly.', frames_stalled: 'Stopped because camera frames stopped arriving.',
  time_limit: 'Stopped at the 2-minute session limit.', processing_error: 'Stopped after a camera processing error.',
  startup_error: 'Camera or model startup failed.',
}
export function CameraAssessment({ kind }: { kind: 'visual' | 'physical' }) {
  const { state, dispatch } = useAppState(), workspace = selectWorkspace(state)
  const person = workspace.crew.find(c => c.id === state.selectedAstronautId)
  const [association, setAssociation] = useState<DemoAssociation | null>(null)
  const [status, setStatus] = useState<'off' | 'starting' | 'running' | 'stopped' | 'error'>('off')
  const [snapshot, setSnapshot] = useState<CameraSnapshot | null>(null), [error, setError] = useState(''), [saved, setSaved] = useState(false)
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), session = useRef<CameraSession | null>(null), generation = useRef(0), alive = useRef(false)
  const finished = useRef('')
  const [condition, setCondition] = useState('unspecified'), context = useRef<AcquisitionContext | undefined>(undefined)
  useEffect(() => { alive.current = true; return () => { alive.current = false; session.current?.stop() } }, [])
  const active = status === 'starting' || status === 'running'
  async function start() {
    if (!person || !association || !video.current || !canvas.current || state.scope !== 'observed') return
    const current = ++generation.current
    context.current = acquisition('local-camera', kind === 'visual' ? 'ear-hysteresis-v1' : 'elbow-cycle-v1', condition)
    setError(''); setSnapshot(null); setSaved(false); setStatus('starting')
    const controller = new CameraSession(kind, video.current, canvas.current,
      result => { if (alive.current && generation.current === current) { setSnapshot(result); setStatus('running') } },
      message => { if (alive.current && generation.current === current) setError(message) },
      result => { if (alive.current && generation.current === current) { generation.current++; finished.current = new Date().toISOString(); setSnapshot(result); setStatus('stopped') } })
    session.current = controller
    try { await controller.start(); if (alive.current && generation.current === current) setStatus('running') }
    catch (e) { if (alive.current && generation.current === current) { setStatus('error'); setError(e instanceof Error ? e.message : 'Camera/model initialization failed.') } }
  }
  function stop() {
    generation.current++
    const result = session.current?.stop()
    finished.current = new Date().toISOString()
    setSnapshot(result ?? null); setStatus('stopped')
  }
  function save() {
    if (!person || !association || !snapshot || saved || active) return
    const record = kind === 'visual' && snapshot.visual
      ? cameraRecord('visual', person.id, association, snapshot.visual, finished.current, context.current)
      : kind === 'physical' && snapshot.physical ? cameraRecord('physical', person.id, association, snapshot.physical, finished.current, context.current) : null
    if (!record) return
    dispatch({ type: 'assessment/add', record }); setSaved(true)
  }
  const result = snapshot?.visual ?? snapshot?.physical
  const title = kind === 'visual' ? 'Eye Observation' : 'Movement Check'
  return <><PageHeader title={title} description={<>{person?.displayName ?? 'No astronaut selected'} · {state.scope} workspace. Voluntary, local processing, experimental measurements. Camera is optional; other AEGIS features work without it.</>} context={<><Badge tone="attention" icon="warning">Experimental · demonstration only</Badge><Badge icon="lock">On-device · no video stored</Badge></>} />
    {state.scope !== 'observed' ? <Panel title="Live camera unavailable in simulation" eyebrow="Provenance separation"><p className="muted">Select Observed records to collect a live assessment. Camera sessions cannot modify synthetic mission history.</p></Panel> : <div className="content-grid">
      <Panel title={kind === 'visual' ? 'Eye movement observation' : 'Right elbow flexion'} eyebrow={`Camera ${status}`}>
        <p className="muted">{kind === 'visual' ? 'Keep your face frontal, eyes naturally open and head steady for at least 3 seconds of calibration. Then blink normally. At least 10 usable seconds after calibration are required.' : 'Show your right shoulder, elbow and wrist clearly from the side. Start with the arm extended (>150°), bend (<65°), then fully extend. Hold each end position briefly. At least 3 usable seconds are required.'}</p>
        <label className="check-label"><input type="checkbox" disabled={active} checked={!!association} onChange={e => setAssociation(e.target.checked ? { kind: 'fictional_demo_profile', confirmedAt: new Date().toISOString() } : null)} />Associate this observed session with the fictional demo profile {person?.displayName}. It is not a measurement of a real astronaut.</label>
        <Conditions value={condition} onChange={setCondition} disabled={active} label="Camera assessment conditions" />
        <div className="camera-preview"><video ref={video} muted playsInline aria-label="Live camera preview" /><canvas ref={canvas} aria-label={kind === 'visual' ? 'Detected facial landmarks overlay' : 'Detected body skeleton overlay'} />{!active && <span className="camera-off">Camera off</span>}</div>
        <div className="control-row"><button className="button primary" disabled={active || !association || !person} onClick={() => void start()}>Start Assessment</button><button className="button" disabled={!active} onClick={stop}>Stop Assessment</button></div>
        <p className="muted" role="status">{status === 'starting' ? 'Requesting camera and initializing the local model… Stop cancels startup.' : `Camera ${status}. Mirrored preview. No audio, raw recording or upload.`}</p>
        {error && <p role="alert" className="form-error">{error} Camera tracks have been released. You can retry or continue using other assessments.</p>}
        <Callout title="Privacy">Processing is on this device with bundled models and WASM. No recognition of identity, emotions or psychological state. Stop, leaving the page, a hidden tab or a 2-minute limit releases the camera. No raw frames or landmarks are saved.</Callout>
      </Panel>
      <Panel title="Experimental observations" eyebrow="Tracking quality is not medical confidence">
        <p className="muted">{active ? 'Tracking' : 'Last tracking observation'}: {snapshot?.issue?.replaceAll('_', ' ') ?? (kind === 'visual' && snapshot?.visual?.calibratedOpenEar === null ? 'calibrating' : snapshot ? 'usable geometry' : 'not started')}.</p>
        {snapshot?.endReason && <p className="session-end" role="status">Session ended: {endLabel[snapshot.endReason]}</p>}
        {result && <><dl className="key-value"><div><dt>Session</dt><dd>{number(result.durationMs / 1000)} s</dd></div>{snapshot?.visual && <><div><dt>Calibration phase</dt><dd>{number(snapshot.visual.calibrationMs / 1000)} s (excluded from coverage)</dd></div><div><dt>Post-calibration window</dt><dd>{number(Math.max(0, result.durationMs - snapshot.visual.calibrationMs) / 1000)} s</dd></div></>}<div><dt>Usable observation</dt><dd>{number(result.validObservationMs / 1000)} s</dd></div><div><dt>{snapshot?.visual ? 'Usable coverage after calibration' : 'Usable coverage of session'}</dt><dd>{number(result.trackingCoverage * 100)}% (time coverage, not confidence)</dd></div>{snapshot?.visual && <div><dt>Whole-session usable proportion</dt><dd>{number(result.durationMs ? result.validObservationMs / result.durationMs * 100 : null)}%</dd></div>}</dl>
          {!result.sufficient && <p className="form-error" role="status">Assessment unavailable — insufficient reliable visual data.</p>}
        </>}
        {snapshot?.visual && <dl className="key-value"><div><dt>Calibration</dt><dd>{snapshot.visual.calibratedOpenEar === null ? 'Incomplete' : `Open-eye EAR ${number(snapshot.visual.calibratedOpenEar, 3)}`}</dd></div><div><dt>Blinks</dt><dd>{number(snapshot.visual.blinkCount, 0)}</dd></div><div><dt>Blink rate</dt><dd>{number(snapshot.visual.blinkRatePerMinute)} / usable minute</dd></div><div><dt>Mean blink</dt><dd>{number(snapshot.visual.meanBlinkDurationMs)} ms</dd></div><div><dt>Eye closure</dt><dd>{number(snapshot.visual.eyeClosureMs == null ? null : snapshot.visual.eyeClosureMs / 1000)} s</dd></div><div><dt>Closure proportion</dt><dd>{number(snapshot.visual.closureProportion == null ? null : snapshot.visual.closureProportion * 100)}%</dd></div><div><dt>PERCLOS-inspired</dt><dd>{number(snapshot.visual.perclosInspiredProportion == null ? null : snapshot.visual.perclosInspiredProportion * 100)}% prolonged closure time</dd></div></dl>}
        {snapshot?.physical && <dl className="key-value"><div><dt>Elbow angle</dt><dd>{number(snapshot.rawSignal)}° (2D projection)</dd></div><div><dt>Repetitions</dt><dd>{number(snapshot.physical.repetitions, 0)}</dd></div><div><dt>Movement range</dt><dd>{number(snapshot.physical.rangeDeg)}°</dd></div><div><dt>SDK visibility</dt><dd>{number(snapshot.visibility, 2)} (minimum shoulder/elbow/wrist visibility)</dd></div><div><dt>History samples</dt><dd>{snapshot.physical.angleHistory.length}</dd></div></dl>}
        <Disclosure summary="Method and limitations"><p>{kind === 'visual' ? 'Face Landmarker exposes no per-frame face confidence score here. Detection gates, landmark geometry, steadiness and missing intervals determine usability. Closure uses calibrated EAR with smoothing and hysteresis; PERCLOS-inspired is an engineering proxy, not validated PERCLOS or a fatigue diagnosis.' : 'A full extended → flexed → extended cycle is required; tracking loss resets the cycle. 2D angles depend on camera viewpoint. Earth-based recognition is not validated for microgravity and does not measure muscle mass or bone density.'}</p></Disclosure>
        {snapshot?.physical && <MovementHistory result={snapshot.physical} />}
        <div className="form-actions"><button className="button primary" disabled={active || !association || !result || !result.durationMs || saved} onClick={save}>{saved ? 'Assessment saved' : result && !result.sufficient ? 'Save unavailable assessment' : 'Save experimental assessment'}</button></div>
      </Panel>
    </div>}
  </>
}
