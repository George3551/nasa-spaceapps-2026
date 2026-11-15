import type { AssessmentResult } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { MovementHistory } from '../vision/MovementHistory'
const fixed = (value: number | null, digits = 1) => value === null ? 'Unavailable' : value.toFixed(digits)
export function AssessmentHistory({ records }: { records: AssessmentResult[] }) {
  return <Panel title="Assessment history" eyebrow="Observed and synthetic records are never pooled">
    {!records.length && <p className="empty-copy">No completed assessments in this workspace.</p>}
    <div className="history-list">{records.slice().reverse().slice(0, 40).map(a => <article className="event-item" key={a.id}><h3>{a.kind} · {a.origin}</h3><p className="mono">{a.timestamp} · {a.source} · {a.quality}</p>
      {a.origin === 'synthetic' && <p className="sample-note">Synthetic fixture — generated values and baseline, not a camera or cognitive measurement.</p>}
      <p className="sample-note">{a.acquisition ? `${a.acquisition.deviceId} · ${a.acquisition.protocolId} · ${a.acquisition.condition} · session ${a.acquisition.sessionId}` : 'Acquisition conditions unrecorded; no qualified new baseline comparison.'}</p>
      {a.kind === 'typing' && <p>{a.result.wpm.toFixed(1)} WPM · {a.result.accuracy.toFixed(1)}% accuracy · {a.result.errors} errors · {a.result.corrections} corrections · {a.result.interKeyMs.length} intervals · {a.result.durationMs / 1000} s</p>}
      {a.kind === 'reaction' && <p>Mean {fixed(a.result.meanMs)} ms · Median {fixed(a.result.medianMs)} ms · {a.result.missed} missed · {a.result.premature} premature</p>}
      {a.kind === 'procedure' && <p>{a.result.attempts.filter(t => !t.matched).length} mismatches · {a.result.attempts.length} attempts · {a.result.attempts.map(t => `${t.field} ${t.entered} ${t.unit}: ${t.elapsedMs.toFixed(0)} ms`).join('; ')}</p>}
      {(a.kind === 'visual' || a.kind === 'physical') && <><span className="badge">Experimental · explicit demo association</span><p>{(a.result.durationMs / 1000).toFixed(1)} s session · {(a.result.validObservationMs / 1000).toFixed(1)} s usable · {(a.result.trackingCoverage * 100).toFixed(1)}% {a.kind === 'visual' ? 'coverage after calibration' : 'session coverage'}</p>{a.kind === 'visual' && <p>{(a.result.calibrationMs / 1000).toFixed(1)} s calibration excluded from coverage denominator.</p>}{!a.result.sufficient && <p>Assessment unavailable — insufficient reliable visual data.</p>}</>}
      {a.kind === 'visual' && <p>{fixed(a.result.blinkCount, 0)} blinks · {fixed(a.result.blinkRatePerMinute)} / usable min · mean blink {fixed(a.result.meanBlinkDurationMs)} ms · eye closure {fixed(a.result.eyeClosureMs)} ms · PERCLOS-inspired {fixed(a.result.perclosInspiredProportion === null ? null : a.result.perclosInspiredProportion * 100)}%</p>}
      {a.kind === 'physical' && <><p>Right elbow flexion: {fixed(a.result.repetitions, 0)} repetitions · range {fixed(a.result.rangeDeg)}° · {a.result.angleHistory.length} movement samples</p><MovementHistory result={a.result} /></>}
      {(a.kind === 'visual' || a.kind === 'physical') && <details><summary>Quality intervals and provenance</summary><p>Algorithm: {a.result.algorithm} · association confirmed {a.association.confirmedAt} · sources: {a.sourceRefIds.join(', ')}</p><p>{a.result.invalidIntervals.length ? a.result.invalidIntervals.map(i => `${(i.startMs / 1000).toFixed(1)}–${(i.endMs / 1000).toFixed(1)} s: ${i.reason}`).join('; ') : 'No invalid tracking intervals recorded.'}</p></details>}
    </article>)}</div>
  </Panel>
}
