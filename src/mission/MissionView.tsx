import type { MissionViewProps } from '../app/integration/interfaces'
import { Panel } from '../app/components/Panel'
import { Badge, EmptyState, Time } from '../app/components/ui'
import { humanize, metricLabel, originLabel, qualityLabel } from '../app/format'

export function MissionView({ mission, selectedCompartmentId, onSelectAstronaut, onSelectCompartment }: MissionViewProps) {
  const selected = mission.compartments.find(c => c.id === selectedCompartmentId)
  const latest = (id: string, metric: string) => mission.environment.filter(r => r.compartmentId === id && r.metric === metric).at(-1)
  return <div className="content-grid"><Panel title="Spacecraft cutaway" eyebrow="Conceptual layout · synthetic crew and telemetry" description="Select a compartment for its readings. Select a crew member to open their synthetic health profile.">
    <div className="ship-cutaway">
      <svg viewBox="0 0 500 620" preserveAspectRatio="none" aria-hidden="true"><path d="M30 590V140Q35 35 250 10Q465 35 470 140V590Z" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      <div className="ship-decks">{mission.compartments.map(room => {
        const crew = mission.crew.filter(c => c.currentCompartmentId === room.id)
        const alerts = mission.alerts.filter(a => a.compartmentId === room.id || crew.some(c => c.id === a.astronautId))
        const co2 = latest(room.id, 'cabin_co2')
        return <section className={`ship-room ${alerts.length ? 'has-alert' : ''} ${selectedCompartmentId === room.id ? 'is-selected' : ''}`} key={room.id} aria-label={room.label}>
          <button className="room-select" aria-pressed={selectedCompartmentId === room.id} onClick={() => onSelectCompartment(room.id)}><span>{room.label}</span>{alerts.length > 0 && <Badge tone="attention" icon="warning">Review</Badge>}</button>
          <p className="room-reading">CO₂ <span className="num">{co2?.value ?? 'No data'}</span> {co2 ? 'ppm' : ''}</p>
          {crew.map(c => <button className="crew-chip" key={c.id} onClick={() => onSelectAstronaut(c.id)}>{c.displayName} · {mission.activities.filter(a => a.astronautId === c.id).at(-1)?.kind ?? 'unknown'}</button>)}
          {!crew.length && <p className="muted small">Unoccupied</p>}
        </section>
      })}</div>
    </div>
  </Panel><div className="stack"><Panel title={selected?.label ?? 'Compartment details'} eyebrow={selected ? `${humanize(selected.category)} · environment and context` : 'Environment and context'}>
    {!selected && <EmptyState title="No compartment selected">Select a compartment for readings, or an astronaut for their synthetic health profile.</EmptyState>}
    {selected && <><dl className="key-value">{['cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose'].map(metric => { const record = latest(selected.id, metric); return <div key={metric}><dt>{metricLabel(metric)}</dt><dd><span className="num">{record?.value ?? 'No data'} {record?.unit}</span>{record && <p className="provenance"><Time value={record.timestamp} short /> · {originLabel(record.origin)} · {qualityLabel(record.quality)}</p>}</dd></div> })}</dl><p className="muted small">Conceptual rooms, not an authentic Starship design. Clicking a crew member opens only the synthetic profile in Mission Overview.</p></>}
  </Panel><Panel title="Recent mission events" eyebrow="Synthetic · latest 6">
    {!mission.events.length && <EmptyState title="No events yet.">Resume or advance the simulator to generate events.</EmptyState>}
    <ul className="record-list">{mission.events.slice(-6).reverse().map(e => <li key={e.id}><p>{e.summary}</p><p className="provenance"><Time value={e.at} short /></p></li>)}</ul>
  </Panel></div></div>
}
