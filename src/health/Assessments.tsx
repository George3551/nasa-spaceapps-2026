import { useCallback, useEffect, useRef, useState } from 'react'
import type { AssessmentResult, ProcedureAttempt, ReactionTrial, RecordMetadata } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { assessProcedure, classifyResponse, scoreReaction, scoreTyping, TYPING_DURATION_MS, TYPING_TEXT } from './assessmentMetrics'

function metadata(astronautId: string, sourceRefIds: string[] = []): RecordMetadata {
  return { id: crypto.randomUUID(), astronautId, timestamp: new Date().toISOString(), source: 'assessment', origin: 'observed', quality: 'valid', unit: 'assessment', sourceRefIds, demonstrationOnly: true }
}
type AssessmentProps = { astronautId: string; onSave(record: AssessmentResult): void }

export function TypingAssessment({ astronautId, onSave }: AssessmentProps) {
  const [running, setRunning] = useState(false), [text, setText] = useState(''), [remaining, setRemaining] = useState(30), [message, setMessage] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const session = useRef({ started: 0, text: '', corrections: 0, intervals: [] as number[], lastKey: 0 })
  useEffect(() => {
    if (!running) return
    let frame = 0
    const update = () => {
      const elapsed = performance.now() - session.current.started
      setRemaining(Math.max(0, Math.ceil((TYPING_DURATION_MS - elapsed) / 1000)))
      if (elapsed >= TYPING_DURATION_MS) {
        const s = session.current
        onSave({ ...metadata(astronautId), kind: 'typing', result: scoreTyping(s.text, TYPING_TEXT, TYPING_DURATION_MS, s.corrections, s.intervals) })
        setRunning(false); setMessage('30-second assessment completed and saved.')
      } else frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    const hidden = () => { if (document.hidden) { setRunning(false); setMessage('Test cancelled because the tab became hidden. No result saved.') } }
    document.addEventListener('visibilitychange', hidden)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hidden) }
  }, [running, astronautId, onSave])
  function start() {
    session.current = { started: performance.now(), text: '', corrections: 0, intervals: [], lastKey: 0 }
    setText(''); setRemaining(30); setMessage(''); setRunning(true)
    requestAnimationFrame(() => input.current?.focus())
  }
  return <Panel title="Typing performance" eyebrow="30-second local assessment">
    <p className="reference-text">{TYPING_TEXT}</p>
    <label className="field">Type the reference text<textarea ref={input} aria-label="Typing response" value={text} disabled={!running} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} onChange={e => { session.current.text = e.target.value; setText(e.target.value) }} onKeyDown={e => {
      if (e.repeat) return
      if (e.key === 'Backspace' || e.key === 'Delete') session.current.corrections++
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { const now = performance.now(); if (session.current.lastKey) session.current.intervals.push(now - session.current.lastKey); session.current.lastKey = now }
    }} /></label>
    <div className="control-row"><button className="button primary" disabled={running} onClick={start}>Start typing test</button><button className="button" disabled={!running} onClick={() => { setRunning(false); setMessage('Stopped early. No incomplete result saved.') }}>Stop & discard</button><span className="mono">{remaining} s remaining</span></div>
    <p role="status" className="muted">{message}</p>
    <p className="sample-note">Gross WPM = final characters ÷ 5 ÷ minutes. Accuracy = final characters matching the reference at the same position ÷ final characters. Errors count final mismatches/excess; corrections count Backspace/Delete presses. Inter-key intervals cover non-repeated printable keys only inside this field. Paste is disabled. Raw text is not stored.</p>
  </Panel>
}

