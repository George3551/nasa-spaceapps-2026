import type { HealthMeasurement, MissionSnapshot, MissionState, ScenarioId, SimulationPort } from '../../contracts/types'

const epoch = Date.parse('2026-11-14T08:00:00.000Z')
const rooms = [
  { id: 'living', label: 'Living quarters', category: 'living' },
  { id: 'exercise', label: 'Exercise area', category: 'exercise' },
  { id: 'medical', label: 'Medical bay', category: 'medical' },
  { id: 'work', label: 'Working area', category: 'work' },
  { id: 'support', label: 'Life support', category: 'life_support' },
  { id: 'shelter', label: 'Radiation shelter', category: 'shelter' },
] as const

// Hash of seed + time + channel: sampling is invariant to tick partitioning.
function noise(seed: number, tick: number, channel: number) {
  let x = (seed ^ Math.imul(tick + 1, 2654435761) ^ Math.imul(channel + 1, 2246822519)) >>> 0
  x = Math.imul(x ^ (x >>> 16), 2246822519) >>> 0
  return (x >>> 0) / 4294967296
}

export function initialState(seed = 42): MissionSnapshot {
  const state: MissionSnapshot = {
    missionTime: new Date(epoch).toISOString(), paused: true, speed: 60, activeScenario: 'normal-day', seed,
    crew: ['Mira Chen', 'Alex Rivera', 'Leo Karim'].map((displayName, index) => ({
      id: `crew-0${index + 1}`, displayName, role: ['Research specialist', 'Flight engineer', 'Commander'][index]!,
      baselines: { resting_heart_rate: 64 + index * 3, sleep_duration: 8, reported_fatigue: 2 },
      currentCompartmentId: ['living', 'exercise', 'work'][index]!, syntheticIdentity: true,
    })),
    compartments: rooms.map(room => ({ ...room })), measurements: [], environment: [], activities: [], alerts: [], events: [], assessments: [], encounters: [],
    sources: [{ id: 'synthetic-v2', title: 'AEGIS reproducible scenario fixtures', kind: 'synthetic_fixture', note: 'Illustrative test data, not a physiological prediction.' }],
    resources: [{ id: 'bp-monitor', label: 'Blood pressure monitor', quantity: 1, unit: 'device', origin: 'synthetic', quality: 'estimated', timestamp: new Date(epoch).toISOString(), source: 'simulator', sourceRefIds: ['synthetic-v2'] }],
  }
  for (let tick = -6; tick <= 0; tick++) sample(state, tick)
  state.crew.forEach((person, index) => state.measurements.push({ id: `preflight-bmd-${person.id}`, astronautId: person.id, metric: 'bone_mineral_density', value: 1.1 + index * .03, unit: 'g/cm²', timestamp: new Date(epoch - 86400000).toISOString(), source: 'simulator', origin: 'synthetic', quality: 'estimated', sourceRefId: 'synthetic-v2', demonstrationOnly: true, note: 'Fictional preflight lumbar examination record. Not an estimate from exercise or a prediction of bone loss.' }))
  return state
}

