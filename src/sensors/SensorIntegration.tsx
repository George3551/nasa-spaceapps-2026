import { useState } from 'react'
import type { ExaminationRecord, SensorBatch } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { Badge, Callout, Disclosure, EmptyState, PageHeader } from '../app/components/ui'
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
  const counts: [string, number][] = [
    ['Numeric records', workspace.measurements.filter(r => r.astronautId === person?.id).length],
    ['Examination records', (workspace.examinations ?? []).filter(r => r.astronautId === person?.id).length],
    ['Environmental records', workspace.environment.filter(r => state.scope === 'synthetic' ? r.compartmentId === person?.currentCompartmentId : r.astronautId === person?.id).length],
  ]
  const examination = <Panel title="Record an existing examination" eyebrow="Observed manual report · no interpretation" description="Enter a report you already have. AEGIS stores it with its provenance; it does not analyse waveforms or images.">
    {state.scope !== 'observed' ? <EmptyState title="Manual examination entry uses observed records">Use the medical demo adapter here, or switch to Observed records for a manually entered examination report.</EmptyState> : <form className="entry-form" onSubmit={e => {
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
      {kind === 'laboratory' && <div className="field-row three"><label className="field">Analyte identifier<input value={analyte} required onChange={e => setAnalyte(e.target.value)} /></label><label className="field">Laboratory unit<input value={unit} required onChange={e => setUnit(e.target.value)} /></label><label className="field">Laboratory value<input type="number" step="any" value={value} disabled={missing} required={!missing} onChange={e => setValue(e.target.value)} /></label></div>}
      <label className="field">Report / examination context<textarea value={summary} required={kind !== 'laboratory' && !missing} maxLength={2000} onChange={e => setSummary(e.target.value)} /></label>
      <label className="check-label"><input type="checkbox" checked={missing} onChange={e => setMissing(e.target.checked)} />Result unavailable — store missing, not zero</label>
      <fieldset className="fieldset">
        <legend>Examination context <span>· optional, self-declared</span></legend>
        <Conditions value={condition} onChange={setCondition} label="Examination conditions" />
        <label className="field">Examination date (optional, local time)<input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} /></label>
        <label className="field">Examination device identifier (optional)<input maxLength={200} value={device} onChange={e => setDevice(e.target.value)} /></label>
        <label className="field">Examination protocol / assay (optional)<input maxLength={200} value={protocol} onChange={e => setProtocol(e.target.value)} /></label>
      </fieldset>
      <div className="form-actions"><button className="button primary" disabled={!person}>Save examination record</button></div>
      <p className="muted small">Only enter non-sensitive test reports in this fictional sandbox. No waveform/image processing, diagnostic interpretation, laboratory reference ranges or unit conversion is performed.</p>
    </form>}
  </Panel>
  const adapters = <Panel title="Synthetic adapter demonstration" eyebrow="Simulator source · not measured physiology">
    {state.scope === 'observed' ? <><Callout tone="synthetic" title="Requires the synthetic workspace">Synthetic sensor data cannot enter observed history. Switch explicitly to the synthetic workspace to demonstrate acquisition.</Callout><div className="form-actions"><button className="button" onClick={() => dispatch({ type: 'scope/set', scope: 'synthetic' })}>Use synthetic workspace for sensor demonstration</button></div></> : <>
      <p className="muted">These buttons collect an additional reproducible demo packet; medical examinations are periodic.</p>
      <ul className="record-list">{syntheticAdapters.map((adapter, i) => <li key={adapter.id} className="adapter-row"><div><strong>{adapter.label}</strong><p className="provenance"><span className="mono">{adapter.id}</span> · {adapter.cadence} · <Badge tone="synthetic">Synthetic</Badge></p></div><button className="button" disabled={busy || !person} onClick={() => void read(i)}>Acquire {adapter.category} demo packet</button></li>)}</ul>
      <Disclosure summary="How continuous channels are sampled"><p>Continuous channels are sampled by the existing mission clock, once per virtual minute. Resume/advance Mission Simulation to append the stream; no second clock is started.</p></Disclosure>
      <div className="form-actions"><button className="button ghost" onClick={() => dispatch({ type: 'navigate', section: 'performance' })}>Review integrated assessment →</button></div>
    </>}
  </Panel>
  return <><PageHeader title="Sensors & Exams" description={<>{person?.displayName} · {state.scope}. No medical hardware is connected. Demo adapters generate labelled fixtures; manual examination entry does not connect a device.</>} />
    {error && <p className="form-error banner" role="alert">{error}</p>}
    <div className="content-grid">{state.scope === 'observed' ? <>{examination}{adapters}</> : <>{adapters}{examination}</>}</div>
    <Panel title="Acquisition inventory" eyebrow="Selected astronaut · current workspace" className="secondary-grid">
      <dl className="coverage">{counts.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
      <p className="muted small">All packets are validated before an atomic reducer action. Replay is idempotent; conflicting IDs are rejected instead of overwriting CV, cognitive or other records. Acquisition labels are declared metadata, not verified hardware calibration.</p>
    </Panel>
  </>
}
