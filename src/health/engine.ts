/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Deterministic demonstration alerts and evidence snapshots.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Research prototype; deterministic application logic is not a trained clinical diagnostic model.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { ClinicalWorkspace, HealthAlert, HealthMeasurement, MissionState } from '../../contracts/types'
import { assessPerformance, freshnessWindow } from './intelligence'

export function usable(record: HealthMeasurement) {
  return record.value !== null && Number.isFinite(record.value) && (record.quality === 'valid' || record.quality === 'estimated')
}

// All cutoffs below are transparent demonstration heuristics, not clinical limits.
export function evaluate(state: MissionState, asOf = state.missionTime): HealthAlert[] {
  const now = Date.parse(asOf)
  const current = (timestamp: string, maxAge: number) => Date.parse(timestamp) <= now && now - Date.parse(timestamp) <= maxAge
  const alerts: HealthAlert[] = []
  for (const crew of state.crew) for (const origin of ['synthetic', 'observed', 'research_dataset'] as const) {
    const records = state.measurements.filter(r => r.astronautId === crew.id && r.origin === origin && Date.parse(r.timestamp) <= now).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    const sessions = new Set<string>(), instants = new Set<number>()
    const sleeps = records.filter(r => r.metric === 'sleep_duration' && current(r.timestamp, freshnessWindow('sleep_duration'))).reverse().filter(r => {
      const session = r.acquisition?.sessionId ?? r.timestamp, at = Date.parse(r.timestamp)
      if (sessions.has(session) || instants.has(at)) return false
      sessions.add(session); instants.add(at); return true
    }).slice(0, 3).reverse()
    const fatigue = records.filter(r => r.metric === 'reported_fatigue').at(-1)
    const reaction = assessPerformance(state, crew.id, origin, asOf).comparisons.find(c => c.signal === 'reaction_mean')
    const latest = reaction?.current
    const slowdown = reaction?.status === 'ready' && reaction.percentChange !== null && reaction.percentChange > 20
    const conflicts = (focus: HealthMeasurement) => records.some(r => r.metric === focus.metric && Date.parse(r.timestamp) === Date.parse(focus.timestamp) && (r.value !== focus.value || r.unit !== focus.unit || r.source !== focus.source))
    if (sleeps.length === 3 && sleeps.every(r => !conflicts(r) && usable(r) && r.unit === 'h' && r.value! < 6) && fatigue && !conflicts(fatigue) && usable(fatigue) && current(fatigue.timestamp, freshnessWindow('reported_fatigue')) && fatigue.unit === '0–10' && fatigue.value! >= 7) {
      alerts.push({ id: `${origin}-${crew.id}-recovery`, astronautId: crew.id, createdAt: asOf, level: 'review', title: 'Recovery indicators changed',
        explanation: `Three recent sleep records are below the demo cutoff of 6 h and the latest fatigue entry is at least 7/10.${slowdown ? ' Reaction performance is also slower than three compatible earlier sessions.' : ' A qualified reaction comparison is unavailable or shows no demo slowdown; legacy records without conditions are not pooled.'} This association does not establish a cause or diagnosis.`,
        evidence: [...sleeps.map(r => ({ observationId: r.id, explanation: `Sleep ${r.value} ${r.unit}` })), { observationId: fatigue.id, explanation: `Fatigue ${fatigue.value}/10` }, ...(slowdown && latest ? [{ observationId: latest.id, explanation: 'Reaction mean exceeds the compatible three-session baseline by more than 20% (demo comparison).' }] : [])],
        safeNextStep: 'Confirm the sleep entries, record current fatigue, and consider a repeat performance check under comparable conditions. Request a crew medical review if concerns persist.', status: 'new', ruleId: 'DEMO-RECOVERY-01', demonstrationOnly: true, sourceRefIds: ['hrp-risks', 'hrr-721'],
      })
    }
    const environment = state.environment.filter(r => r.origin === origin && r.compartmentId === crew.currentCompartmentId && r.metric === 'cabin_co2' && current(r.timestamp, freshnessWindow('cabin_co2')) && r.unit === 'ppm' && r.value !== null && (r.quality === 'valid' || r.quality === 'estimated')).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).at(-1)
    // Observed environmental association requires explicit subject/location data
    // and is evaluated by the qualified multimodal rule, not fictional ship positions.
    if (origin !== 'observed' && environment && environment.value! >= 2000) {
      const symptoms = state.measurements.filter(r => r.origin === origin && r.compartmentId === crew.currentCompartmentId && r.metric === 'symptom_severity' && current(r.timestamp, freshnessWindow('symptom_severity')) && usable(r) && Math.abs(Date.parse(r.timestamp) - Date.parse(environment.timestamp)) <= 120000)
      const affected = new Set(symptoms.map(r => r.astronautId))
      if (affected.size >= 2 && affected.has(crew.id)) alerts.push({
        id: `${origin}-${crew.id}-environment`, astronautId: crew.id, compartmentId: crew.currentCompartmentId,
        createdAt: asOf, level: 'review', title: 'Shared environment warrants review',
        explanation: 'Two or more crew members have contemporaneous symptom entries in the same compartment, alongside CO₂ at or above the illustrative 2000 ppm cutoff. Temporal and location overlap suggest a possible relationship, not proven causation.',
        // Personal alert exposes only this astronaut's evidence, never another medical record.
        evidence: [{ observationId: environment.id, explanation: `Compartment CO₂ ${environment.value} ppm` }, ...symptoms.filter(r => r.astronautId === crew.id).slice(-1).map(r => ({ observationId: r.id, explanation: `Own symptom entry ${r.value}/10` }))],
        safeNextStep: 'Verify the sensor reading and location, document symptoms, and request a crew medical/environment review using the mission procedures.', status: 'new', ruleId: 'DEMO-ENV-01', demonstrationOnly: true, sourceRefIds: ['hrp-hazards'],
      })
    }
  }
  return alerts
}

