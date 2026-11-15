import { Panel } from '../app/components/Panel'
import { Badge, Callout, PageHeader } from '../app/components/ui'
import { researchSources } from './sources'

const kindLabel = (s: typeof researchSources[number]) => s.kind === 'synthetic_fixture' ? 'Synthetic fixture' : s.kind === 'user_entry' ? 'Authored engineering protocol' : s.providesData ? 'Dataset' : 'Research context'

export function Research() {
  return <><PageHeader title="Research & Sources" description="Research context is distinct from observed data, simulation fixtures and clinical validation. No research dataset has been imported." />
    <Panel title="Rule register" eyebrow="Explicitly unvalidated demonstration heuristics">
      <Callout tone="attention" title="Demonstration rules — not NASA or clinical limits">Every rule below is an engineering test condition and is labelled demonstration-only wherever it produces an alert.</Callout>
      <dl className="rule-list">
        <div><dt className="mono">DEMO-RECOVERY-01</dt><dd>Three recent sleep entries below 6 h plus latest fatigue ≥7/10. Optional reaction comparison: latest mean exceeds the three earlier compatible sessions (matching source, unit, device, protocol and conditions) by 20%.</dd></div>
        <div><dt className="mono">DEMO-ENV-01</dt><dd>CO₂ ≥2000 ppm and contemporaneous symptom entries from at least two occupants. These are engineering test conditions, not NASA or clinical limits.</dd></div>
        <div><dt className="mono">DEMO-MULTI-PERF-01</dt><dd>Sleep −20%, fatigue +2 points, reaction +20% or typing −20% versus compatible baselines; performance/fatigue within 15 minutes.</dd></div>
        <div><dt className="mono">DEMO-MULTI-ENV-01</dt><dd>CO₂ +50% versus compatible baseline with own symptom entry within two minutes. Engineering demonstration choices only; see Integrated Review for freshness, missing data and evidence.</dd></div>
      </dl>
    </Panel>
    <h2 className="section-title">Sources <span className="muted">({researchSources.length})</span></h2>
    <ul className="source-grid research-list">{researchSources.map(s => <li className="source-card" key={s.id}>
      <div className="source-card-head"><Badge tone={s.kind === 'synthetic_fixture' ? 'synthetic' : s.kind === 'user_entry' ? 'neutral' : 'info'}>{kindLabel(s)}</Badge><span className="muted small">{s.access.replace('_', ' ')} reviewed · checked {s.checkedAt}</span></div>
      <h3>{s.title}</h3><p>{s.establishes}</p>
      <p className="muted small"><strong>AEGIS feature:</strong> {s.feature}</p>
      <p className="muted small"><strong>Limitation:</strong> {s.limitation}</p>
      {s.url ? <a className="source-link" href={s.url} target="_blank" rel="noreferrer">Open source ↗</a> : <p className="muted small">Local authored fixture/protocol · no external validation source.</p>}
    </li>)}</ul>
  </>
}
