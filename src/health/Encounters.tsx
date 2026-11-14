import { useState } from 'react'
import type { MedicalEncounter } from '../../contracts/types'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'

function Encounter({ encounter }: { encounter: MedicalEncounter }) {
  const { state, dispatch } = useAppState()
  const [note, setNote] = useState(''), [completed, setCompleted] = useState(false)
  const workspace = selectWorkspace(state)
  const caseTime = () => state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString()
  const options = workspace.measurements.filter(r => r.astronautId === encounter.astronautId && r.origin === encounter.origin).slice(-12)
  const [observationId, setObservationId] = useState('')
  return <article className="event-item">
    <h3>{encounter.title}</h3><p><span className="badge neutral">Case: {encounter.status.replace('_', ' ')}</span> <span className="badge">{encounter.origin}</span></p>
    <p className="mono">Opened {encounter.timestamp} · {encounter.astronautId}</p>
    {encounter.status === 'open' && <button className="button" onClick={() => dispatch({ type: 'encounter/transition', id: encounter.id, transition: 'review', at: caseTime() })}>Begin review</button>}
    {encounter.actions.map(a => <div className="follow-up" key={a.id}><p>{a.note}</p><p className="muted">{a.timestamp} · {a.completed ? 'Follow-up completed' : 'Follow-up pending'} · {a.origin}</p>{a.observationIds.length > 0 && <p className="mono">Linked: {a.observationIds.join(', ')}</p>}</div>)}
    {encounter.status !== 'resolved' && <form className="entry-form" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; dispatch({ type: 'encounter/follow-up', id: encounter.id, action: { id: crypto.randomUUID(), astronautId: encounter.astronautId, timestamp: state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString(), source: 'manual', origin: encounter.origin, quality: 'valid', unit: 'action', sourceRefIds: [], demonstrationOnly: true, kind: 'follow_up', note: note.trim(), observationIds: observationId ? [observationId] : [], completed } }); setNote(''); setCompleted(false) }}>
      <label className="field">Follow-up note<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <label className="field">Link a recorded observation (optional)<select value={observationId} onChange={e => setObservationId(e.target.value)}><option value="">No linked observation</option>{options.map(r => <option key={r.id} value={r.id}>{r.metric}: {r.value} {r.unit} · {r.timestamp}</option>)}</select></label>
      <label className="check-label"><input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} /> I completed the described follow-up</label>
      <button className="button" type="submit">Record follow-up</button>
    </form>}
    {state.mode === 'medical' && encounter.status === 'under_review' && <button className="button" onClick={() => dispatch({ type: 'encounter/transition', id: encounter.id, transition: 'resolve', at: caseTime() })}>Resolve case after review</button>}
    {encounter.status === 'resolved' && <p className="muted">Resolved by explicit medical-context action at {encounter.resolvedAt}. This status is not a diagnosis or proof of recovery.</p>}
  </article>
}
export function Encounters() {
  const { state } = useAppState(), workspace = selectWorkspace(state)
  const cases = (workspace.encounters ?? []).filter(e => e.astronautId === state.selectedAstronautId)
  return <>{!cases.length && <p className="empty-copy">No medical encounters for this astronaut and data origin.</p>}{cases.map(e => <Encounter key={e.id} encounter={e} />)}</>
}
