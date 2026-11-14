import { useAppState } from '../state/context'
import { fixtureSource } from '../integration/fixtures'
import { MeasurementCard } from '../components/MeasurementCard'
import { Panel } from '../components/Panel'
import { selectWorkspace } from '../state/reducer'
import { MissionView } from '../../mission/MissionView'

export function Dashboard() {
  const { state, dispatch } = useAppState()
  const mission = selectWorkspace(state)
  const crew = mission.crew.find(person => person.id === state.selectedAstronautId)
  const measurement = mission.measurements.filter(record => record.astronautId === crew?.id).at(-1)
  return <>
    <div className="page-intro"><div><p className="eyebrow">{state.mode === 'mission' ? 'Mission overview / Synthetic simulation' : 'Personal health / Daily overview'}</p><h1>A clear view of crew health.</h1>
      <p className="muted">One shared mission state. Traceable observations. Crew-first decisions.</p></div>
      <button className="button primary" onClick={() => dispatch({ type: 'navigate', section: 'health' })}>Check My Health <span aria-hidden="true">↗</span></button>
    </div>
    <div className="summary-grid">
      <div className="summary"><p className="eyebrow">Accessible profiles</p><strong>{mission.crew.length.toString().padStart(2, '0')}</strong><p>{state.scope} workspace</p></div>
      <div className="summary"><p className="eyebrow">Health observations</p><strong>{mission.measurements.length}</strong><p>Source-labelled records</p></div>
      <div className="summary"><p className="eyebrow">Detection history</p><strong>{mission.alerts.length}</strong><p>Demonstration rules · inspect evidence</p></div>
    </div>
    <div className="content-grid"><Panel title="Personal health snapshot" eyebrow="Astronaut-facing workflow">
      <div className="crew-heading"><div className="avatar" aria-hidden="true">{crew?.displayName.split(' ').map(part => part[0]).slice(0, 2).join('') ?? '—'}</div><div><h3>{crew?.displayName ?? 'No crew selected'}</h3><p className="muted">{crew?.role ?? 'Profile unavailable'} · {crew?.syntheticIdentity ? 'Fictional identity' : 'Identity provenance supplied by module'}</p></div></div>
      {measurement ? <MeasurementCard measurement={measurement} source={measurement.sourceRefId === fixtureSource.id ? fixtureSource : undefined} /> : <p className="empty-copy">No measurements available.</p>}
    </Panel>
    <div className="stack"><Panel title="Foundation readiness" eyebrow="System architecture">
      <ul className="readiness"><li><span className="status-dot" />Observation collection <span>Connected</span></li><li><span className="status-dot" />Explainable demo rules <span>Connected</span></li><li><span className="status-dot" />Clinical follow-up <span>Connected</span></li><li><span className="status-dot" />Camera <span>Off · optional</span></li></ul>
    </Panel><Panel title="Next checks" eyebrow="Gather → evaluate → explain → act → follow up"><p className="muted">Review your observations, run an assessment or inspect a case. Observed results remain separate from synthetic scenarios.</p><button className="text-button" onClick={() => dispatch({ type: 'navigate', section: 'events' })}>Review alerts & follow-up →</button></Panel></div></div>
    {state.mode === 'mission' && <div className="secondary-grid"><MissionView mission={mission} selectedAstronautId={state.selectedAstronautId} selectedCompartmentId={state.selectedCompartmentId} onSelectAstronaut={id => dispatch({ type: 'crew/select', id })} onSelectCompartment={id => dispatch({ type: 'compartment/select', id })} /></div>}
  </>
}
