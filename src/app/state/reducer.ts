import type {
  ActivityRecord, AstronautId, CompartmentId, EnvironmentalMeasurement,
  HealthAlert, HealthMeasurement, MissionEvent, MissionState,
} from '../../../contracts/types'
import { createIntegrationFixture } from '../integration/fixtures'

export type Section = 'dashboard' | 'health' | 'spacecraft' | 'simulation' | 'events'

export interface AppState {
  mission: MissionState
  section: Section
  selectedAstronautId: AstronautId | null
  selectedCompartmentId: CompartmentId | null
}

export type AppAction =
  | { type: 'navigate'; section: Section }
  | { type: 'crew/select'; id: AstronautId }
  | { type: 'compartment/select'; id: CompartmentId }
  | { type: 'mission/replace'; mission: MissionState }
  | { type: 'measurements/upsert'; records: HealthMeasurement[] }
  | { type: 'environment/upsert'; records: EnvironmentalMeasurement[] }
  | { type: 'activities/upsert'; records: ActivityRecord[] }
  | { type: 'events/upsert'; records: MissionEvent[] }
  | { type: 'alerts/replace'; alerts: HealthAlert[] }
  | { type: 'alerts/acknowledge'; id: string }
  | { type: 'fixture/reset' }

export function createAppState(): AppState {
  return {
    mission: createIntegrationFixture(), section: 'dashboard',
    selectedAstronautId: 'crew-01', selectedCompartmentId: null,
  }
}

function upsert<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  return [...new Map([...current, ...incoming].map(record => [record.id, record])).values()]
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'navigate': return { ...state, section: action.section }
    case 'crew/select':
      return state.mission.crew.some(crew => crew.id === action.id)
        ? { ...state, selectedAstronautId: action.id, section: 'health' } : state
    case 'compartment/select':
      return state.mission.compartments.some(room => room.id === action.id)
        ? { ...state, selectedCompartmentId: action.id } : state
    case 'mission/replace':
      return {
        ...state, mission: action.mission,
        selectedAstronautId: action.mission.crew.some(crew => crew.id === state.selectedAstronautId)
          ? state.selectedAstronautId : action.mission.crew[0]?.id ?? null,
        selectedCompartmentId: action.mission.compartments.some(room => room.id === state.selectedCompartmentId)
          ? state.selectedCompartmentId : null,
      }
    case 'measurements/upsert':
      return { ...state, mission: { ...state.mission, measurements: upsert(state.mission.measurements, action.records) } }
    case 'environment/upsert':
      return { ...state, mission: { ...state.mission, environment: upsert(state.mission.environment, action.records) } }
    case 'activities/upsert':
      return { ...state, mission: { ...state.mission, activities: upsert(state.mission.activities, action.records) } }
    case 'events/upsert':
      return { ...state, mission: { ...state.mission, events: upsert(state.mission.events, action.records) } }
    case 'alerts/replace': {
      const acknowledged = new Set(state.mission.alerts.filter(a => a.status === 'acknowledged').map(a => a.id))
      const alerts = upsert<HealthAlert>([], action.alerts).map(alert => acknowledged.has(alert.id)
        ? { ...alert, status: 'acknowledged' as const } : alert)
      return { ...state, mission: { ...state.mission, alerts } }
    }
    case 'alerts/acknowledge':
      return { ...state, mission: { ...state.mission, alerts: state.mission.alerts.map(alert =>
        alert.id === action.id ? { ...alert, status: 'acknowledged' } : alert) } }
    case 'fixture/reset': return createAppState()
  }
}