function sample(state: MissionSnapshot, tick: number) {
  const timestamp = new Date(epoch + tick * 60000).toISOString()
  const incident = state.activeScenario === 'co2-excursion' && tick >= 1
  const disrupted = state.activeScenario === 'sleep-disruption' && tick >= 1
  state.crew = state.crew.map((person, index) => ({ ...person,
    currentCompartmentId: incident && index < 2 ? 'living' : ['living', 'work', 'exercise', 'medical'][((Math.floor(Math.max(0, tick) / 2) + index) % 4)]!,
  }))
  state.crew.forEach((person, index) => {
    const tired = disrupted && index === 0
    const add = (metric: HealthMeasurement['metric'], value: number, unit: string, note?: string) => {
      state.measurements.push({ id: `${state.activeScenario}-${tick}-${person.id}-${metric}`, astronautId: person.id, metric, value, unit, timestamp, source: 'simulator', origin: 'synthetic', quality: 'estimated', compartmentId: person.currentCompartmentId, sourceRefId: 'synthetic-v2', demonstrationOnly: true, ...(note ? { note } : {}) })
    }
    add('resting_heart_rate', Math.round(64 + index * 3 + noise(state.seed, tick, index) * 3 + (tired ? 10 : 0)), 'bpm')
    add('sleep_duration', tired ? 5.2 : 7.5 + noise(state.seed, tick, index + 3) * .5, 'h')
    add('reported_fatigue', tired ? 8 : 2, '0–10')
    add('reported_mood', tired ? 4 : 7, '0–10')
    add('reported_stress', tired ? 7 : 2, '0–10')
    add('exercise_duration', tired ? 20 : 40, 'min')
    if (incident && index < 2) add('symptom_severity', 4, '0–10', 'Reported headache in the synthetic scenario; cause not established.')
    state.activities.push({ id: `activity-${tick}-${person.id}`, astronautId: person.id, kind: person.currentCompartmentId === 'exercise' ? 'exercise' : person.currentCompartmentId === 'living' ? 'rest' : 'work', startedAt: timestamp, source: 'simulator', origin: 'synthetic', quality: 'estimated' })
    if (tick >= 0) state.events.push({ id: `routine-${tick}-${person.id}`, at: timestamp, kind: 'routine', astronautId: person.id, compartmentId: person.currentCompartmentId, summary: `${person.displayName}: ${person.currentCompartmentId}`, synthetic: true })
    if (tired || tick < 0) state.assessments.push({ id: `performance-${tick}-${person.id}`, astronautId: person.id, timestamp, source: 'simulator', origin: 'synthetic', quality: 'estimated', unit: 'ms', sourceRefIds: ['synthetic-v2'], demonstrationOnly: true, kind: 'reaction', result: { mode: 'demo', durationMs: 30000, trials: [{ waitMs: 1500, responseMs: tired ? 420 : 260, outcome: 'response' }], meanMs: tired ? 420 : 260, medianMs: tired ? 420 : 260, missed: 0, premature: 0 } })
  })
  state.compartments.forEach(room => {
    const add = (metric: 'cabin_co2' | 'cabin_temperature' | 'cabin_pressure' | 'radiation_dose', value: number, unit: string) => state.environment.push({ id: `${state.activeScenario}-${tick}-${room.id}-${metric}`, compartmentId: room.id, metric, value, unit, timestamp, source: 'simulator', origin: 'synthetic', quality: 'estimated', sourceRefId: 'synthetic-v2', demonstrationOnly: true })
    add('cabin_co2', incident && room.id === 'living' ? 2500 : 600, 'ppm')
    add('cabin_temperature', 22, '°C'); add('cabin_pressure', 101, 'kPa')
    add('radiation_dose', state.activeScenario === 'radiation-event' && tick >= 1 ? .2 : .001, 'mSv')
  })
  // Sliding history for sensor data; clinical encounters and real assessments are never capped here.
  state.measurements = state.measurements.slice(-3600)
  state.environment = state.environment.slice(-4800)
  state.events = state.events.slice(-400)
  state.activities = state.activities.slice(-400)
  state.assessments = state.assessments.slice(-1000)
}

export function step(input: MissionState, seconds: number): MissionSnapshot {
  const state = structuredClone(input) as MissionSnapshot
  state.assessments ??= []; state.encounters ??= []; state.sources ??= []; state.resources ??= []
  if (input.paused || !Number.isFinite(seconds) || seconds <= 0) return state
  const before = Date.parse(input.missionTime)
  const after = before + Math.min(seconds, 86400) * 1000
  for (let tick = Math.floor((before - epoch) / 60000) + 1; tick <= Math.floor((after - epoch) / 60000); tick++) sample(state, tick)
  state.missionTime = new Date(after).toISOString()
  return state
}

export function runScenario(input: MissionState, id: ScenarioId): MissionSnapshot {
  const state = initialState(input.seed)
  state.activeScenario = id; state.speed = input.speed
  state.events.push({ id: `scenario-${id}`, at: state.missionTime, kind: 'operator_action', summary: `Selected ${id}. Scenario snapshots occur every virtual minute.`, scenarioId: id, synthetic: true })
  return state
}

export const simulator: SimulationPort = { initialState, step, runScenario, reset: initialState }
