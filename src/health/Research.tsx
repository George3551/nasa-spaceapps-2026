import { Panel } from '../app/components/Panel'
import { researchSources } from './sources'

export function Research() {
  return <><div className="page-intro"><div><p className="eyebrow">Scientific traceability</p><h1>Research & limitations</h1><p className="muted">Research context is distinct from observed data, simulation fixtures and clinical validation. No research dataset has been imported.</p></div></div>
    <Panel title="Rule register" eyebrow="Explicitly unvalidated demonstration heuristics"><p className="empty-copy">DEMO-RECOVERY-01: three recent sleep entries below 6 h plus latest fatigue ≥7/10. Optional reaction comparison: latest mean exceeds the first three same-origin sessions by 20%. DEMO-ENV-01: CO₂ ≥2000 ppm and contemporaneous symptom entries from at least two occupants. These are engineering test conditions, not NASA or clinical limits.</p></Panel>
    <div className="stack research-list">{researchSources.map(s => <Panel key={s.id} title={s.title} eyebrow={`${s.access.replace('_', ' ')} reviewed · ${s.providesData ? 'Dataset' : 'Research context'} · checked ${s.checkedAt}`}><p>{s.establishes}</p><p className="muted">AEGIS feature: {s.feature}</p><p className="sample-note">{s.limitation}</p><a className="source-link" href={s.url} target="_blank" rel="noreferrer">Open source ↗</a></Panel>)}</div>
  </>
}
