import { useState } from 'react'
import type { MedicalEncounter } from '../../contracts/types'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { EmptyState, OriginBadge, Time } from '../app/components/ui'
import { metricLabel } from '../app/format'

const steps: { id: MedicalEncounter['status']; label: string }[] = [{ id: 'open', label: 'Open' }, { id: 'under_review', label: 'Under review' }, { id: 'resolved', label: 'Resolved' }]
function CaseProgress({ status }: { status: MedicalEncounter['status'] }) {
  const current = steps.findIndex(s => s.id === status)
  return <ol className="case-progress" aria-label={`Case status: ${steps[current]?.label}`}>{steps.map((s, i) => <li key={s.id} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}><span aria-hidden="true" />{s.label}</li>)}</ol>
}

function Encounter({ encounter }: { encounter: MedicalEncounter }) {
  const { state, dispatch } = useAppState()
  const [note, setNote] = useState(''), [completed, setCompleted] = useState(false)
  const workspace = selectWorkspace(state)
  const caseTime = () => state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString()
  const options = workspace.measurements.filter(r => r.astronautId === encounter.astronautId && r.origin === encounter.origin).slice(-12)
  const [observationId, setObservationId] = useState('')
  const hasCompletedFollowUp = encounter.actions.some(a => a.kind === 'follow_up' && a.completed)
  return <article className="case-card" id={`case-${encounter.id}`}>
    <div className="record-head"><h3>{encounter.title}</h3><OriginBadge origin={encounter.origin} /></div>
    <CaseProgress status={encounter.status} />
    <p className="provenance">Opened <Time value={encounter.timestamp} short /> · <span className="mono">{encounter.astronautId}</span></p>
    {encounter.actions.length > 0 && <ul className="follow-up-list">{encounter.actions.map(a => <li className="follow-up" key={a.id}><p>{a.note}</p><p className="provenance"><Time value={a.timestamp} short /> · {a.completed ? 'Follow-up completed' : 'Follow-up pending'} · {a.origin}</p>{a.observationIds.length > 0 && <p className="mono muted">Linked: {a.observationIds.join(', ')}</p>}</li>)}</ul>}
    {encounter.status === 'open' && <div className="form-actions"><button className="button primary" onClick={() => dispatch({ type: 'encounter/transition', id: encounter.id, transition: 'review', at: caseTime() })}>Begin review</button></div>}
    {encounter.status !== 'resolved' && <form className="entry-form subtle" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; dispatch({ type: 'encounter/follow-up', id: encounter.id, action: { id: crypto.randomUUID(), astronautId: encounter.astronautId, timestamp: state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString(), source: 'manual', origin: encounter.origin, quality: 'valid', unit: 'action', sourceRefIds: [], demonstrationOnly: true, kind: 'follow_up', note: note.trim(), observationIds: observationId ? [observationId] : [], completed } }); setNote(''); setCompleted(false) }}>
      <p className="form-section-title">Add a follow-up</p>
      <label className="field">Follow-up note<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <label className="field">Link a recorded observation (optional)<select value={observationId} onChange={e => setObservationId(e.target.value)}><option value="">No linked observation</option>{options.map(r => <option key={r.id} value={r.id}>{metricLabel(r.metric)}: {r.value} {r.unit} · {r.timestamp}</option>)}</select></label>
      <label className="check-label"><input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} /> I completed the described follow-up</label>
      <div className="form-actions"><button className="button" type="submit">Record follow-up</button></div>
    </form>}
    {state.mode === 'medical' && encounter.status === 'under_review' && <div className="form-actions"><button className="button primary" onClick={() => dispatch({ type: 'encounter/transition', id: encounter.id, transition: 'resolve', at: caseTime() })}>Resolve case after review</button>{!hasCompletedFollowUp && <p className="field-hint">A completed follow-up must be recorded before the case can be resolved.</p>}</div>}
    {state.mode !== 'medical' && encounter.status === 'under_review' && <p className="field-hint">Resolution is available to the Crew Medical Officer context only.</p>}
    {encounter.status === 'resolved' && <p className="muted small">Resolved by explicit medical-context action at {encounter.resolvedAt}. This status is not a diagnosis or proof of recovery.</p>}
  </article>
}
export function Encounters() {
  const { state } = useAppState(), workspace = selectWorkspace(state)
  const cases = (workspace.encounters ?? []).filter(e => e.astronautId === state.selectedAstronautId)
  return <>{!cases.length && <EmptyState title="No medical encounters for this astronaut and data origin.">A case opens automatically for each personal detection.</EmptyState>}<div className="stack tight">{cases.map(e => <Encounter key={e.id} encounter={e} />)}</div></>
}
