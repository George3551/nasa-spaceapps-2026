import { useState } from 'react'
import type { MetricKey } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import { AssessmentHistory } from '../health/AssessmentHistory'

const systems: { id: string; name: string; metrics: MetricKey[]; note: string }[] = [
  { id: 'cardiovascular', name: 'Cardiovascular', metrics: ['heart_rate', 'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate_variability'], note: 'Heart rate and blood pressure are records, not an image of the heart. Compare historical values with context; no cardiovascular diagnosis is inferred.' },
  { id: 'musculoskeletal', name: 'Musculoskeletal', metrics: ['exercise_duration', 'exercise_repetitions', 'movement_range', 'bone_mineral_density'], note: 'Exercise and projected elbow angles describe movement. Bone density is available only from a separately recorded examination, never from the camera.' },
  { id: 'cognitive', name: 'Nervous / Cognitive', metrics: ['sleep_duration', 'reported_fatigue', 'reported_stress', 'reported_mood', 'visual_fatigue'], note: 'Sleep, self-reports and task performance provide context. Eyelid measurements are experimental and do not diagnose fatigue, neurological or psychological conditions.' },
  { id: 'respiratory', name: 'Respiratory / Environment', metrics: ['oxygen_saturation', 'cabin_co2', 'cabin_pressure', 'cabin_temperature', 'symptom_severity'], note: 'Environmental records describe the selected astronaut’s current compartment in the synthetic preview. They are not personal absorbed exposure or a respiratory diagnosis. Symptoms require their recorded context.' },
  { id: 'radiation', name: 'Radiation', metrics: ['radiation_dose'], note: 'Recorded dose values retain their units and source. They are not summed across incompatible or overlapping records. No organ damage or cancer risk is calculated.' },
]
export function Anatomy() {
  const { state } = useAppState(), workspace = selectWorkspace(state)
  const [selected, setSelected] = useState('cardiovascular')
  const system = systems.find(s => s.id === selected)!
  const person = workspace.crew.find(c => c.id === state.selectedAstronautId)
  const records = workspace.measurements.filter(r => r.astronautId === person?.id && system.metrics.includes(r.metric)).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const environment = ['respiratory', 'radiation'].includes(selected) ? workspace.environment.filter(r => r.compartmentId === person?.currentCompartmentId && system.metrics.includes(r.metric)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : []
  const assessments = (workspace.assessments ?? []).filter(r => r.astronautId === person?.id && (selected === 'musculoskeletal' ? r.kind === 'physical' : selected === 'cognitive' ? ['typing', 'reaction', 'procedure', 'visual'].includes(r.kind) : false))
  const activities = selected === 'musculoskeletal' ? workspace.activities.filter(r => r.astronautId === person?.id && r.kind === 'exercise') : []
  return <><div className="page-intro"><div><p className="eyebrow">Record explorer · {state.scope} workspace</p><h1>Anatomy</h1><p className="muted">{person?.displayName ?? 'No astronaut selected'} · Schematic anatomy, not diagnostic imaging. Highlight indicates selection, not disease.</p></div></div>
    <div className="anatomy-layout"><Panel title="Explore a system" eyebrow="Supporting observations">
      <div className="system-buttons">{systems.map(s => <button className="button" key={s.id} aria-pressed={selected === s.id} onClick={() => setSelected(s.id)}>{s.name}</button>)}</div>
      <svg className="anatomy-svg" viewBox="0 0 320 500" role="img" aria-label={`Schematic body overview: ${system.name} selected. No diagnostic findings.`}>
        <g fill="#1d3039" stroke="#66828b" strokeWidth="2"><circle cx="160" cy="54" r="32" /><path d="M140 86 L140 108 Q114 108 106 132 L70 269 Q69 283 81 285 L93 280 L126 174 L127 278 L116 451 Q115 467 132 467 L146 456 L160 317 L174 456 Q185 474 201 464 L193 278 L194 174 L227 280 Q246 292 250 272 L214 132 Q206 108 180 108 L180 86 Z" /></g>
        <g className={selected === 'cardiovascular' ? 'system-active' : 'system-muted'} fill="currentColor" stroke="currentColor" strokeWidth="4"><path d="M160 146 C140 124 129 151 160 177 C191 151 180 124 160 146" /><path fill="none" d="M160 177 V287 M160 218 L130 176 M160 218 L190 176 M160 287 L133 423 M160 287 L187 423" /></g>
        <g className={selected === 'musculoskeletal' ? 'system-active' : 'system-muted'} stroke="currentColor" strokeWidth="7" strokeLinecap="round"><path d="M160 99 V281 M125 133 L109 203 L85 265 M195 133 L211 203 L235 265 M139 290 L133 361 L129 447 M181 290 L187 361 L191 447 M129 282 H191" fill="none" /></g>
        <g className={selected === 'cognitive' ? 'system-active' : 'system-muted'} stroke="currentColor" fill="none" strokeWidth="4"><path d="M143 38 Q126 49 142 67 Q151 82 160 67 Q175 80 183 62 Q197 44 177 36 Q165 25 160 39 Q151 25 143 38 Z M160 83 V274 M160 184 L126 219 M160 184 L194 219" /></g>
        <g className={selected === 'respiratory' ? 'system-active' : 'system-muted'} stroke="currentColor" fill="currentColor" opacity=".8"><path d="M151 124 Q126 129 128 185 Q146 193 151 179 Z M169 124 Q194 129 192 185 Q174 193 169 179 Z" /><path d="M160 101 V144 M160 137 L144 153 M160 137 L176 153" strokeWidth="4" fill="none" /></g>
        <g className={selected === 'radiation' ? 'system-active' : 'system-muted'} stroke="currentColor" strokeWidth="3" fill="none"><path d="M40 49 L70 73 L52 83 L84 108 M280 49 L250 73 L268 83 L236 108" /><circle cx="160" cy="240" r="113" strokeDasharray="4 9" /></g>
        <text x="160" y="494" textAnchor="middle" fill="#b9c9cd" fontSize="12">Illustrative system map · no medical imaging</text>
      </svg>
    </Panel><div className="stack"><Panel title={system.name} eyebrow={`${records.length + environment.length} observation records`}><p className="muted">{system.note}</p>
      {!records.length && !environment.length && <p className="empty-copy">No supporting measurement data in this workspace. Unknown does not mean healthy.</p>}
      {!!(records.length + environment.length) && <div className="table-wrap"><table><caption>Historical observations, most recent first within each source. Showing up to 40 personal and 40 compartment records.</caption><thead><tr><th>Observation</th><th>Value</th><th>Time</th><th>Provenance / quality</th></tr></thead><tbody>{[...records.slice(0, 40), ...environment.slice(0, 40)].map(r => <tr key={r.id}><td>{r.metric.replaceAll('_', ' ')}{'note' in r && r.note ? ` · ${r.note}` : ''}</td><td>{r.value === null ? 'Unavailable' : `${r.value} ${r.unit}`}</td><td>{r.timestamp}</td><td>{r.origin} · {r.source} · {r.quality}{r.demonstrationOnly ? ' · demonstration only' : ''}{'compartmentId' in r && r.compartmentId ? ` · ${r.compartmentId}` : ''}{r.sourceRefId ? ` · ${r.sourceRefId}` : ''}</td></tr>)}</tbody></table></div>}
      {selected === 'musculoskeletal' && <div className="history-list"><h3>Exercise history</h3>{!activities.length && <p className="empty-copy">No exercise records.</p>}{activities.slice().reverse().slice(0, 40).map(a => <p className="sample-note" key={a.id}>{a.startedAt} · {a.origin} · {a.source} · {a.quality} · repetitions {a.details?.repetitions ?? 'Unavailable'}</p>)}</div>}
      <p className="sample-note">Observed records, model-derived estimates and synthetic mission records retain their provenance. Missing records produce no invented anatomical findings.</p>
    </Panel>{['cognitive', 'musculoskeletal'].includes(selected) && <AssessmentHistory records={assessments} />}</div></div>
  </>
}
