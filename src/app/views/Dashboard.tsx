import { useAppState } from '../state/context'
import { fixtureSource } from '../integration/fixtures'
import { MeasurementCard } from '../components/MeasurementCard'
import { Panel } from '../components/Panel'

export function Dashboard() {
  const { state, dispatch } = useAppState()
  const crew = state.mission.crew.find(person => person.id === state.selectedAstronautId)
  const measurement = state.mission.measurements.find(record => record.astronautId === crew?.id)
  return <>
    <div className="page-intro"><div><p className="eyebrow">Mission dashboard / Integration milestone 01</p><h1>A clear view of crew health.</h1>
      <p className="muted">One shared mission state. Traceable observations. Crew-first decisions.</p></div>
      <button className="button primary" onClick={() => dispatch({ type: 'navigate', section: 'health' })}>Check My Health <span aria-hidden="true">↗</span></button>
    </div>
    <div className="summary-grid">
      <div className="summary"><p className="eyebrow">Crew profiles</p><strong>{state.mission.crew.length.toString().padStart(2, '0')}</strong><p>Synthetic integration fixture</p></div>
      <div className="summary"><p className="eyebrow">Health observations</p><strong>{state.mission.measurements.length.toString().padStart(2, '0')}</strong><p>Typed canonical records</p></div>
      <div className="summary"><p className="eyebrow">Assessment engine</p><strong className="text-label">Not connected</strong><p>Health status not assessed</p></div>
    </div>
    <div className="content-grid"><Panel title="Personal health snapshot" eyebrow="Astronaut-facing workflow">
      <div className="crew-heading"><div className="avatar" aria-hidden="true">{crew?.displayName.split(' ').map(part => part[0]).slice(0, 2).join('') ?? '—'}</div><div><h3>{crew?.displayName ?? 'No crew selected'}</h3><p className="muted">{crew?.role ?? 'Profile unavailable'} · {crew?.syntheticIdentity ? 'Fictional identity' : 'Identity provenance supplied by module'}</p></div></div>
      {measurement ? <MeasurementCard measurement={measurement} source={measurement.sourceRefId === fixtureSource.id ? fixtureSource : undefined} /> : <p className="empty-copy">No measurements available.</p>}
    </Panel>
    <div className="stack"><Panel title="Foundation readiness" eyebrow="System architecture">
      <ul className="readiness"><li><span className="status-dot" />Application shell <span>Ready</span></li><li><span className="status-dot" />Canonical contracts <span>Connected</span></li><li><span className="status-dot" />Shared state <span>Connected</span></li><li><span className="status-dot pending" />Domain modules <span>Pending</span></li></ul>
    </Panel><Panel title="Next integration" eyebrow="Team handoff"><p className="muted">Connect the health view and simulation through typed adapters. This sample does not run a clock, evaluate health, or access a camera.</p><button className="text-button" onClick={() => dispatch({ type: 'navigate', section: 'simulation' })}>View simulation workspace →</button></Panel></div></div>
  </>
}
