import type { AssessmentResult } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { Badge, Disclosure, EmptyState, OriginBadge, Provenance, Time } from '../app/components/ui'
import { humanize, qualityLabel, sourceLabel } from '../app/format'
import { MovementHistory } from '../vision/MovementHistory'
const fixed = (value: number | null, digits = 1) => value === null ? 'Unavailable' : value.toFixed(digits)
const kindLabel: Record<AssessmentResult['kind'], string> = { typing: 'Typing performance', reaction: 'Reaction time', procedure: 'Procedure input check', visual: 'Eye observation', physical: 'Movement check' }
export function AssessmentHistory({ records }: { records: AssessmentResult[] }) {
  return <Panel title="Assessment history" eyebrow="Observed and synthetic records are never pooled">
    {!records.length && <EmptyState title="No completed assessments in this workspace." />}
    <ul className="record-list history-list">{records.slice().reverse().slice(0, 40).map(a => <li key={a.id}>
      <div className="record-head"><strong>{kindLabel[a.kind] ?? humanize(a.kind)}</strong><OriginBadge origin={a.origin} /></div>
      {a.kind === 'typing' && <p className="num">{a.result.wpm.toFixed(1)} WPM · {a.result.accuracy.toFixed(1)}% accuracy · {a.result.errors} errors · {a.result.corrections} corrections · {a.result.interKeyMs.length} intervals · {a.result.durationMs / 1000} s</p>}
      {a.kind === 'reaction' && <p className="num">Mean {fixed(a.result.meanMs)} ms · Median {fixed(a.result.medianMs)} ms · {a.result.missed} missed · {a.result.premature} premature</p>}
      {a.kind === 'procedure' && <p className="num">{a.result.attempts.filter(t => !t.matched).length} mismatches · {a.result.attempts.length} attempts · {a.result.attempts.map(t => `${t.field} ${t.entered} ${t.unit}: ${t.elapsedMs.toFixed(0)} ms`).join('; ')}</p>}
      {(a.kind === 'visual' || a.kind === 'physical') && <><Badge tone="attention" icon="warning">Experimental · explicit demo association</Badge><p className="num">{(a.result.durationMs / 1000).toFixed(1)} s session · {(a.result.validObservationMs / 1000).toFixed(1)} s usable · {(a.result.trackingCoverage * 100).toFixed(1)}% {a.kind === 'visual' ? 'coverage after calibration' : 'session coverage'}</p>{a.kind === 'visual' && <p className="muted small">{(a.result.calibrationMs / 1000).toFixed(1)} s calibration excluded from coverage denominator.</p>}{!a.result.sufficient && <p className="form-error">Assessment unavailable — insufficient reliable visual data.</p>}</>}
      {a.kind === 'visual' && <p className="num">{fixed(a.result.blinkCount, 0)} blinks · {fixed(a.result.blinkRatePerMinute)} / usable min · mean blink {fixed(a.result.meanBlinkDurationMs)} ms · eye closure {fixed(a.result.eyeClosureMs)} ms · PERCLOS-inspired {fixed(a.result.perclosInspiredProportion === null ? null : a.result.perclosInspiredProportion * 100)}%</p>}
      {a.kind === 'physical' && <><p className="num">Right elbow flexion: {fixed(a.result.repetitions, 0)} repetitions · range {fixed(a.result.rangeDeg)}° · {a.result.angleHistory.length} movement samples</p><MovementHistory result={a.result} /></>}
      {a.origin === 'synthetic' && <p className="muted small">Synthetic fixture — generated values and baseline, not a camera or cognitive measurement.</p>}
      <Provenance><Time value={a.timestamp} short /> · {sourceLabel(a.source)} · {qualityLabel(a.quality)}</Provenance>
      <Provenance>{a.acquisition ? `${a.acquisition.deviceId} · ${a.acquisition.protocolId} · ${a.acquisition.condition} · session ${a.acquisition.sessionId}` : 'Acquisition conditions unrecorded; no qualified new baseline comparison.'}</Provenance>
      {(a.kind === 'visual' || a.kind === 'physical') && <Disclosure summary="Quality intervals and provenance"><p>Algorithm: {a.result.algorithm} · association confirmed {a.association.confirmedAt} · sources: {a.sourceRefIds.join(', ')}</p><p>{a.result.invalidIntervals.length ? a.result.invalidIntervals.map(i => `${(i.startMs / 1000).toFixed(1)}–${(i.endMs / 1000).toFixed(1)} s: ${i.reason}`).join('; ') : 'No invalid tracking intervals recorded.'}</p></Disclosure>}
    </li>)}</ul>
  </Panel>
}
