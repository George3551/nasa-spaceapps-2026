import type { AssessmentResult, ClinicalAction, ClinicalWorkspace, HealthAlert, HealthMeasurement, MetricKey, MissionSnapshot, MissionState, ScenarioId, SensorBatch } from '../../../contracts/types'
import { initialState, runScenario, step } from '../../simulation/engine'
import { synchronizeClinical } from '../../health/engine'
import { addFollowUp, transitionEncounter } from '../../health/clinical'
import { actionSchema, assessmentSchema, validateMeasurement, readableValidationError } from '../../shared/validation'
import { physicalActivity } from '../../vision/records'
import { appendAcquisition, validateSensorBatch } from '../../sensors/ingestion'

export type Section = 'dashboard' | 'health' | 'spacecraft' | 'simulation' | 'events' | 'assessments' | 'research' | 'visual' | 'physical' | 'anatomy' | 'performance' | 'sensors'
export type UserMode = 'astronaut' | 'medical' | 'mission'
export type DataScope = 'observed' | 'synthetic'
export interface AppState {
  mission: MissionSnapshot
  personal: ClinicalWorkspace
  section: Section
  mode: UserMode
  scope: DataScope
  sessionAstronautId: string
  selectedAstronautId: string | null
  selectedCompartmentId: string | null
  notice: string | null
}
export type AppAction =
  | { type: 'navigate'; section: Section }
  | { type: 'mode/set'; mode: UserMode }
  | { type: 'scope/set'; scope: DataScope }
  | { type: 'crew/select'; id: string }
  | { type: 'compartment/select'; id: string }
  | { type: 'mission/tick'; seconds: number }
  | { type: 'mission/advance'; seconds: number }
  | { type: 'mission/paused'; paused: boolean }
  | { type: 'mission/speed'; speed: number }
  | { type: 'mission/scenario'; scenario: ScenarioId; seed: number }
  | { type: 'mission/replace'; mission: MissionState }
  | { type: 'measurements/upsert'; records: HealthMeasurement[] }
  | { type: 'assessment/add'; record: AssessmentResult }
  | { type: 'sensors/ingest'; batch: SensorBatch }
  | { type: 'alerts/replace'; alerts: HealthAlert[] }
  | { type: 'alerts/acknowledge'; id: string }
  | { type: 'encounter/transition'; id: string; transition: 'review' | 'resolve'; at: string }
  | { type: 'encounter/follow-up'; id: string; action: ClinicalAction }
  | { type: 'notice'; message: string | null }
  | { type: 'fixture/reset' }
  | { type: 'demo/start' }

