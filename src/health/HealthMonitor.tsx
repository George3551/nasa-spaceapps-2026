import { useState } from 'react'
import type { HealthMeasurement, MetricKey } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { MeasurementCard, MissingMetricTile } from '../app/components/MeasurementCard'
import { Callout, Disclosure, EmptyState, OriginBadge, Provenance, QualityBadge, Time } from '../app/components/ui'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { formatShortTimestamp, humanize, initials, metricLabel, originLabel, qualityLabel, sourceLabel } from '../app/format'
import { measurementRules, validateMeasurement } from '../shared/validation'
import { AssessmentHistory } from './AssessmentHistory'
import { acquisition, Conditions } from './Conditions'

export function ObservationForm({ astronautId }: { astronautId: string }) {
  const { state, dispatch } = useAppState()
  const [metric, setMetric] = useState<MetricKey>('sleep_duration'), [value, setValue] = useState(''), [note, setNote] = useState(''), [error, setError] = useState('')
  const [at, setAt] = useState('')
  const [condition, setCondition] = useState('unspecified')
  const [device, setDevice] = useState(''), [protocol, setProtocol] = useState('')
  const selfReport = ['sleep_duration', 'reported_fatigue', 'reported_mood', 'reported_stress', 'symptom_severity', 'exercise_duration'].includes(metric)
  const rule = measurementRules[metric]!
  return <Panel title="Record an observation" eyebrow={state.scope === 'synthetic' ? 'Manual entry into synthetic scenario' : 'Observed · manual self-report or measurement'} className="form-panel">
    <form className="entry-form" onSubmit={event => {
      event.preventDefault(); setError('')
      try {
        if (!value.trim()) throw new Error('Enter a value. Missing is not zero.')
        if (metric === 'symptom_severity' && !note.trim()) throw new Error('Describe the symptom in the note.')
        const timestamp = at ? new Date(at).toISOString() : state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString()
        const record = validateMeasurement({ id: crypto.randomUUID(), astronautId, metric, value: Number(value), unit: rule.unit, timestamp, source: 'manual', origin: state.scope, quality: 'valid', sourceRefId: 'manual-entry', demonstrationOnly: state.scope === 'synthetic', note: note.trim(), acquisition: acquisition(device.trim() || (selfReport ? 'manual-entry' : 'not_recorded'), protocol.trim() || (selfReport ? `manual-${metric}-v1` : 'not_recorded'), condition) })
        dispatch({ type: 'measurements/upsert', records: [record] }); setValue(''); setNote('')
      } catch (e) { setError(e instanceof Error ? e.message : 'Invalid input') }
    }}>
      {state.scope === 'synthetic' && <Callout tone="synthetic">This entry is saved to the synthetic scenario and labelled demonstration-only. Switch Data to Observed records to log a real self-report.</Callout>}
      <div className="field-row">
        <label className="field">Indicator<select value={metric} onChange={e => setMetric(e.target.value as MetricKey)}>{Object.entries(measurementRules).filter(([key]) => !key.startsWith('cabin_') && key !== 'radiation_dose').map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>
        <label className="field narrow">Value ({rule.unit})<input type="number" step="any" required min={rule.min} max={rule.max} value={value} aria-describedby="value-hint" aria-invalid={error ? true : undefined} onChange={e => setValue(e.target.value)} /></label>
      </div>
      <p className="field-hint" id="value-hint">Accepted entry range {rule.min}–{rule.max} {rule.unit}. This is input validation, not a normal health range.</p>
      <label className="field">Context / symptom / examination note{metric === 'symptom_severity' && <span className="required-tag"> required</span>}<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="For an examination, include the site and source report." /></label>
      <fieldset className="fieldset">
        <legend>Measurement context <span>· needed for qualified baseline comparison</span></legend>
        <Conditions value={condition} onChange={setCondition} />
        <label className="field">Recorded at (optional, local time)<input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
        <label className="field">Declared device identifier (optional)<input maxLength={200} value={device} onChange={e => setDevice(e.target.value)} /></label>
        <label className="field">Measurement protocol / statistic (optional)<input maxLength={200} value={protocol} onChange={e => setProtocol(e.target.value)} /></label>
        <p className="field-hint">For physiological/examination values, record the actual device and measurement method (including the HRV statistic) to qualify a baseline. Unspecified device/method is kept as unknown; no automatic unit conversion. These labels are self-declared.</p>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button primary" type="submit">Save observation</button></div>
    </form>
    <p className="muted small">Units are explicit; entry bounds reject malformed input and are not clinical normal ranges. Mood, stress and fatigue are descriptive 0–10 self-ratings, not validated questionnaires.</p>
  </Panel>
}

function Trend({ records }: { records: HealthMeasurement[] }) {
  const values = records.filter(r => r.value !== null && r.quality !== 'invalid' && r.quality !== 'missing')
  if (!values.length) return <EmptyState title="No available readings for a trend.">Record this indicator at least once to start a history. Gaps represent missing readings.</EmptyState>
  const low = Math.min(...values.map(r => r.value!)), high = Math.max(...values.map(r => r.value!)), span = Math.max(1, high - low)
  const first = Date.parse(records[0]!.timestamp), duration = Math.max(1, Date.parse(records.at(-1)!.timestamp) - first)
  const points = records.map(r => r.value === null || r.quality === 'invalid' || r.quality === 'missing' ? null : { x: 56 + (Date.parse(r.timestamp) - first) / duration * 440, y: 120 - (r.value - low) / span * 85, record: r })
  const mid = (high + low) / 2
  return <figure className="chart">
    <svg className="trend-svg" viewBox="0 0 520 160" role="img" aria-label={`${records[0]?.metric}: ${values.map(r => `${r.value} ${r.unit} at ${r.timestamp}`).join('; ')}`}>
      <g className="chart-grid">{[35, 77.5, 120].map(y => <line key={y} x1="56" x2="500" y1={y} y2={y} />)}</g>
      <g className="chart-axis-label"><text x="48" y="39" textAnchor="end">{high.toFixed(1)}</text><text x="48" y="81" textAnchor="end">{mid.toFixed(1)}</text><text x="48" y="124" textAnchor="end">{low.toFixed(1)}</text>
        <text x="56" y="148">{formatShortTimestamp(records[0]!.timestamp)}</text><text x="500" y="148" textAnchor="end">{formatShortTimestamp(records.at(-1)!.timestamp)}</text></g>
      {points.map((p, index) => { const before = points[index - 1]; return p && <g key={p.record.id}>{before && <line className="chart-line" x1={before.x} x2={p.x} y1={before.y} y2={p.y} />}<circle className="chart-point" cx={p.x} cy={p.y} r="4"><title>{p.record.timestamp}: {p.record.value} {p.record.unit}</title></circle></g> })}
    </svg>
    <figcaption className="muted small">{metricLabel(records[0]!.metric)} in {records[0]?.unit} · last {records.length} entries · gaps represent missing readings.</figcaption>
  </figure>
}

export function HealthMonitor() {
  const { state } = useAppState(), workspace = selectWorkspace(state)
  const crew = workspace.crew.find(c => c.id === state.selectedAstronautId)
  const [metric, setMetric] = useState<MetricKey>('sleep_duration')
  const records = workspace.measurements.filter(r => r.astronautId === crew?.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const latest = (key: MetricKey) => records.filter(r => r.metric === key).at(-1)
  const examinations = (workspace.examinations ?? []).filter(r => r.astronautId === crew?.id).slice(-12).reverse()
  const labs = records.filter(r => r.metric === 'laboratory').slice(-12).reverse()
  const notes = records.filter(r => r.metric === 'bone_mineral_density' || r.note).slice(-12)
  const activities = workspace.activities.filter(a => a.astronautId === crew?.id).slice(-12).reverse()
  const selected = records.filter(r => r.metric === metric).slice(-12)
  return <div className="stack">
    <div className="content-grid health-grid">
      <div className="stack">
        <Panel title={crew?.displayName ?? 'No crew selected'} eyebrow={state.scope === 'synthetic' ? 'Fictional crew · synthetic scenario' : 'Personal observed records · local prototype'}
          description={<>{crew?.role} · {state.scope === 'synthetic' ? 'Baselines are scenario inputs.' : 'Your observed records are separate from all scenario data.'}</>}
          actions={<span className="avatar" aria-hidden="true">{initials(crew?.displayName)}</span>}>
          <div className="metric-grid">{(['resting_heart_rate', 'sleep_duration', 'reported_fatigue'] as const).map(key => {
            const record = latest(key)
            return record ? <MeasurementCard key={key} measurement={record} /> : <MissingMetricTile key={key} metric={key} />
          })}</div>
        </Panel>
        <Panel title="History & individual baseline" eyebrow="Traceable observations"
          actions={<label className="field inline">Trend indicator<select value={metric} onChange={e => setMetric(e.target.value as MetricKey)}>{Object.entries(measurementRules).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>}>
          <Trend records={selected} />
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Latest observations table"><table><caption>Latest observations for {metricLabel(metric)}</caption><thead><tr><th>Time (UTC)</th><th>Value</th><th>Provenance</th></tr></thead><tbody>
            {selected.slice().reverse().map(r => <tr key={r.id}><td><Time value={r.timestamp} /></td><td className="num">{r.value ?? 'No value'} {r.unit}</td><td>{originLabel(r.origin)} · {sourceLabel(r.source)} · {qualityLabel(r.quality)}{r.note && <p className="cell-note">{r.note}</p>}</td></tr>)}
            {!selected.length && <tr><td colSpan={3} className="muted">No entries for this indicator.</td></tr>}
          </tbody></table></div>
          <Disclosure summary="Legacy descriptive summary">
            <p>Legacy descriptive summary: {crew?.baselines[metric]?.toFixed(2) ?? 'Not established'} {crew?.baselines[metric] === undefined ? '' : measurementRules[metric]?.unit}. Conditions were not checked in this legacy summary; do not compare incompatible sources or sessions. Use Integrated Review for qualified baseline comparisons. Demo rules are labelled separately.</p>
          </Disclosure>
        </Panel>
      </div>
      {crew && <ObservationForm astronautId={crew.id} key={`${crew.id}-${state.scope}`} />}
    </div>
    <div className="content-grid three">
      <AssessmentHistory records={(workspace.assessments ?? []).filter(a => a.astronautId === crew?.id)} />
      <Panel title="Activity history" eyebrow="Recorded exercises · source and quality">
        {!activities.length ? <EmptyState title="No recorded exercise sessions." /> : <ul className="record-list history-list">{activities.map(a => <li key={a.id}><div className="record-head"><strong>{humanize(a.kind)}</strong><OriginBadge origin={a.origin} /></div><Provenance><Time value={a.startedAt} short /> · {sourceLabel(a.source)} · {qualityLabel(a.quality)}{a.details?.repetitions !== undefined && ` · ${a.details.repetitions ?? 'Unavailable'} repetitions`}</Provenance></li>)}</ul>}
      </Panel>
      <Panel title="Medical history" eyebrow="Recorded examinations and context">
        <ul className="record-list history-list">
          {examinations.map(r => <li key={r.id}><div className="record-head"><strong>{r.kind.toUpperCase()}</strong><QualityBadge quality={r.quality} /></div><p>{r.summary ?? 'Result unavailable'}</p><Provenance><Time value={r.timestamp} short /> · {originLabel(r.origin)} · {sourceLabel(r.source)}</Provenance></li>)}
          {labs.map(r => <li key={r.id}><div className="record-head"><strong>Lab · {r.analyte}</strong><QualityBadge quality={r.quality} /></div><p className="num">{r.value ?? 'Result unavailable'} {r.unit}</p><Provenance><Time value={r.timestamp} short /> · {originLabel(r.origin)} · {sourceLabel(r.source)}</Provenance></li>)}
          {notes.map(r => <li key={`note-${r.id}`}><div className="record-head"><strong>{metricLabel(r.metric)}</strong><span className="num">{r.value ?? 'No value'} {r.unit}</span></div>{r.note && <p>{r.note}</p>}<Provenance><Time value={r.timestamp} short /> · {originLabel(r.origin)}</Provenance></li>)}
        </ul>
        {!examinations.length && !labs.length && !notes.length && <EmptyState title="No examinations or notes recorded." />}
        {!records.some(r => r.metric === 'bone_mineral_density') && <p className="muted small">No bone-density examination available.</p>}
        <p className="muted small">Bone density is shown only when an examination is recorded. Exercise activity alone does not measure bone loss. Model-based estimates require a separately validated model; none is active.</p>
      </Panel>
    </div>
  </div>
}
