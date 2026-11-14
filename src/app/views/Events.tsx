import { useAppState } from '../state/context'
import { Panel } from '../components/Panel'
import { formatTimestamp } from '../format'

export function Events() {
  const { state, dispatch } = useAppState()
  return <><div className="page-intro"><div><p className="eyebrow">System events / Alerts</p><h1>Evidence before interpretation.</h1><p className="muted">Alerts and events will appear here when domain modules are connected.</p></div></div>
    <div className="content-grid"><Panel title="Alerts" eyebrow="Health evaluator output">
      {!state.mission.alerts.length && <p className="empty-copy">No alert records. The health engine is not connected; this is not a health assessment.</p>}
      {state.mission.alerts.map(alert => <article className="event-item" key={alert.id}><span className="badge neutral">{alert.level} · {alert.status}</span>{alert.demonstrationOnly && <span className="badge">Demonstration rule</span>}<h3>{alert.title}</h3><p>{alert.explanation}</p><p className="muted">{formatTimestamp(alert.createdAt)} · Rule {alert.ruleId}</p><ul>{alert.evidence.map((evidence, index) => <li key={`${evidence.observationId}-${index}`}>{evidence.observationId}: {evidence.explanation}</li>)}</ul><p>Next check: {alert.safeNextStep}</p><button className="button" disabled={alert.status === 'acknowledged'} onClick={() => dispatch({ type: 'alerts/acknowledge', id: alert.id })}>{alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</button></article>)}
    </Panel><Panel title="Mission timeline" eyebrow="Recorded events">
      {!state.mission.events.length && <p className="empty-copy">No mission events recorded. The integration fixture has no running simulation.</p>}
      <ol>{state.mission.events.map(event => <li className="event-item" key={event.id}><p>{event.summary}</p><p className="muted">{formatTimestamp(event.at)} · {event.synthetic ? 'Synthetic' : 'Non-synthetic event'}</p></li>)}</ol>
    </Panel></div>
  </>
}
