import type { ClinicalWorkspace, HealthAlert, HealthMeasurement, MissionState } from '../../contracts/types'

export function usable(record: HealthMeasurement) {
  return record.value !== null && Number.isFinite(record.value) && (record.quality === 'valid' || record.quality === 'estimated')
}

// All cutoffs below are transparent demonstration heuristics, not clinical limits.
export function evaluate(state: MissionState): HealthAlert[] {
  const alerts: HealthAlert[] = []
  for (const crew of state.crew) for (const origin of ['synthetic', 'observed', 'research_dataset'] as const) {
    const records = state.measurements.filter(r => r.astronautId === crew.id && r.origin === origin && usable(r)).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const sleeps = records.filter(r => r.metric === 'sleep_duration').slice(-3)
    const fatigue = records.filter(r => r.metric === 'reported_fatigue').at(-1)
    const reaction = (state.assessments ?? []).filter(a => a.astronautId === crew.id && a.origin === origin && a.kind === 'reaction' && (a.quality === 'valid' || a.quality === 'estimated')).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const baseline = reaction.slice(0, 3).flatMap(a => a.kind === 'reaction' && a.result.meanMs !== null ? [a.result.meanMs] : [])
    const latest = reaction.at(-1)
    const baselineMean = baseline.length ? baseline.reduce((a, b) => a + b, 0) / baseline.length : null
    const slowdown = reaction.length >= 4 && latest?.kind === 'reaction' && latest.result.meanMs !== null && baselineMean !== null && latest.result.meanMs > baselineMean * 1.2
    if (sleeps.length === 3 && sleeps.every(r => r.unit === 'h' && r.value! < 6) && fatigue && fatigue.unit === '0–10' && fatigue.value! >= 7) {
      alerts.push({ id: `${origin}-${crew.id}-recovery`, astronautId: crew.id, createdAt: fatigue.timestamp, level: 'review', title: 'Recovery indicators changed',
        explanation: `Three recent sleep records are below the demo cutoff of 6 h and the latest fatigue entry is at least 7/10.${slowdown ? ' Reaction performance is also slower than the first three same-origin sessions.' : ' More comparable performance sessions may be needed.'} This association does not establish a cause or diagnosis.`,
        evidence: [...sleeps.map(r => ({ observationId: r.id, explanation: `Sleep ${r.value} ${r.unit}` })), { observationId: fatigue.id, explanation: `Fatigue ${fatigue.value}/10` }, ...(slowdown && latest ? [{ observationId: latest.id, explanation: 'Reaction mean exceeds the same-origin baseline by more than 20% (demo comparison).' }] : [])],
        safeNextStep: 'Confirm the sleep entries, record current fatigue, and consider a repeat performance check under comparable conditions. Request a crew medical review if concerns persist.', status: 'new', ruleId: 'DEMO-RECOVERY-01', demonstrationOnly: true, sourceRefIds: ['hrp-risks', 'hrr-721'],
      })
    }
    const environment = state.environment.filter(r => r.origin === origin && r.compartmentId === crew.currentCompartmentId && r.metric === 'cabin_co2' && r.unit === 'ppm' && r.value !== null && (r.quality === 'valid' || r.quality === 'estimated')).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).at(-1)
    if (environment && environment.value! >= 2000) {
      const symptoms = state.measurements.filter(r => r.origin === origin && r.compartmentId === crew.currentCompartmentId && r.metric === 'symptom_severity' && usable(r) && Math.abs(Date.parse(r.timestamp) - Date.parse(environment.timestamp)) <= 120000)
      const affected = new Set(symptoms.map(r => r.astronautId))
      if (affected.size >= 2 && affected.has(crew.id)) alerts.push({
        id: `${origin}-${crew.id}-environment`, astronautId: crew.id, compartmentId: crew.currentCompartmentId,
        createdAt: environment.timestamp, level: 'review', title: 'Shared environment warrants review',
        explanation: 'Two or more crew members have contemporaneous symptom entries in the same compartment, alongside CO₂ at or above the illustrative 2000 ppm cutoff. Temporal and location overlap suggest a possible relationship, not proven causation.',
        // Personal alert exposes only this astronaut's evidence, never another medical record.
        evidence: [{ observationId: environment.id, explanation: `Compartment CO₂ ${environment.value} ppm` }, ...symptoms.filter(r => r.astronautId === crew.id).slice(-1).map(r => ({ observationId: r.id, explanation: `Own symptom entry ${r.value}/10` }))],
        safeNextStep: 'Verify the sensor reading and location, document symptoms, and request a crew medical/environment review using the mission procedures.', status: 'new', ruleId: 'DEMO-ENV-01', demonstrationOnly: true, sourceRefIds: ['hrp-hazards'],
      })
    }
  }
  return alerts
}

export function synchronizeClinical(state: MissionState): ClinicalWorkspace {
  const detected = evaluate(state)
  const alerts = new Map(state.alerts.map(a => [a.id, a]))
  for (const alert of detected) {
    const previous = alerts.get(alert.id)
    alerts.set(alert.id, { ...alert, createdAt: previous?.createdAt ?? alert.createdAt, status: previous?.status ?? 'new' })
  }
  const encounters = [...(state.encounters ?? [])]
  for (const alert of detected) if (alert.astronautId && !encounters.some(e => e.alertId === alert.id)) {
    const record = state.measurements.find(r => alert.evidence.some(e => e.observationId === r.id))
    encounters.push({ id: `case-${alert.id}`, astronautId: alert.astronautId, alertId: alert.id, title: alert.title,
      status: 'open', actions: [], timestamp: alert.createdAt, source: 'assessment', origin: record?.origin ?? 'synthetic',
      quality: 'estimated', unit: 'encounter', sourceRefIds: alert.sourceRefIds ?? [], demonstrationOnly: true,
    })
  }
  return { measurements: state.measurements, assessments: state.assessments ?? [], alerts: [...alerts.values()], encounters }
}
