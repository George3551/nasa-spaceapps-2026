import type { ModuleViews } from '../integration/interfaces'
import { fixtureSource } from '../integration/fixtures'
import { useAppState } from '../state/context'
import { MeasurementCard } from '../components/MeasurementCard'
import { ModulePlaceholder, Panel } from '../components/Panel'

export function CrewHealth({ modules }: { modules: ModuleViews }) {
  const { state, dispatch } = useAppState()
  const { mission, selectedAstronautId } = state
  const Health = modules.health, Anatomy = modules.anatomy, Vision = modules.vision
  const crew = mission.crew.find(person => person.id === selectedAstronautId)
  return <><div className="page-intro"><div><p className="eyebrow">Crew Health / Personal monitor</p><h1>My Health</h1><p className="muted">Review the source, timestamp and availability of each observation.</p></div>
    <label className="select-label">Crew member<select value={selectedAstronautId ?? ''} onChange={event => dispatch({ type: 'crew/select', id: event.target.value })}>{!mission.crew.length && <option value="">No crew available</option>}{mission.crew.map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label></div>
    {Health ? <Health mission={mission} astronautId={selectedAstronautId} onMeasurementAdded={record => dispatch({ type: 'measurements/upsert', records: [record] })} onAcknowledgeAlert={id => dispatch({ type: 'alerts/acknowledge', id })} /> : <Panel title={crew?.displayName ?? 'No crew selected'} eyebrow="Synthetic integration profile">
      <p className="muted">{crew?.role ?? 'Profile unavailable'} · {crew?.syntheticIdentity ? 'Fictional identity' : 'Identity provenance supplied by module'}</p>
      <p className="sample-note">Baseline not established. Trends and manual entry await the health module.</p>
      <div className="health-observations">{mission.measurements.filter(record => record.astronautId === selectedAstronautId).map(record => <MeasurementCard key={record.id} measurement={record} source={record.sourceRefId === fixtureSource.id ? fixtureSource : undefined} />)}</div>
      {!mission.measurements.some(record => record.astronautId === selectedAstronautId) && <p className="empty-copy">No measurements available. Health status unknown.</p>}
    </Panel>}
    <div className="content-grid secondary-grid">{Anatomy ? <Anatomy mission={mission} astronautId={selectedAstronautId} /> : <ModulePlaceholder name="Body overview" owner="src/anatomy/">Anatomical navigation will connect to this profile's available observations.</ModulePlaceholder>}
      {Vision ? <Vision astronautId={selectedAstronautId} onActivityAdded={record => dispatch({ type: 'activities/upsert', records: [record] })} /> : <ModulePlaceholder name="Exercise check" owner="src/vision/">Camera off. No camera permission is requested by the foundation.</ModulePlaceholder>}</div>
  </>
}
