import { useState } from 'react'
import type { ExaminationRecord, SensorBatch } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { acquisition, Conditions } from '../health/Conditions'
import { syntheticAdapters } from './adapters'
import { acquire } from './ingestion'

export function SensorIntegration() {
  const { state, dispatch } = useAppState(), workspace = selectWorkspace(state)
  const person = workspace.crew.find(c => c.id === state.selectedAstronautId)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [sequence, setSequence] = useState(1)
  const [device, setDevice] = useState(''), [protocol, setProtocol] = useState(''), [recordedAt, setRecordedAt] = useState('')
  const [kind, setKind] = useState<'ecg' | 'ultrasound' | 'laboratory'>('ecg'), [summary, setSummary] = useState(''), [value, setValue] = useState(''), [analyte, setAnalyte] = useState('glucose'), [unit, setUnit] = useState('mmol/L'), [missing, setMissing] = useState(false), [condition, setCondition] = useState('unspecified')
  async function read(index: number) {
    if (!person || state.scope !== 'synthetic') return
    setBusy(true); setError('')
    try {
      const batch = await acquire(syntheticAdapters[index]!, { astronautId: person.id, compartmentId: person.currentCompartmentId, timestamp: workspace.missionTime, seed: state.mission.seed + sequence })
      dispatch({ type: 'sensors/ingest', batch }); setSequence(n => n + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Acquisition failed') }
    finally { setBusy(false) }
  }
  return <><div className="page-intro"><div><p className="eyebrow">Acquisition adapters · canonical records</p><h1>Sensor Integration</h1><p className="muted">{person?.displayName} · {state.scope}. No medical hardware is connected. Demo adapters generate labelled fixtures; manual examination entry does not connect a device.</p></div></div>
    <div className="content-grid"><Panel title="Synthetic adapter demonstration" eyebrow="Simulator source · not measured physiology">
      {state.scope === 'observed' ? <><p className="empty-copy">Synthetic sensor data cannot enter observed history. Switch explicitly to the synthetic workspace to demonstrate acquisition.</p><button className="button" onClick={() => dispatch({ type: 'scope/set', scope: 'synthetic' })}>Use synthetic workspace for sensor demonstration</button></> : <><p className="muted">Continuous channels are sampled by the existing mission clock, once per virtual minute. Resume/advance Mission Simulation to append the stream; no second clock is started. These buttons collect an additional reproducible demo packet; medical examinations are periodic.</p>{syntheticAdapters.map((adapter, i) => <div className="event-item" key={adapter.id}><h3>{adapter.label}</h3><p>{adapter.id} · {adapter.cadence} · synthetic</p><button className="button" disabled={busy || !person} onClick={() => void read(i)}>Acquire {adapter.category} demo packet</button></div>)}<button className="text-button" onClick={() => dispatch({ type: 'navigate', section: 'performance' })}>Review integrated assessment</button></>}
      {error && <p role="alert">{error}</p>}
    </Panel><Panel title="Record an existing examination" eyebrow="Observed manual report · no interpretation">
      {state.scope !== 'observed' ? <p className="empty-copy">Use the medical demo adapter here, or switch to Observed records for a manually entered examination report.</p> : <form className="entry-form" onSubmit={e => {
        e.preventDefault(); if (!person) return; setError('')
        const timestamp = recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(), id = crypto.randomUUID()
        const context = acquisition(device.trim() || 'not_recorded', protocol.trim() || 'not_recorded', condition, id)
        const batch: SensorBatch = { measurements: [], environment: [], examinations: [] }
        if (kind === 'laboratory') batch.measurements.push({ id, astronautId: person.id, metric: 'laboratory', analyte: analyte.trim(), value: missing ? null : value.trim() ? Number(value) : NaN, unit: unit.trim(), timestamp, source: 'manual', origin: 'observed', quality: missing ? 'missing' : 'valid', acquisition: context, sourceRefId: 'manual-entry', note: summary.trim() })
        else {
          const record: ExaminationRecord = { id, astronautId: person.id, kind, summary: missing ? null : summary.trim(), timestamp, source: 'manual', origin: 'observed', quality: missing ? 'missing' : 'valid', unit: 'report', sourceRefIds: ['manual-entry'], demonstrationOnly: false, acquisition: context }
          batch.examinations.push(record)
        }
        dispatch({ type: 'sensors/ingest', batch })
      }}>
        <label className="field">Examination type<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="ecg">ECG report</option><option value="ultrasound">Ultrasound report</option><option value="laboratory">Laboratory measurement</option></select></label>
        {kind === 'laboratory' && <><label className="field">Analyte identifier<input value={analyte} required onChange={e => setAnalyte(e.target.value)} /></label><label className="field">Laboratory unit<input value={unit} required onChange={e => setUnit(e.target.value)} /></label><label className="field">Laboratory value<input type="number" step="any" value={value} disabled={missing} required={!missing} onChange={e => setValue(e.target.value)} /></label></>}
        <label className="field">Report / examination context<textarea value={summary} required={kind !== 'laboratory' && !missing} maxLength={2000} onChange={e => setSummary(e.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={missing} onChange={e => setMissing(e.target.checked)} />Result unavailable — store missing, not zero</label>
        <Conditions value={condition} onChange={setCondition} label="Examination conditions" />
        <label className="field">Examination date (optional, local time)<input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} /></label>
        <label className="field">Examination device identifier (optional)<input maxLength={200} value={device} onChange={e => setDevice(e.target.value)} /></label>
        <label className="field">Examination protocol / assay (optional)<input maxLength={200} value={protocol} onChange={e => setProtocol(e.target.value)} /></label>
        <button className="button" disabled={!person}>Save examination record</button><p className="sample-note">Only enter non-sensitive test reports in this fictional sandbox. No waveform/image processing, diagnostic interpretation, laboratory reference ranges or unit conversion is performed.</p>
      </form>}
    </Panel></div>
    <Panel title="Acquisition inventory" eyebrow="Selected astronaut · current workspace"><p>{workspace.measurements.filter(r => r.astronautId === person?.id).length} numeric records · {(workspace.examinations ?? []).filter(r => r.astronautId === person?.id).length} examination records · {workspace.environment.filter(r => state.scope === 'synthetic' ? r.compartmentId === person?.currentCompartmentId : r.astronautId === person?.id).length} environmental records.</p><p className="sample-note">All packets are validated before an atomic reducer action. Replay is idempotent; conflicting IDs are rejected instead of overwriting CV, cognitive or other records. Acquisition labels are declared metadata, not verified hardware calibration.</p></Panel>
  </>
}
