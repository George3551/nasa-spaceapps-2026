import { useState } from 'react'
import type { HealthMeasurement, MetricKey } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { MeasurementCard } from '../app/components/MeasurementCard'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { measurementRules, validateMeasurement } from '../shared/validation'

export function ObservationForm({ astronautId }: { astronautId: string }) {
  const { state, dispatch } = useAppState()
  const [metric, setMetric] = useState<MetricKey>('sleep_duration'), [value, setValue] = useState(''), [note, setNote] = useState(''), [error, setError] = useState('')
  const [at, setAt] = useState('')
  const rule = measurementRules[metric]!
  return <Panel title="Record an observation" eyebrow={state.scope === 'synthetic' ? 'Manual entry into synthetic scenario' : 'Observed · manual self-report or measurement'}>
    <form className="entry-form" onSubmit={event => {
      event.preventDefault(); setError('')
      try {
        if (!value.trim()) throw new Error('Enter a value. Missing is not zero.')
        if (metric === 'symptom_severity' && !note.trim()) throw new Error('Describe the symptom in the note.')
        const timestamp = at ? new Date(at).toISOString() : state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString()
        const record = validateMeasurement({ id: crypto.randomUUID(), astronautId, metric, value: Number(value), unit: rule.unit, timestamp, source: 'manual', origin: state.scope, quality: 'valid', sourceRefId: 'manual-entry', demonstrationOnly: state.scope === 'synthetic', note: note.trim() })
        dispatch({ type: 'measurements/upsert', records: [record] }); setValue(''); setNote('')
      } catch (e) { setError(e instanceof Error ? e.message : 'Invalid input') }
    }}>
      <label className="field">Indicator<select value={metric} onChange={e => setMetric(e.target.value as MetricKey)}>{Object.entries(measurementRules).filter(([key]) => !key.startsWith('cabin_') && key !== 'radiation_dose').map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>
      <label className="field">Value ({rule.unit})<input type="number" step="any" required min={rule.min} max={rule.max} value={value} onChange={e => setValue(e.target.value)} /></label>
      <label className="field">Recorded at (optional, local time)<input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
      <label className="field">Context / symptom / examination note<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="For an examination, include the site and source report." /></label>
      <button className="button primary" type="submit">Save observation</button>
      {error && <p role="alert">{error}</p>}
    </form>
    <p className="sample-note">Units are explicit; entry bounds reject malformed input and are not clinical normal ranges. Mood, stress and fatigue are descriptive 0–10 self-ratings, not validated questionnaires.</p>
  </Panel>
}

function Trend({ records }: { records: HealthMeasurement[] }) {
  const values = records.filter(r => r.value !== null && r.quality !== 'invalid' && r.quality !== 'missing')
  if (!values.length) return <p className="empty-copy">No available readings for a trend.</p>
  const low = Math.min(...values.map(r => r.value!)), high = Math.max(...values.map(r => r.value!)), span = Math.max(1, high - low)
  const first = Date.parse(records[0]!.timestamp), duration = Math.max(1, Date.parse(records.at(-1)!.timestamp) - first)
  const points = records.map(r => r.value === null || r.quality === 'invalid' || r.quality === 'missing' ? null : { x: 40 + (Date.parse(r.timestamp) - first) / duration * 440, y: 120 - (r.value - low) / span * 85, record: r })
  return <><svg className="trend-svg" viewBox="0 0 520 150" role="img" aria-label={`${records[0]?.metric}: ${values.map(r => `${r.value} ${r.unit} at ${r.timestamp}`).join('; ')}`}>
    <line x1="40" x2="480" y1="125" y2="125" stroke="currentColor" opacity=".3" />
    {points.map((p, index) => { const before = points[index - 1]; return p && <g key={p.record.id}>{before && <line x1={before.x} x2={p.x} y1={before.y} y2={p.y} stroke="#a8d8ce" strokeWidth="2" />}<circle cx={p.x} cy={p.y} r="4" fill="#a8d8ce"><title>{p.record.timestamp}: {p.record.value} {p.record.unit}</title></circle></g> })}
    <text x="4" y="36" fill="currentColor" fontSize="12">{high.toFixed(1)}</text><text x="4" y="120" fill="currentColor" fontSize="12">{low.toFixed(1)}</text><text x="40" y="145" fill="currentColor" fontSize="12">Time →</text><text x="480" y="145" fill="currentColor" textAnchor="end" fontSize="12">{records[0]?.unit}</text>
  </svg><p className="muted">{records[0]?.timestamp} → {records.at(-1)?.timestamp}. Gaps represent missing readings.</p></>
}

export function HealthMonitor() {
  const { state } = useAppState(), workspace = selectWorkspace(state)
  const crew = workspace.crew.find(c => c.id === state.selectedAstronautId)
  const [metric, setMetric] = useState<MetricKey>('sleep_duration')
  const records = workspace.measurements.filter(r => r.astronautId === crew?.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const latest = (key: MetricKey) => records.filter(r => r.metric === key).at(-1)
  return <div className="stack">
    <Panel title={crew?.displayName ?? 'No crew selected'} eyebrow={state.scope === 'synthetic' ? 'Fictional crew · synthetic scenario' : 'Personal observed records · local prototype'}>
      <p className="muted">{crew?.role} · {state.scope === 'synthetic' ? 'Baselines are scenario inputs.' : 'Your observed records are separate from all scenario data.'}</p>
      <div className="metric-grid">{(['resting_heart_rate', 'sleep_duration', 'reported_fatigue'] as const).map(key => {
        const record = latest(key)
        return record ? <MeasurementCard key={key} measurement={record} /> : <div className="measurement" key={key}><p className="eyebrow">{key.replaceAll('_', ' ')}</p><p className="missing-value">No data</p><p className="muted">Not assessed</p></div>
      })}</div>
    </Panel>
    <div className="content-grid"><Panel title="History & individual baseline" eyebrow="Traceable observations">
      <label className="field">Trend indicator<select value={metric} onChange={e => setMetric(e.target.value as MetricKey)}>{Object.entries(measurementRules).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>
      <p className="sample-note">Baseline: {crew?.baselines[metric]?.toFixed(2) ?? 'Not established'} {crew?.baselines[metric] === undefined ? '' : measurementRules[metric]?.unit}. {state.scope === 'observed' ? 'Descriptive mean of the first three same-unit valid observations; compare only similar conditions.' : 'Scenario-provided comparison.'} Demo rules are labelled separately.</p>
      <Trend records={records.filter(r => r.metric === metric).slice(-12)} />
      <div className="table-wrap"><table><caption>Latest observations for {metric.replaceAll('_', ' ')}</caption><thead><tr><th>Time (UTC)</th><th>Value</th><th>Origin / source / quality</th></tr></thead><tbody>{records.filter(r => r.metric === metric).slice(-12).reverse().map(r => <tr key={r.id}><td>{r.timestamp}</td><td>{r.value ?? 'No data'} {r.unit}</td><td>{r.origin} / {r.source} / {r.quality}{r.note && <p>{r.note}</p>}</td></tr>)}</tbody></table></div>
    </Panel>{crew && <ObservationForm astronautId={crew.id} key={`${crew.id}-${state.scope}`} />}</div>
    <Panel title="Medical history" eyebrow="Recorded examinations and context">
      <p className="muted">Bone density is shown only when an examination is recorded. Exercise activity alone does not measure bone loss. Model-based estimates require a separately validated model; none is active.</p>
      {records.filter(r => r.metric === 'bone_mineral_density' || r.note).slice(-12).map(r => <p className="event-item" key={r.id}>{r.timestamp} · {r.metric.replaceAll('_', ' ')} · {r.value ?? 'No data'} {r.unit} · {r.origin} · {r.note}</p>)}
      {!records.some(r => r.metric === 'bone_mineral_density') && <p className="empty-copy">No bone-density examination available.</p>}
    </Panel>
  </div>
}