export function synchronizeClinical(state: MissionState, asOf = state.missionTime): ClinicalWorkspace {
  const detected = evaluate(state, asOf)
  for (const person of state.crew) for (const origin of ['synthetic', 'observed'] as const) {
    for (const finding of assessPerformance(state, person.id, origin, asOf).findings) {
      const legacyId = `${origin}-${person.id}-${finding.ruleId === 'DEMO-MULTI-PERF-01' ? 'recovery' : 'environment'}`
      const legacy = detected.find(a => a.id === legacyId)
      if (legacy) { legacy.explanation += ` ${finding.explanation}`; legacy.evidence = [...new Map([...legacy.evidence, ...finding.evidence].map(e => [e.observationId, e])).values()]; legacy.sourceRefIds = [...new Set([...(legacy.sourceRefIds ?? []), 'aegis-multimodal-v1'])] }
      else detected.push({ id: legacyId, astronautId: person.id, createdAt: asOf, level: 'review', title: finding.title, explanation: finding.explanation, evidence: finding.evidence, safeNextStep: finding.nextStep, status: 'new', ruleId: finding.ruleId, demonstrationOnly: true, sourceRefIds: ['aegis-multimodal-v1'] })
    }
  }
  const alerts = new Map(state.alerts.map(a => [a.id, a]))
  for (const alert of detected) {
    const previous = alerts.get(alert.id)
    if (!previous) alerts.set(alert.id, alert)
    else {
      const snapshot = { at: asOf, title: alert.title, explanation: alert.explanation, evidence: alert.evidence, safeNextStep: alert.safeNextStep, ruleId: alert.ruleId }
      const last = previous.updates?.at(-1) ?? { ...previous, at: previous.createdAt }
      const changed = JSON.stringify([last.title, last.explanation, last.evidence, last.safeNextStep, last.ruleId]) !== JSON.stringify([snapshot.title, snapshot.explanation, snapshot.evidence, snapshot.safeNextStep, snapshot.ruleId])
      alerts.set(alert.id, changed ? { ...previous, updates: [...(previous.updates ?? []), snapshot] } : previous)
    }
  }
  const encounters = [...(state.encounters ?? [])]
  for (const alert of detected) if (alert.astronautId && !encounters.some(e => e.alertId === alert.id)) {
    const record = [...state.measurements, ...(state.assessments ?? []), ...state.environment].find(r => alert.evidence.some(e => e.observationId === r.id))
    encounters.push({ id: `case-${alert.id}`, astronautId: alert.astronautId, alertId: alert.id, title: alert.title,
      status: 'open', actions: [], timestamp: alert.createdAt, source: 'assessment', origin: record?.origin ?? (alert.id.startsWith('observed-') ? 'observed' : 'synthetic'),
      quality: 'estimated', unit: 'encounter', sourceRefIds: alert.sourceRefIds ?? [], demonstrationOnly: true,
    })
  }
  return { measurements: state.measurements, assessments: state.assessments ?? [], alerts: [...alerts.values()], encounters, activities: state.activities, environment: state.environment, examinations: state.examinations ?? [] }
}