export function ReactionAssessment({ astronautId, onSave }: AssessmentProps) {
  const [mode, setMode] = useState<'demo' | 'extended'>('demo'), [phase, setPhase] = useState<'idle' | 'wait' | 'stimulus'>('idle'), [remaining, setRemaining] = useState(30), [message, setMessage] = useState('')
  const session = useRef({ started: 0, due: 0, stimulus: 0, wait: 0, trials: [] as ReactionTrial[], active: false })
  const duration = mode === 'demo' ? 30000 : 180000
  const running = phase !== 'idle'
  function schedule(now: number) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296
    session.current.wait = 1200 + Math.floor(random * 2300)
    session.current.due = now + session.current.wait; session.current.stimulus = 0
    setPhase('wait')
  }
  useEffect(() => {
    if (!running) return
    let frame = 0
    const update = () => {
      const s = session.current, now = performance.now(), elapsed = now - s.started
      setRemaining(Math.max(0, Math.ceil((duration - elapsed) / 1000)))
      if (elapsed >= duration) {
        // An unfinished final trial is not counted as a miss.
        s.active = false; setPhase('idle'); setMessage('Reaction assessment completed and saved.')
        onSave({ ...metadata(astronautId, ['hrr-721']), unit: 'ms', kind: 'reaction', result: scoreReaction(s.trials, duration, mode) })
        return
      }
      if (!s.stimulus && now >= s.due) { s.stimulus = now; setPhase('stimulus') }
      else if (s.stimulus && now - s.stimulus >= 1500) { s.trials.push({ waitMs: s.wait, responseMs: null, outcome: 'missed' }); schedule(now) }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    const hidden = () => { if (document.hidden) { session.current.active = false; setPhase('idle'); setMessage('Cancelled: tab hidden. No result saved.') } }
    document.addEventListener('visibilitychange', hidden)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hidden) }
  }, [running, duration, astronautId, mode, onSave])
  function respond() {
    const s = session.current
    if (!s.active) return
    const now = performance.now()
    const responseMs = s.stimulus ? now - s.stimulus : null
    s.trials.push(classifyResponse(s.wait, responseMs))
    setMessage(responseMs === null ? 'Premature response recorded.' : `${Math.round(responseMs)} ms`)
    schedule(now)
  }
  return <Panel title="Reaction time" eyebrow="PVT-inspired · not a validated NASA PVT">
    <label className="field">Test duration<select value={mode} disabled={running} onChange={e => setMode(e.target.value as typeof mode)}><option value="demo">Short demonstration · 30 seconds</option><option value="extended">Extended assessment · 3 minutes</option></select></label>
    <button className={`reaction-target ${phase === 'stimulus' ? 'ready' : ''}`} disabled={!running} onClick={respond} onKeyDown={e => { if (e.repeat) e.preventDefault() }}>{phase === 'stimulus' ? 'RESPOND NOW' : phase === 'wait' ? 'WAIT…' : 'Start the assessment below'}</button>
    <div className="control-row"><button className="button primary" disabled={running} onClick={() => { const now = performance.now(); session.current = { started: now, due: 0, stimulus: 0, wait: 0, trials: [], active: true }; setMessage(''); schedule(now) }}>Start reaction test</button><button className="button" disabled={!running} onClick={() => { session.current.active = false; setPhase('idle'); setMessage('Stopped early. No incomplete result saved.') }}>Stop & discard</button><span className="mono">{running ? remaining : duration / 1000} s</span></div>
    <p role="status" className="muted">{message}</p><p className="sample-note">Wait 1.2–3.5 s between stimuli. Respond using this button (mouse, touch or keyboard). No response within 1.5 s is a missed trial; an early response is premature. Mean and median use valid responses only. Device, display and input latency affect results.</p>
  </Panel>
}

const procedureFields = [{ field: 'Sample volume', expected: 12, unit: 'mL' }, { field: 'Device setpoint', expected: 24, unit: 'demo units' }]
export function ProcedureAssessment({ astronautId, onSave }: AssessmentProps) {
  const [index, setIndex] = useState(0), [value, setValue] = useState(''), [attempts, setAttempts] = useState<ProcedureAttempt[]>([]), [message, setMessage] = useState(''), [started, setStarted] = useState(false)
  const since = useRef(0), field = procedureFields[index]
  return <Panel title="Procedure input check" eyebrow="Fictional numeric task · no clinical procedure">
    {!started ? <button className="button" onClick={() => { setStarted(true); setIndex(0); setAttempts([]); setMessage(''); since.current = performance.now() }}>Start procedure check</button> : field && <form onSubmit={e => {
      e.preventDefault(); if (!value.trim() || !Number.isFinite(Number(value))) { setMessage('Enter a finite numeric value.'); return }
      const attempt = assessProcedure(field.field, field.expected, Number(value), performance.now() - since.current, field.unit)
      const next = [...attempts, attempt]; setAttempts(next); since.current = performance.now()
      if (!attempt.matched) { setMessage(`Mismatch: review the reference (${field.expected} ${field.unit}). ${next.filter(a => !a.matched).length >= 2 ? 'Repeated errors: consider pausing and reviewing the input.' : 'Correct the input and retry.'}`); return }
      setValue(''); setMessage('Input matches the reference.')
      if (index === procedureFields.length - 1) { onSave({ ...metadata(astronautId, ['cdss-conops']), kind: 'procedure', result: { attempts: next, completed: true } }); setStarted(false); setMessage('Procedure check saved with all attempts and response times.') } else setIndex(index + 1)
    }}><p className="reference-text">Reference: {field.field} = {field.expected} {field.unit}</p><label className="field">Enter {field.field}<input type="number" step="any" value={value} onChange={e => setValue(e.target.value)} required /></label><button className="button" type="submit">Check input</button><button className="text-button" type="button" onClick={() => { setStarted(false); setMessage('Cancelled. No result saved.') }}>Cancel</button></form>}
    <p role="status" className="muted">{message}</p><p className="sample-note">Mistakes are task records, not evidence of cognitive impairment. This demonstration does not control medical equipment.</p>
  </Panel>
}

