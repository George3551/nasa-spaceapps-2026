/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Explainable multimodal assessment view.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex; Anthropic Claude Code).
 * Research prototype; deterministic application logic is not a trained clinical diagnostic model.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { BaselineComparison } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { Badge, DemoBadge, Disclosure, EmptyState, PageHeader, Provenance, Time } from '../app/components/ui'
import type { Tone } from '../app/components/ui'
import { Icon } from '../app/components/Icon'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { formatShortTimestamp, humanize, metricLabel, originLabel, qualityLabel, sourceLabel } from '../app/format'
import { assessPerformance } from './intelligence'

const format = (value: number | null | undefined) => value == null ? 'Unavailable' : value.toFixed(2)
const statusTone: Record<BaselineComparison['status'], Tone> = { ready: 'success', missing: 'neutral', insufficient_baseline: 'neutral', invalid: 'critical', stale: 'attention', incompatible: 'attention' }

function ComparisonHistory({ comparison: c }: { comparison: BaselineComparison }) {
  const points = [...c.baselineRecords, ...(c.current ? [c.current] : [])]
  const history = [...new Map([...c.baselineRecords, ...c.history].map(r => [r.id, r])).values()]
  const low = Math.min(...points.map(r => r.value!)), high = Math.max(...points.map(r => r.value!)), span = Math.max(1, high - low)
  const start = points[0] ? Date.parse(points[0].timestamp) : 0, duration = points.at(-1) ? Math.max(1, Date.parse(points.at(-1)!.timestamp) - start) : 1
  return <Disclosure summary="Trend, baseline sources and conditions">
    {points.length > 1 && <svg viewBox="0 0 500 100" className="trend-svg" role="img" aria-label={`Compatible baseline and current trend for ${c.signal}`}><polyline className="chart-line" points={points.map(r => `${20 + (Date.parse(r.timestamp) - start) / duration * 460},${80 - (r.value! - low) / span * 60}`).join(' ')} fill="none" /></svg>}
    <p>Baseline IDs: {c.baselineRecords.map(r => r.id).join(', ') || 'No qualified baseline yet'}. Current session is excluded.</p>
    {c.warnings.length > 0 && <ul className="warning-list">{c.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
    <div className="table-wrap"><table className="performance-table"><caption>Baseline source records and recent history (incompatible historical records never pooled silently)</caption><thead><tr><th>Time / ID</th><th>Value / quality</th><th>Source / acquisition</th></tr></thead><tbody>{history.map(r => <tr key={`${r.id}-${r.signal}`}><td><Time value={r.timestamp} short /><p className="mono muted">{r.id}</p></td><td className="num">{format(r.value)} {r.unit} · {qualityLabel(r.quality)}</td><td>{originLabel(r.origin)} · {sourceLabel(r.source)}<p className="cell-note">{r.acquisition ? `${r.acquisition.deviceId} · ${r.acquisition.protocolId} · ${r.acquisition.condition} · session ${r.acquisition.sessionId}` : 'Acquisition conditions unrecorded'}</p></td></tr>)}</tbody></table></div>
  </Disclosure>
}
export function HumanPerformance() {
  const { state, dispatch } = useAppState(), workspace = selectWorkspace(state)
  const person = workspace.crew.find(c => c.id === state.selectedAstronautId), id = person?.id ?? state.sessionAstronautId
  const assessment = assessPerformance(workspace, id, state.scope, state.scope === 'synthetic' ? workspace.missionTime : new Date().toISOString())
  const examinations = (workspace.examinations ?? []).filter(r => r.astronautId === id)
  const environment = workspace.environment.filter(r => state.scope === 'observed' ? r.astronautId === id : r.compartmentId === person?.currentCompartmentId).slice(-4)
  const ready = assessment.comparisons.filter(c => c.status === 'ready').length
  const go = (section: 'assessments' | 'visual' | 'sensors' | 'events' | 'health') => dispatch({ type: 'navigate', section })
  return <><PageHeader title="Integrated Review" description={<>{person?.displayName} · {state.scope} · evaluated at {formatShortTimestamp(assessment.asOf)}. Combines your records into comparisons against your own earlier compatible sessions. Descriptive research prototype; no diagnosis or universal stress score.</>} />
    <div className="content-grid">
      <Panel title="Integrated assessment" eyebrow={state.scope === 'synthetic' ? 'Synthetic observations and generated baselines' : 'Own observed records · no fabricated history'}>
        {assessment.findings.length ? <ul className="alert-list">{assessment.findings.map(f => <li className="alert-card level-review" key={f.ruleId}><div className="alert-card-head"><DemoBadge>Demonstration only · {f.ruleId}</DemoBadge></div><h3>{f.title}</h3><p>{f.explanation}</p><ul className="evidence-list">{f.evidence.map((e, i) => <li key={`${e.observationId}-${i}`}>{e.explanation}<span className="mono muted">Evidence: {e.observationId}</span></li>)}</ul><div className="callout tone-info"><Icon name="info" /><div><p className="callout-title">Next evaluation</p><div className="callout-body">{f.nextStep}</div></div></div></li>)}</ul>
          : <EmptyState title="No combined finding">No demonstration combination established from available compatible evidence. This is not health clearance; missing modalities and baselines remain visible below.</EmptyState>}
        <Disclosure summary="Engineering rules, freshness and limitations"><ul>{assessment.limitations.map(l => <li key={l}>{l}</li>)}</ul><p>DEMO-MULTI-PERF-01: sleep −20%, fatigue +2 points and reaction +20% or typing −20% against qualified baselines. Performance/fatigue within 15 minutes; sleep within 24 hours. DEMO-MULTI-ENV-01: compartment CO₂ +50% versus compatible baseline and own symptom entry within two minutes. These values are unvalidated demonstration choices, not clinical thresholds or flight limits.</p></Disclosure>
      </Panel>
      <Panel title="Add evidence" eyebrow="Where these inputs come from" description={`${ready} of ${assessment.comparisons.length} indicators have a qualified baseline comparison.`}>
        <ul className="task-list">
          <li><button className="task" onClick={() => go('health')}><span><strong>Log an observation</strong>{' '}<small>Sleep, fatigue, symptoms, vitals</small></span><Icon name="arrow" /></button></li>
          <li><button className="task" onClick={() => go('assessments')}><span><strong>Open Cognitive Tests</strong>{' '}<small>Typing and reaction baselines</small></span><Icon name="arrow" /></button></li>
          {state.scope === 'observed' && <li><button className="task" onClick={() => go('visual')}><span><strong>Open Eye Observation</strong>{' '}<small>Optional camera check</small></span><Icon name="arrow" /></button></li>}
          <li><button className="task" onClick={() => go('sensors')}><span><strong>Record sensor / examination inputs</strong>{' '}<small>Reports and demo packets</small></span><Icon name="arrow" /></button></li>
          <li><button className="task" onClick={() => go('events')}><span><strong>Review alerts and follow-up</strong>{' '}<small>Acknowledge and track cases</small></span><Icon name="arrow" /></button></li>
        </ul>
      </Panel>
    </div>
    <Panel title="Measurements and individual baselines" eyebrow="Three distinct earlier compatible sessions · median comparison" className="secondary-grid">
      <p className="muted small table-hint">On narrow screens, scroll the table horizontally for baseline details.</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable individual baseline comparisons"><table className="performance-table"><caption>Latest usable results; invalid/missing/latest-entry and incompatible-context warnings are explicit.</caption><thead><tr><th>Indicator</th><th>Latest usable result</th><th>Baseline / change</th><th>Availability / history</th></tr></thead><tbody>{assessment.comparisons.map((c, i) => <tr key={`${c.signal}-${i}`}><td><strong>{metricLabel(c.signal)}</strong>{c.current?.analyte && <p className="cell-note">{c.current.analyte}</p>}</td><td className="num">{format(c.current?.value)} {c.current?.unit}<p className="cell-note">{c.current ? <><Time value={c.current.timestamp} short /> · {sourceLabel(c.current.source)} · {originLabel(c.current.origin)} · {qualityLabel(c.current.quality)}</> : 'No data'}</p></td><td className="num">{format(c.baseline)} {c.current?.unit}<p className="cell-note">Δ {format(c.delta)} · {format(c.percentChange)}{c.percentChange === null ? '' : '%'}</p></td><td><Badge tone={statusTone[c.status]}>{humanize(c.status)}</Badge><ComparisonHistory comparison={c} /></td></tr>)}</tbody></table></div>
    </Panel>
    <div className="content-grid secondary-grid"><Panel title="Periodic medical examinations" eyebrow="Source reports · no automatic interpretation">{!examinations.length && <EmptyState title="No ECG/ultrasound reports recorded.">Absence is not a normal examination result.</EmptyState>}<ul className="record-list">{examinations.slice(-12).reverse().map(e => <li key={e.id}><div className="record-head"><strong>{e.kind.toUpperCase()}</strong><Badge>{qualityLabel(e.quality)}</Badge></div><p>{e.summary ?? 'Result unavailable'}</p><Provenance><Time value={e.timestamp} short /> · {sourceLabel(e.source)} · {originLabel(e.origin)}</Provenance><Provenance>{e.acquisition?.deviceId ?? 'Device unrecorded'} · {e.acquisition?.condition ?? 'Conditions unrecorded'}</Provenance></li>)}</ul></Panel>
      <Panel title="Environmental context" eyebrow="Associated records, not a personal exposure model">{!environment.length && <EmptyState title="No associated environmental observations.">Synthetic ship location is not treated as observed exposure.</EmptyState>}<ul className="record-list">{environment.map(r => <li key={r.id}><div className="record-head"><strong>{metricLabel(r.metric)}</strong><span className="num">{format(r.value)} {r.unit}</span></div><Provenance><Time value={r.timestamp} short /> · {sourceLabel(r.source)} · {originLabel(r.origin)} · {qualityLabel(r.quality)} · {r.compartmentId}</Provenance></li>)}</ul></Panel></div>
  </>
}
