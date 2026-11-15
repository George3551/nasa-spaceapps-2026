import type { BaselineComparison, DataOrigin, MissionState, MultimodalFinding, PerformanceAssessment, PerformanceObservation, PerformanceSignal } from '../../contracts/types'

const usable = (r: PerformanceObservation) => r.value !== null && Number.isFinite(r.value) && ['valid', 'estimated'].includes(r.quality)
const contextKnown = (r: PerformanceObservation) => !!r.acquisition && [r.acquisition.deviceId, r.acquisition.protocolId, r.acquisition.condition].every(value => !['unspecified', 'not_recorded', 'other'].includes(value))
const compatible = (a: PerformanceObservation, b: PerformanceObservation) => a.signal === b.signal && a.unit === b.unit && a.source === b.source && a.origin === b.origin && a.astronautId === b.astronautId && a.analyte === b.analyte && contextKnown(a) && contextKnown(b) && a.acquisition!.deviceId === b.acquisition!.deviceId && a.acquisition!.protocolId === b.acquisition!.protocolId && a.acquisition!.condition === b.acquisition!.condition
const median = (values: number[]) => { const v = values.slice().sort((a, b) => a - b); return (v[Math.floor((v.length - 1) / 2)]! + v[Math.floor(v.length / 2)]!) / 2 }
export const performanceSignals: PerformanceSignal[] = ['heart_rate', 'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'body_temperature', 'oxygen_saturation', 'heart_rate_variability', 'sleep_duration', 'reported_fatigue', 'reported_stress', 'reported_mood', 'exercise_duration', 'reaction_mean', 'typing_wpm', 'visual_blink_rate', 'visual_closure_proportion', 'physical_repetitions']
export function performanceObservations(state: MissionState, subject: string, origin: DataOrigin): PerformanceObservation[] {
  const result: PerformanceObservation[] = state.measurements.filter(r => r.astronautId === subject && r.origin === origin).map(r => ({ ...r, signal: r.metric }))
  for (const a of state.assessments ?? []) {
    if (a.astronautId !== subject || a.origin !== origin) continue
    const add = (signal: PerformanceSignal, value: number | null, unit: string) => result.push({ id: a.id, astronautId: subject, signal, value, unit, timestamp: a.timestamp, source: a.source, origin, quality: a.quality, ...(a.acquisition ? { acquisition: a.acquisition } : {}) })
    if (a.kind === 'reaction') add('reaction_mean', a.result.meanMs, 'ms')
    if (a.kind === 'typing') add('typing_wpm', a.result.wpm, 'WPM')
    if (a.kind === 'visual') { add('visual_blink_rate', a.result.blinkRatePerMinute, '/usable min'); add('visual_closure_proportion', a.result.closureProportion, 'proportion') }
    if (a.kind === 'physical') add('physical_repetitions', a.result.repetitions, 'count')
  }
  return result
}
export function compareBaseline(records: PerformanceObservation[], signal: PerformanceSignal, asOf: string): BaselineComparison {
  records = records.filter(r => r.signal === signal)
  const now = Date.parse(asOf), future = records.some(r => Date.parse(r.timestamp) > now)
  const history = records.filter(r => Date.parse(r.timestamp) <= now).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  const latestEntry = history.at(-1) ?? null, current = history.filter(usable).at(-1) ?? null
  const warnings = future ? ['Future-dated observations excluded.'] : []
  const base: BaselineComparison = { signal, current, latestEntry, history: history.slice(-12), baseline: null, baselineRecords: [], delta: null, percentChange: null, status: 'missing', warnings }
  if (!current) { warnings.push('No usable observation. Missing is not zero or good health.'); return base }
  if (current !== latestEntry) { warnings.push('Latest entry is unavailable/invalid. Prior usable value is history only.'); return { ...base, status: 'invalid' } }
  // Engineering freshness windows, not health limits.
  const maxAge = signal === 'sleep_duration' ? 86400000 : signal === 'laboratory' || signal === 'bone_mineral_density' ? 7 * 86400000 : 30 * 60000
  if (now - Date.parse(current.timestamp) > maxAge) { warnings.push('Outside the demonstration freshness window.'); return { ...base, status: 'stale' } }
  if (!contextKnown(current)) { warnings.push('Acquisition conditions/device/protocol unrecorded; no qualified comparison.'); return { ...base, status: 'incompatible' } }
  const prior = history.filter(r => usable(r) && Date.parse(r.timestamp) < Date.parse(current.timestamp) && now - Date.parse(r.timestamp) <= 30 * 86400000 && r.acquisition?.sessionId !== current.acquisition?.sessionId)
  const candidates = prior.filter(r => compatible(r, current))
  if (prior.length !== candidates.length) warnings.push('Other units, origins, devices, protocols or conditions excluded; no silent conversion.')
  const sessions = new Set<string>(), timestamps = new Set<number>()
  const baselineRecords = candidates.filter(r => {
    const id = r.acquisition!.sessionId
    const at = Date.parse(r.timestamp)
    if (sessions.has(id) || timestamps.has(at)) return false
    sessions.add(id); timestamps.add(at); return true
  }).slice(0, 3)
  if (baselineRecords.length < 3) { warnings.push(`Need three earlier compatible sessions; found ${baselineRecords.length}.`); return { ...base, baselineRecords, status: candidates.length === 0 && prior.length >= 3 ? 'incompatible' : 'insufficient_baseline' } }
  const baseline = median(baselineRecords.map(r => r.value!)), delta = current.value! - baseline
  if (baseline === 0) warnings.push('Zero baseline: percentage change unavailable.')
  warnings.push('Declared acquisition labels are not verified device calibration or clinical comparability.')
  return { ...base, baseline, baselineRecords, delta, percentChange: baseline === 0 ? null : delta / Math.abs(baseline) * 100, status: 'ready' }
}
export function assessPerformance(state: MissionState, subject: string, origin: DataOrigin, asOf: string): PerformanceAssessment {
  const observations = performanceObservations(state, subject, origin)
  const keys = [...new Set([...performanceSignals, ...observations.map(r => r.signal)])]
  const comparisons = keys.flatMap(signal => {
    const series = observations.filter(r => r.signal === signal)
    return signal === 'laboratory' ? [...new Set(series.map(r => r.analyte))].map(analyte => compareBaseline(series.filter(r => r.analyte === analyte), signal, asOf)) : [compareBaseline(series, signal, asOf)]
  })
  const get = (signal: PerformanceSignal) => comparisons.find(r => r.signal === signal)
  const changed = (signal: PerformanceSignal, predicate: (c: BaselineComparison) => boolean) => { const c = get(signal); return c?.status === 'ready' && predicate(c) ? c : null }
  const sleep = changed('sleep_duration', c => c.percentChange! <= -20), fatigue = changed('reported_fatigue', c => c.delta! >= 2)
  const reaction = changed('reaction_mean', c => c.percentChange! >= 20), typing = changed('typing_wpm', c => c.percentChange! <= -20)
  const findings: MultimodalFinding[] = []
  const performance = reaction ?? typing
  if (sleep && fatigue && performance && Math.abs(Date.parse(fatigue.current!.timestamp) - Date.parse(performance.current!.timestamp)) <= 15 * 60000) {
    const context = ['heart_rate', 'visual_blink_rate', 'visual_closure_proportion'].flatMap(signal => { const c = get(signal as PerformanceSignal); return c?.current && ['ready', 'insufficient_baseline', 'incompatible'].includes(c.status) ? [c] : [] })
    const evidence = [...[sleep, fatigue, performance], ...context].map(c => ({ observationId: c.current!.id, explanation: `${c.signal}: ${c.current!.value} ${c.current!.unit}; baseline ${c.baseline ?? 'unavailable'}${c.percentChange === null ? '' : `; change ${c.percentChange.toFixed(1)}%`}. ${c.current!.source}/${origin}.` }))
    findings.push({ ruleId: 'DEMO-MULTI-PERF-01', title: 'Multiple performance indicators changed', explanation: 'Compared with three earlier compatible sessions: sleep decreased ≥20%, fatigue increased ≥2 points, and reaction slowed ≥20% or typing decreased ≥20%. Fatigue/performance are within 15 minutes; sleep is contextual within 24 hours. These are demonstration choices, not clinical cutoffs. Additional physiology/eyelid records are descriptive context, never proof of fatigue or causation.', evidence, nextStep: 'Check recording conditions and quality, repeat comparable assessments, and request human medical review if concerns persist.', demonstrationOnly: true })
  }
  const ownSymptoms = state.measurements.filter(r => r.astronautId === subject && r.origin === origin && r.metric === 'symptom_severity' && r.value !== null && ['valid', 'estimated'].includes(r.quality) && Date.parse(r.timestamp) <= Date.parse(asOf)).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  for (const symptom of ownSymptoms.slice(-1)) {
    const env = state.environment.filter(r => r.origin === origin && r.compartmentId === symptom.compartmentId && (origin !== 'observed' || r.astronautId === subject) && r.metric === 'cabin_co2').map(r => ({ ...r, astronautId: subject, signal: 'cabin_co2' as const }))
    const comparison = compareBaseline(env, 'cabin_co2', asOf)
    if (comparison.status === 'ready' && comparison.percentChange! >= 50 && Math.abs(Date.parse(symptom.timestamp) - Date.parse(comparison.current!.timestamp)) <= 120000 && Date.parse(asOf) - Date.parse(symptom.timestamp) <= 30 * 60000) findings.push({ ruleId: 'DEMO-MULTI-ENV-01', title: 'Environment and own observation overlap', explanation: 'Compartment CO₂ increased ≥50% against three comparable prior sessions and an own symptom entry overlaps within two minutes. This is a demonstration association, not proof that the environment caused disease or a personal absorbed exposure estimate.', evidence: [{ observationId: comparison.current!.id, explanation: `CO₂ ${comparison.current!.value} ppm; baseline ${comparison.baseline} ppm, ${origin}.` }, { observationId: symptom.id, explanation: `Own symptom entry ${symptom.value} ${symptom.unit}, ${origin}.` }], nextStep: 'Verify the environmental sensor, recorded location and symptoms; document a follow-up through the crew medical/environment review process.', demonstrationOnly: true })
  }
  return { astronautId: subject, origin, asOf, comparisons, findings, limitations: ['Demonstration heuristics only; no diagnosis, universal stress score or causal inference.', 'Baseline: median of the first three earlier distinct compatible sessions within 30 days; current session excluded.', 'Freshness: 30 minutes for performance/physiology, 24 hours for sleep, 7 days for lab/examination metrics. These are engineering windows.', 'Legacy records without acquisition conditions remain visible but cannot establish a qualified new baseline.', 'No physical medical hardware is connected. Missing modalities do not establish good health.'] }
}