export function Assessments() {
  const { state, dispatch } = useAppState(), workspace = selectWorkspace(state)
  const id = state.selectedAstronautId ?? state.sessionAstronautId
  // Stable callback avoids restarting an active assessment effect on unrelated renders.
  const save = useCallback((record: AssessmentResult) => dispatch({ type: 'assessment/add', record }), [dispatch])
  const records = (workspace.assessments ?? []).filter(a => a.astronautId === id)
  const typing = records.filter(a => a.kind === 'typing'), reaction = records.filter(a => a.kind === 'reaction')
  const typingBaseline = typing.slice(0, 3).flatMap(a => a.kind === 'typing' ? [a.result.wpm] : [])
  const reactionBaseline = reaction.slice(0, 3).flatMap(a => a.kind === 'reaction' && a.result.meanMs !== null ? [a.result.meanMs] : [])
  const mean = (values: number[]) => values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'Not established'
  return <><div className="page-intro"><div><p className="eyebrow">Daily assessments</p><h1>Human performance</h1><p className="muted">{workspace.crew.find(c => c.id === id)?.displayName} · {state.scope} records · timing tests do not diagnose a condition.</p></div></div>
    {state.scope === 'observed' ? <div className="stack" key={id}><div className="content-grid"><TypingAssessment astronautId={id} onSave={save} /><ReactionAssessment astronautId={id} onSave={save} /></div><ProcedureAssessment astronautId={id} onSave={save} /></div> : <p className="sample-note">Synthetic assessment results are read-only. Select Observed records to run a real interaction; it will be stored separately.</p>}
    <Panel title="Assessment history" eyebrow="Individual comparison · first three same-origin sessions">
      <p className="muted">Typing baseline: {mean(typingBaseline)} WPM · Reaction baseline: {mean(reactionBaseline)} ms. Baselines describe this task and device, not clinical norms.</p>
      {!records.length && <p className="empty-copy">No assessments recorded.</p>}
      <div className="history-list">{records.slice().reverse().slice(0, 40).map(a => <article className="event-item" key={a.id}><h3>{a.kind} · {a.origin}</h3><p className="mono">{a.timestamp} · {a.quality}</p>
        {a.kind === 'typing' && <p>{a.result.wpm.toFixed(1)} WPM · {a.result.accuracy.toFixed(1)}% accuracy · {a.result.errors} errors · {a.result.corrections} corrections · {a.result.interKeyMs.length} inter-key intervals · {a.result.durationMs / 1000} s</p>}
        {a.kind === 'reaction' && <p>Mean {a.result.meanMs?.toFixed(0) ?? 'No data'} ms · Median {a.result.medianMs?.toFixed(0) ?? 'No data'} ms · {a.result.missed} missed · {a.result.premature} premature · {a.result.trials.length} trials</p>}
        {a.kind === 'procedure' && <p>{a.result.attempts.filter(x => !x.matched).length} mismatches · {a.result.attempts.length} attempts · {a.result.attempts.map(x => `${x.field}: ${x.elapsedMs.toFixed(0)} ms`).join('; ')}</p>}
      </article>)}</div>
    </Panel>
  </>
}
