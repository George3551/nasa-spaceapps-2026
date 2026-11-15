import { useState } from 'react'
import { useAppState } from '../state/context'
import { selectWorkspace } from '../state/reducer'
import { Panel } from '../components/Panel'
import { AlertLevelBadge, Badge, Callout, DemoBadge, Disclosure, EmptyState, PageHeader, Time } from '../components/ui'
import { Encounters } from '../../health/Encounters'
import { researchSources } from '../../health/sources'

export function Events() {
  const { state, dispatch } = useAppState(), workspace = selectWorkspace(state)
  const [filter, setFilter] = useState<'all' | 'new'>('all')
  const all = workspace.alerts.filter(a => a.astronautId === state.selectedAstronautId)
  const newCount = all.filter(a => a.status === 'new').length
  // New items first, then newest first; stored order is unchanged.
  const alerts = all.filter(a => filter === 'all' || a.status === 'new').slice().sort((a, b) => (a.status === b.status ? Date.parse(b.createdAt) - Date.parse(a.createdAt) : a.status === 'new' ? -1 : 1))
  const person = workspace.crew.find(c => c.id === state.selectedAstronautId)
  return <><PageHeader title="Alerts & Cases" description={<>{person?.displayName} · {state.scope} workspace. Acknowledging an alert, completing a follow-up and resolving a case are separate, explicit actions.</>} />
    <div className="content-grid">
      <Panel title="Detection history" eyebrow="Transparent demonstration rules" description="Each alert lists the observations that triggered it and a safe next check. Alerts never diagnose."
        actions={<div className="segmented" role="group" aria-label="Filter alerts"><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All ({all.length})</button><button aria-pressed={filter === 'new'} onClick={() => setFilter('new')}>New ({newCount})</button></div>}>
        {!alerts.length && <EmptyState title={filter === 'new' && all.length ? 'No unacknowledged alerts.' : 'No detected alerts in this workspace.'}>Missing measurements do not establish good health.</EmptyState>}
        <ul className="alert-list">{alerts.map(alert => {
          const caseRecord = (workspace.encounters ?? []).find(e => e.alertId === alert.id)
          return <li className={`alert-card level-${alert.level} ${alert.status === 'new' ? 'is-new' : ''}`} key={alert.id}>
            <div className="alert-card-head"><AlertLevelBadge level={alert.level} /><Badge tone={alert.status === 'new' ? 'info' : 'neutral'} icon={alert.status === 'new' ? undefined : 'check'}>{alert.status === 'new' ? 'New' : 'Acknowledged'}</Badge>{alert.demonstrationOnly && <DemoBadge>Demonstration rule</DemoBadge>}</div>
            <h3>{alert.title}</h3>
            <p>{alert.explanation}</p>
            <Callout tone="info" title="Next check">{alert.safeNextStep}</Callout>
            <Disclosure summary={`Evidence (${alert.evidence.length}) and sources`}>
              <ul className="evidence-list">{alert.evidence.map((e, index) => <li key={`${e.observationId}-${index}`}>{e.explanation}<span className="mono muted">{e.observationId}</span></li>)}</ul>
              <p className="muted small">Missing information: confirmation under comparable conditions and medical review. Detection history may include an earlier condition that is no longer present.</p>
              <div>{alert.sourceRefIds?.map(id => { const source = researchSources.find(s => s.id === id); return source?.url ? <a className="source-link" key={id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : null })}</div>
            </Disclosure>
            <Disclosure summary={`Dated detection updates (${alert.updates?.length ?? 0}) · original evidence is preserved`}>{alert.updates?.map((u, index) => <div className="follow-up" key={`${u.at}-${index}`}><p>{u.at} · {u.title}</p><p>{u.explanation}</p><ul>{u.evidence.map((e, i) => <li key={`${e.observationId}-${i}`}>{e.observationId}: {e.explanation}</li>)}</ul></div>)}</Disclosure>
            <div className="alert-card-foot"><p className="muted small"><Time value={alert.createdAt} /> · rule <span className="mono">{alert.ruleId}</span>{caseRecord && <> · <a className="inline-link" href={`#case-${caseRecord.id}`}>Related case: {caseRecord.status.replace('_', ' ')}</a></>}</p>
              <button className="button" disabled={alert.status === 'acknowledged'} onClick={() => dispatch({ type: 'alerts/acknowledge', id: alert.id })}>{alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</button></div>
          </li>
        })}</ul>
      </Panel>
      <Panel title="Medical encounters" eyebrow="Human-reviewed workflow" description="Open → under review → resolved. Resolution requires the Crew Medical Officer context and a completed follow-up."><Encounters /></Panel>
    </div>
    {state.mode === 'mission' && <Panel title="Mission event history" eyebrow="Synthetic events · latest 30" className="secondary-grid"><ul className="record-list history-list">{workspace.events.slice(-30).reverse().map(e => <li key={e.id}><p>{e.summary}</p><p className="provenance"><Time value={e.at} short /></p></li>)}</ul></Panel>}
  </>
}
