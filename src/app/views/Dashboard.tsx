/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Health and mission overview.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { ReactNode } from 'react'
import { useAppState } from '../state/context'
import { fixtureSource } from '../integration/fixtures'
import { MeasurementCard, MissingMetricTile } from '../components/MeasurementCard'
import { Panel } from '../components/Panel'
import { Icon } from '../components/Icon'
import { AlertLevelBadge, Badge, EmptyState, PageHeader, Time } from '../components/ui'
import { selectWorkspace } from '../state/reducer'
import type { Section } from '../state/reducer'
import { healthLabel, roleLabels } from '../navigation'
import { formatTimestamp, humanize, initials, metricLabel } from '../format'

function StatTile({ label, value, caption, tone = 'neutral', onClick, action }: { label: string; value: ReactNode; caption: ReactNode; tone?: 'neutral' | 'critical' | 'attention'; onClick(): void; action: string }) {
  return <button className={`stat-tile tone-${tone}`} onClick={onClick}>
    <span className="stat-label">{label}</span>{' '}<strong className="stat-value">{value}</strong>{' '}<span className="stat-caption">{caption}</span>{' '}<span className="stat-action">{action} <Icon name="arrow" size={14} /></span>
  </button>
}

export function Dashboard() {
  const { state, dispatch } = useAppState()
  const mission = selectWorkspace(state)
  const go = (section: Section) => dispatch({ type: 'navigate', section })
  const crew = mission.crew.find(person => person.id === state.selectedAstronautId)
  const own = (r: { astronautId?: string }) => state.mode === 'astronaut' || r.astronautId === crew?.id
  const newAlerts = mission.alerts.filter(a => a.status === 'new')
  const openCases = (mission.encounters ?? []).filter(e => e.status !== 'resolved')
  const records = mission.measurements.filter(r => r.astronautId === crew?.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const latest = records.at(-1)
  const keyMetrics = (['resting_heart_rate', 'sleep_duration', 'reported_fatigue'] as const).map(key => [key, records.filter(r => r.metric === key).at(-1)] as const)
  const observed = state.scope === 'observed'
  const coverage: [string, number][] = [
    ['Health observations', mission.measurements.filter(own).length],
    ['Task assessments', (mission.assessments ?? []).filter(own).length],
    ['Examination reports', (mission.examinations ?? []).filter(own).length],
    ['Activity records', mission.activities.filter(own).length],
  ]
  const tasks: { label: string; detail: string; section: Section; disabled?: string }[] = [
    { label: 'Log an observation', detail: 'Sleep, fatigue, symptoms or a measured value', section: 'health' },
    { label: 'Run cognitive tests', detail: 'Typing, reaction time, procedure input', section: 'assessments', ...(observed ? {} : { disabled: 'Observed workspace only' }) },
    { label: 'Record an examination', detail: 'ECG, ultrasound or laboratory report', section: 'sensors' },
    { label: 'Compare with baselines', detail: 'Latest results vs your earlier compatible sessions', section: 'performance' },
  ]
  return <>
    <PageHeader title="Overview" description={state.mode === 'mission' ? 'Synthetic mission status: crew, compartments, simulation clock and detections.' : state.mode === 'medical' ? 'Review status for the selected crew member. Detections are demonstration rules and always require human review.' : 'Your own health self-assessment: what changed, what needs attention and the next safe step.'}
      actions={<button className="button primary" onClick={() => go('health')}>{state.mode === 'astronaut' ? 'Check My Health' : `Open ${healthLabel(state.mode)}`} <Icon name="arrow" size={14} /></button>} />

    <section className="stat-row" aria-label="Status summary">
      <StatTile label="New alerts" value={newAlerts.length} tone={newAlerts.length ? 'critical' : 'neutral'} caption={newAlerts.length ? 'Awaiting acknowledgement' : 'None awaiting acknowledgement'} action="Review alerts" onClick={() => go('events')} />
      <StatTile label="Open cases" value={openCases.length} tone={openCases.length ? 'attention' : 'neutral'} caption={openCases.length ? `${openCases.filter(c => c.status === 'under_review').length} under review` : 'No open medical encounters'} action="Open cases" onClick={() => go('events')} />
      <StatTile label="Latest observation" value={latest ? <span className="stat-text">{metricLabel(latest.metric)}</span> : <span className="stat-text">None yet</span>} caption={latest ? formatTimestamp(latest.timestamp) : 'No records in this workspace'} action={state.mode === 'astronaut' ? 'Open My Health' : 'Open health record'} onClick={() => go('health')} />
    </section>

    <div className="content-grid">
      <div className="stack">
        <Panel title={crew?.displayName ?? 'No crew selected'} eyebrow={state.mode === 'astronaut' ? 'Your latest readings' : 'Selected crew member'} description={<>{crew?.role ?? 'Profile unavailable'} · {crew?.syntheticIdentity ? 'Fictional identity' : 'Identity provenance supplied by module'}</>}
          actions={<span className="avatar" aria-hidden="true">{initials(crew?.displayName)}</span>}>
          <div className="metric-grid">{keyMetrics.map(([key, record]) => record
            ? <MeasurementCard key={key} measurement={record} source={record.sourceRefId === fixtureSource.id ? fixtureSource : undefined} />
            : <MissingMetricTile key={key} metric={key} />)}</div>
        </Panel>
        {newAlerts.length > 0 && <Panel title="Needs attention" eyebrow="Newest detections · demonstration rules" actions={<button className="button small" onClick={() => go('events')}>All alerts & cases</button>}>
          <ul className="attention-list">{newAlerts.slice(-4).reverse().map(a => <li key={a.id}><AlertLevelBadge level={a.level} /><div><p className="attention-title">{a.title}</p><p className="muted"><Time value={a.createdAt} short /> · {mission.crew.find(c => c.id === a.astronautId)?.displayName ?? a.compartmentId ?? 'Shared context'}</p></div></li>)}</ul>
        </Panel>}
      </div>
      <div className="stack">
        <Panel title="Common tasks" eyebrow="Gather → evaluate → explain → act → follow up">
          <ul className="task-list">{tasks.map(t => <li key={t.label}><button className="task" disabled={!!t.disabled} onClick={() => go(t.section)}><span><strong>{t.label}</strong>{' '}<small>{t.disabled ?? t.detail}</small></span><Icon name="arrow" /></button></li>)}</ul>
        </Panel>
        <Panel title="Records in this workspace" eyebrow={`${roleLabels[state.mode]} · ${state.scope}`}>
          <dl className="coverage">{coverage.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
          <p className="muted small">Counts describe stored records only. Few or no records do not mean good health. Camera is off unless you start an optional check.</p>
        </Panel>
      </div>
    </div>

    {state.mode === 'mission' && <div className="content-grid secondary-grid">
      <Panel title="Simulation" eyebrow="Synthetic mission clock" actions={<button className="button small" onClick={() => go('simulation')}>Open Simulator</button>}>
        <dl className="key-value"><div><dt>Scenario</dt><dd>{humanize(mission.activeScenario)}</dd></div><div><dt>Mission time</dt><dd className="mono">{formatTimestamp(mission.missionTime)}</dd></div><div><dt>Clock</dt><dd>{mission.paused ? <Badge>Paused</Badge> : <Badge tone="success">Running {mission.speed}×</Badge>}</dd></div><div><dt>Seed</dt><dd className="mono">{mission.seed}</dd></div></dl>
      </Panel>
      <Panel title="Compartments" eyebrow="Conceptual layout · synthetic telemetry" actions={<button className="button small" onClick={() => go('spacecraft')}>Open Spacecraft</button>}>
        {!mission.compartments.length && <EmptyState title="No compartments in this mission." />}
        <ul className="compartment-list">{mission.compartments.map(room => {
          const occupants = mission.crew.filter(c => c.currentCompartmentId === room.id)
          const flagged = mission.alerts.some(a => a.compartmentId === room.id || occupants.some(c => c.id === a.astronautId))
          return <li key={room.id}><span>{room.label}</span><span className="muted">{occupants.length ? occupants.map(c => c.displayName).join(', ') : 'Unoccupied'}</span>{flagged ? <Badge tone="attention" icon="warning">Review</Badge> : <span />}</li>
        })}</ul>
      </Panel>
    </div>}
  </>
}
