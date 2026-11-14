import type { MissionViewProps } from '../app/integration/interfaces'
import { Panel } from '../app/components/Panel'

export function MissionView({ mission, selectedCompartmentId, onSelectAstronaut, onSelectCompartment }: MissionViewProps) {
  const selected = mission.compartments.find(c => c.id === selectedCompartmentId)
  const latest = (id: string, metric: string) => mission.environment.filter(r => r.compartmentId === id && r.metric === metric).at(-1)
  return <div className="content-grid"><Panel title="Spacecraft cutaway" eyebrow="Conceptual layout · synthetic crew and telemetry">
    <div className="ship-cutaway">
      <svg viewBox="0 0 500 620" preserveAspectRatio="none" aria-hidden="true"><path d="M30 590V140Q35 35 250 10Q465 35 470 140V590Z" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      <div className="ship-decks">{mission.compartments.map(room => {
        const crew = mission.crew.filter(c => c.currentCompartmentId === room.id)
        const alerts = mission.alerts.filter(a => a.compartmentId === room.id || crew.some(c => c.id === a.astronautId))
        return <section className={`ship-room ${alerts.length ? 'has-alert' : ''}`} key={room.id} aria-label={room.label}>
          <button className="room-select" aria-pressed={selectedCompartmentId === room.id} onClick={() => onSelectCompartment(room.id)}>{room.label} {alerts.length > 0 ? '⚠ Review' : ''}</button>
          <p className="muted">CO₂ {latest(room.id, 'cabin_co2')?.value ?? 'No data'} ppm</p>
          {crew.map(c => <button className="crew-chip" key={c.id} onClick={() => onSelectAstronaut(c.id)}>{c.displayName} · {mission.activities.filter(a => a.astronautId === c.id).at(-1)?.kind ?? 'unknown'}</button>)}
          {!crew.length && <p className="muted">Unoccupied</p>}
        </section>
      })}</div>
    </div>
  </Panel><Panel title={selected?.label ?? 'Compartment details'} eyebrow="Environment and context">
    {!selected && <p className="empty-copy">Select a compartment for readings, or an astronaut for their synthetic health profile.</p>}
    {selected && <><dl className="metadata">{['cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose'].map(metric => { const record = latest(selected.id, metric); return <div key={metric}><dt>{metric.replaceAll('_', ' ')}</dt><dd>{record?.value ?? 'No data'} {record?.unit}<p className="muted">{record?.timestamp} · {record?.origin} · {record?.quality}</p></dd></div> })}</dl><p className="sample-note">Conceptual rooms, not an authentic Starship design. Clicking a crew member opens only the synthetic profile in Mission Overview.</p></>}
    <div className="history-list">{mission.events.slice(-6).reverse().map(e => <p className="event-item" key={e.id}>{e.at} · {e.summary}</p>)}</div>
  </Panel></div>
}
