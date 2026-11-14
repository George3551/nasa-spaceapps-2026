import { useAppState } from '../state/context'
import { selectWorkspace } from '../state/reducer'
import { Panel } from '../components/Panel'
import { formatTimestamp } from '../format'
import { Encounters } from '../../health/Encounters'
import { researchSources } from '../../health/sources'

export function Events() {
  const { state, dispatch } = useAppState(), workspace = selectWorkspace(state)
  const alerts = workspace.alerts.filter(a => a.astronautId === state.selectedAstronautId)
  return <><div className="page-intro"><div><p className="eyebrow">Alerts / Medical encounters / Follow-up</p><h1>Explain, act, follow up.</h1><p className="muted">{workspace.crew.find(c => c.id === state.selectedAstronautId)?.displayName} · {state.scope}. Acknowledgement, completed follow-up and case resolution are separate actions.</p></div></div>
    <div className="content-grid"><Panel title="Detection history" eyebrow="Transparent demonstration rules">
      {!alerts.length && <p className="empty-copy">No detected alerts in this workspace. Missing measurements do not establish good health.</p>}
      {alerts.map(alert => <article className="event-item" key={alert.id}><p><span className="badge neutral">{alert.level} · {alert.status}</span> <span className="badge">Demonstration rule</span></p><h3>{alert.title}</h3><p>{alert.explanation}</p><p className="muted">{formatTimestamp(alert.createdAt)} · {alert.ruleId}</p><ul>{alert.evidence.map((e, index) => <li key={`${e.observationId}-${index}`}><span className="mono">{e.observationId}</span>: {e.explanation}</li>)}</ul><p><strong>Next check:</strong> {alert.safeNextStep}</p><p className="muted">Missing information: confirmation under comparable conditions and medical review. Detection history may include an earlier condition that is no longer present.</p><div>{alert.sourceRefIds?.map(id => { const source = researchSources.find(s => s.id === id); return source?.url ? <a className="source-link" key={id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : null })}</div><button className="button" disabled={alert.status === 'acknowledged'} onClick={() => dispatch({ type: 'alerts/acknowledge', id: alert.id })}>{alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</button></article>)}
    </Panel><Panel title="Medical encounters" eyebrow="Human-reviewed workflow"><Encounters /></Panel></div>
    {state.mode === 'mission' && <Panel title="Mission event history" eyebrow="Synthetic events"><div className="history-list">{workspace.events.slice(-30).reverse().map(e => <p className="event-item" key={e.id}>{e.at} · {e.summary}</p>)}</div></Panel>}
  </>
}