export function createAppState(): AppState {
  return { mission: initialState(), personal: { measurements: [], assessments: [], alerts: [], encounters: [], activities: [], environment: [], examinations: [] }, section: 'health', mode: 'astronaut', scope: 'observed', sessionAstronautId: 'crew-01', selectedAstronautId: 'crew-01', selectedCompartmentId: null, notice: null }
}
export function canAccessSubject(state: AppState, id: string) {
  return state.mode === 'astronaut' ? id === state.sessionAstronautId : state.mode === 'medical' || state.scope === 'synthetic'
}
// UI isolation only; real authentication and authorization require a trusted boundary.
export function selectWorkspace(state: AppState): MissionState {
  const base = state.scope === 'synthetic' ? state.mission : { ...state.mission, ...state.personal, environment: state.personal.environment ?? [], examinations: state.personal.examinations ?? [], activities: state.personal.activities ?? [], events: [], crew: state.mission.crew.map(c => {
    const baselines: Partial<Record<MetricKey, number>> = {}
    const records = state.personal.measurements.filter(r => r.astronautId === c.id && r.value !== null && r.quality === 'valid').sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    for (const metric of new Set(records.map(r => r.metric))) {
      const first = records.filter(r => r.metric === metric).slice(0, 3)
      if (first.length === 3 && first.every(r => r.unit === first[0]!.unit)) baselines[metric] = first.reduce((sum, r) => sum + r.value!, 0) / 3
    }
    return { ...c, baselines }
  }) }
  if (state.mode !== 'astronaut') return base
  const own = state.sessionAstronautId
  return { ...base, crew: base.crew.filter(c => c.id === own), measurements: base.measurements.filter(r => r.astronautId === own), assessments: (base.assessments ?? []).filter(r => r.astronautId === own), encounters: (base.encounters ?? []).filter(r => r.astronautId === own), alerts: base.alerts.filter(r => r.astronautId === own), activities: base.activities.filter(r => r.astronautId === own), examinations: (base.examinations ?? []).filter(r => r.astronautId === own), environment: base.environment.filter(r => state.scope === 'synthetic' || r.astronautId === own), events: [] }
}
function updateClinical(state: AppState, data: ClinicalWorkspace): AppState {
  return state.scope === 'synthetic' ? { ...state, mission: { ...state.mission, ...data } } : { ...state, personal: data }
}
function clinicalData(state: AppState): ClinicalWorkspace { return state.scope === 'synthetic' ? state.mission : state.personal }
function reevaluate(state: AppState): AppState {
  const full = state.scope === 'synthetic' ? state.mission : { ...state.mission, ...state.personal, environment: state.personal.environment ?? [], examinations: state.personal.examinations ?? [] }
  return updateClinical(state, synchronizeClinical(full, state.scope === 'synthetic' ? full.missionTime : new Date().toISOString()))
}
export function appReducer(state: AppState, action: AppAction): AppState {
  try {
    switch (action.type) {
      case 'navigate':
        if ((action.section === 'spacecraft' || action.section === 'simulation') && state.mode !== 'mission') return state
        if ((action.section === 'visual' || action.section === 'physical') && state.mode === 'mission') return state
        return { ...state, section: action.section, notice: null }
      case 'mode/set': return { ...state, mode: action.mode, scope: action.mode === 'mission' ? 'synthetic' : 'observed', selectedAstronautId: state.sessionAstronautId, section: action.mode === 'mission' ? 'dashboard' : 'health', notice: null }
      case 'scope/set': return { ...state, scope: state.mode === 'mission' ? 'synthetic' : action.scope, notice: null }
      case 'crew/select': return canAccessSubject(state, action.id) && state.mission.crew.some(c => c.id === action.id) ? { ...state, selectedAstronautId: action.id, section: 'health' } : state
      case 'compartment/select': return state.mode === 'mission' && state.mission.compartments.some(r => r.id === action.id) ? { ...state, selectedCompartmentId: action.id } : state
      case 'mission/paused': return state.mode === 'mission' ? { ...state, mission: { ...state.mission, paused: action.paused } } : state
      case 'mission/speed': return state.mode === 'mission' && [1, 60, 300].includes(action.speed) ? { ...state, mission: { ...state.mission, speed: action.speed } } : state
      case 'mission/tick': {
        const mission = step(state.mission, action.seconds)
        return { ...state, mission: { ...mission, ...synchronizeClinical(mission) } }
      }
      case 'mission/advance': {
        if (state.mode !== 'mission') return state
        const mission = step({ ...state.mission, paused: false }, action.seconds)
        mission.paused = state.mission.paused
        return { ...state, mission: { ...mission, ...synchronizeClinical(mission) } }
      }
      case 'mission/scenario': {
        if (state.mode !== 'mission' || !Number.isInteger(action.seed) || action.seed < 0 || action.seed > 4294967295) return state
        const fresh = runScenario({ ...state.mission, seed: action.seed }, action.scenario)
        return { ...state, mission: fresh, selectedCompartmentId: null, notice: 'Synthetic scenario reset. Personal observations and assessments were preserved.' }
      }
      case 'mission/replace': {
        if (state.mode !== 'mission') return state
        const mission = { ...action.mission, assessments: action.mission.assessments ?? [], encounters: action.mission.encounters ?? [], sources: action.mission.sources ?? [], resources: action.mission.resources ?? [] }
        return { ...state, mission: { ...mission, ...synchronizeClinical(mission) }, selectedAstronautId: mission.crew.some(c => c.id === state.selectedAstronautId) ? state.selectedAstronautId : mission.crew[0]?.id ?? null }
      }
      case 'measurements/upsert': {
        const data = clinicalData(state), records = action.records.map(input => { const record = validateMeasurement(input); delete record.generatedTelemetry; return record })
        if (records.some(r => !canAccessSubject(state, r.astronautId) || r.origin !== state.scope || !state.mission.crew.some(c => c.id === r.astronautId))) throw new Error('Record subject or origin does not match this workspace.')
        const otherIds = new Set([...state.mission.measurements, ...state.personal.measurements].filter(r => !data.measurements.includes(r)).map(r => r.id))
        const reservedIds = new Set([...(data.assessments ?? []), ...(data.environment ?? []), ...(data.examinations ?? []), ...(data.activities ?? [])].map(r => r.id))
        if (records.some(r => otherIds.has(r.id) || reservedIds.has(r.id))) throw new Error('Record ID belongs to another workspace or record category; existing record retained.')
        const measurements = appendAcquisition(data.measurements, records)
        return reevaluate(updateClinical({ ...state, notice: 'Observation saved locally.' }, { ...data, measurements }))
      }
      case 'assessment/add': {
        const record = assessmentSchema.parse(action.record) as AssessmentResult
        if (state.scope !== 'observed' || record.origin !== 'observed' || !canAccessSubject(state, record.astronautId)) throw new Error('Live assessments are saved only in the observed workspace.')
        const data = state.personal
        let activities = data.activities ?? []
        if (record.kind === 'physical') activities = [...activities.filter(a => a.id !== `activity-${record.id}`), physicalActivity(record)]
        if ((record.kind === 'visual' || record.kind === 'physical') && record.quality !== (record.result.sufficient ? 'estimated' : 'missing')) throw new Error('Camera quality must match available observations.')
        return reevaluate({ ...state, personal: { ...data, activities, assessments: [...data.assessments.filter(a => a.id !== record.id), record] }, notice: 'Assessment saved locally. No diagnosis is inferred.' })
      }
      case 'sensors/ingest': {
        const batch = validateSensorBatch(action.batch, state.scope), data = clinicalData(state)
        const records = [...batch.measurements, ...batch.environment, ...batch.examinations]
        if (records.some(r => !r.astronautId || !canAccessSubject(state, r.astronautId) || !state.mission.crew.some(c => c.id === r.astronautId))) throw new Error('Acquisition subject is not accessible.')
        if (batch.environment.some(r => !state.mission.compartments.some(c => c.id === r.compartmentId))) throw new Error('Unknown acquisition compartment.')
        const nonMeasurementIds = new Set([...data.assessments, ...(data.activities ?? []), ...data.alerts, ...data.encounters].map(r => r.id))
        if (records.some(r => nonMeasurementIds.has(r.id))) throw new Error('Acquisition ID conflicts with an existing assessment/activity/case.')
        const measurements = appendAcquisition(data.measurements, batch.measurements), environment = appendAcquisition(data.environment ?? [], batch.environment), examinations = appendAcquisition(data.examinations ?? [], batch.examinations)
        if (new Set([...measurements, ...environment, ...examinations].map(r => r.id)).size !== measurements.length + environment.length + examinations.length) throw new Error('Acquisition ID crosses record categories.')
        return reevaluate(updateClinical({ ...state, notice: 'Acquisition batch saved atomically. No real hardware connection is claimed.' }, { ...data, measurements, environment, examinations }))
      }
      case 'alerts/replace': {
        const data = clinicalData(state), read = new Set(data.alerts.filter(a => a.status === 'acknowledged').map(a => a.id))
        return updateClinical(state, { ...data, alerts: action.alerts.map(a => read.has(a.id) ? { ...a, status: 'acknowledged' } : a) })
      }
      case 'alerts/acknowledge': {
        const data = clinicalData(state)
        return updateClinical({ ...state, notice: 'Alert acknowledged. This does not resolve the case.' }, { ...data, alerts: data.alerts.map(a => a.id === action.id && a.astronautId && canAccessSubject(state, a.astronautId) ? { ...a, status: 'acknowledged' } : a) })
      }
      case 'encounter/transition': {
        const data = clinicalData(state)
        if (action.transition === 'resolve' && state.mode !== 'medical') throw new Error('Case resolution requires the medical officer review context.')
        return updateClinical({ ...state, notice: action.transition === 'review' ? 'Review started in the current demo context; this is not authenticated clinician attribution.' : 'Case status updated by the Medical Officer demo context; this is not proof of recovery.' }, { ...data, encounters: data.encounters.map(e => e.id === action.id && canAccessSubject(state, e.astronautId) ? transitionEncounter(e, action.transition, action.at) : e) })
      }
      case 'encounter/follow-up': {
        const data = clinicalData(state)
        const followUp = actionSchema.parse(action.action) as ClinicalAction
        return updateClinical({ ...state, notice: 'Follow-up recorded locally. Resolution is a separate medical-context action.' }, { ...data, encounters: data.encounters.map(e => e.id === action.id && canAccessSubject(state, e.astronautId) ? addFollowUp(e, followUp) : e) })
      }
      case 'notice': return { ...state, notice: action.message }
      case 'fixture/reset': return { ...state, mission: initialState(state.mission.seed), notice: 'Synthetic mission reset; observed records preserved.' }
      case 'demo/start': {
        const mission = step({ ...runScenario(initialState(42), 'sleep-disruption'), paused: false }, 180)
        mission.paused = true
        return { ...state, mode: 'mission', scope: 'synthetic', section: 'performance', selectedAstronautId: state.sessionAstronautId, selectedCompartmentId: null, mission: { ...mission, ...synchronizeClinical(mission) }, notice: 'Synthetic demonstration ready. Your observed records were preserved.' }
      }
    }
  } catch (error) { return { ...state, notice: `Not saved: ${readableValidationError(error)}` } }
}
