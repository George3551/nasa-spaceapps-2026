import type { ActivityRecord, AssessmentResult, ClinicalAction, ClinicalWorkspace, HealthAlert, HealthMeasurement, HydrationRecord, ISODateTime, MetricKey, MissionSnapshot, MissionState, PreventionCompletionRecord, PreventionPlanItem, ResourceAvailability, ResourceOccupancy, ResourceOperability, ScenarioId, SensorBatch } from '../../../contracts/types'
import { initialState, runScenario, step } from '../../simulation/engine'
import { synchronizeClinical } from '../../health/engine'
import { addFollowUp, transitionEncounter } from '../../health/clinical'
import { actionSchema, activitySchema, assessmentSchema, preventionCompletionSchema, validateHydrationRecord, validateMeasurement, validatePreventionPlan } from '../../shared/validation'
import { physicalActivity } from '../../vision/records'
import { appendAcquisition, validateSensorBatch } from '../../sensors/ingestion'
import { createSyntheticHydrationRecords, ensureSyntheticPreventionPlans } from '../../prevention/fixtures'
import { applyResourceStatusUpdate, ensureSyntheticMedicalResources } from '../../resources/inventory'

export type Section = 'dashboard' | 'health' | 'spacecraft' | 'simulation' | 'events' | 'assessments' | 'research' | 'visual' | 'physical' | 'anatomy' | 'performance' | 'sensors' | 'prevention' | 'resources'
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
  | { type: 'prevention/plan-upsert'; plan: PreventionPlanItem }
  | { type: 'prevention/complete'; planId: string; completion: PreventionCompletionRecord; activity?: ActivityRecord; measurement?: HealthMeasurement; hydration?: HydrationRecord }
  | { type: 'prevention/evidence-withhold'; planId: string; evidenceId: string; removeCanonicalRecord?: boolean; at: ISODateTime }
  | { type: 'hydration/add'; record: HydrationRecord }
  | { type: 'resources/update-status'; id: string; availability: ResourceAvailability; operability: ResourceOperability; occupancy?: ResourceOccupancy; quantity?: number | null; statusReason: string; updatedAt: ISODateTime; actorRole?: string }
  | { type: 'notice'; message: string | null }
  | { type: 'fixture/reset' }

function seedMissionDefaults(mission: MissionSnapshot): MissionSnapshot {
  const crewIds = mission.crew.map(c => c.id)
  return {
    ...mission,
    resources: ensureSyntheticMedicalResources(mission.resources, mission.missionTime),
    preventionPlans: ensureSyntheticPreventionPlans(mission.preventionPlans, crewIds, mission.missionTime),
    hydrationRecords: mission.hydrationRecords ?? createSyntheticHydrationRecords(crewIds),
  }
}

export function createAppState(): AppState {
  return { mission: seedMissionDefaults(initialState()), personal: { measurements: [], assessments: [], alerts: [], encounters: [], activities: [], environment: [], examinations: [], preventionPlans: [], hydrationRecords: [] }, section: 'health', mode: 'astronaut', scope: 'observed', sessionAstronautId: 'crew-01', selectedAstronautId: 'crew-01', selectedCompartmentId: null, notice: null }
}
export function canAccessSubject(state: AppState, id: string) {
  return state.mode === 'astronaut' ? id === state.sessionAstronautId : state.mode === 'medical' || state.scope === 'synthetic'
}
// UI isolation only; real authentication and authorization require a trusted boundary.
export function selectWorkspace(state: AppState): MissionState {
  const base = state.scope === 'synthetic' ? state.mission : { ...state.mission, ...state.personal, environment: state.personal.environment ?? [], examinations: state.personal.examinations ?? [], activities: state.personal.activities ?? [], preventionPlans: state.personal.preventionPlans ?? [], hydrationRecords: state.personal.hydrationRecords ?? [], events: [], crew: state.mission.crew.map(c => {
    const baselines: Partial<Record<MetricKey, number>> = {}
    const records = state.personal.measurements.filter(r => r.astronautId === c.id && r.value !== null && r.quality === 'valid').sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    for (const metric of new Set(records.map(r => r.metric))) {
      const first = records.filter(r => r.metric === metric).slice(0, 3)
      if (first.length === 3 && first.every(r => r.unit === first[0]!.unit)) baselines[metric] = first.reduce((sum, r) => sum + r.value!, 0) / 3
    }
    return { ...c, baselines }
  }) }
  if (state.mode !== 'astronaut') return base
  const own = state.sessionAstronautId
  return { ...base, crew: base.crew.filter(c => c.id === own), measurements: base.measurements.filter(r => r.astronautId === own), assessments: (base.assessments ?? []).filter(r => r.astronautId === own), encounters: (base.encounters ?? []).filter(r => r.astronautId === own), alerts: base.alerts.filter(r => r.astronautId === own), activities: base.activities.filter(r => r.astronautId === own), examinations: (base.examinations ?? []).filter(r => r.astronautId === own), preventionPlans: (base.preventionPlans ?? []).filter(r => r.astronautId === own), hydrationRecords: (base.hydrationRecords ?? []).filter(r => r.astronautId === own), environment: base.environment.filter(r => state.scope === 'synthetic' || r.astronautId === own), events: [] }
}
function updateClinical(state: AppState, data: ClinicalWorkspace): AppState {
  return state.scope === 'synthetic' ? { ...state, mission: { ...state.mission, ...data } } : { ...state, personal: { ...state.personal, ...data } }
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
        return { ...state, section: action.section }
      case 'mode/set': return { ...state, mode: action.mode, scope: action.mode === 'mission' ? 'synthetic' : 'observed', selectedAstronautId: state.sessionAstronautId, section: action.mode === 'mission' ? 'dashboard' : 'health', notice: null }
      case 'scope/set': return { ...state, scope: state.mode === 'mission' ? 'synthetic' : action.scope, notice: null }
      case 'crew/select': return canAccessSubject(state, action.id) && state.mission.crew.some(c => c.id === action.id) ? { ...state, selectedAstronautId: action.id, section: state.section === 'prevention' ? 'prevention' : 'health' } : state
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
        const fresh = seedMissionDefaults(runScenario({ ...state.mission, seed: action.seed }, action.scenario))
        return { ...state, mission: fresh, selectedCompartmentId: null, notice: 'Synthetic scenario reset. Personal observations and assessments were preserved.' }
      }
      case 'mission/replace': {
        if (state.mode !== 'mission') return state
        const mission = seedMissionDefaults({ ...action.mission, assessments: action.mission.assessments ?? [], encounters: action.mission.encounters ?? [], sources: action.mission.sources ?? [], resources: action.mission.resources ?? [] })
        return { ...state, mission: { ...mission, ...synchronizeClinical(mission) }, selectedAstronautId: mission.crew.some(c => c.id === state.selectedAstronautId) ? state.selectedAstronautId : mission.crew[0]?.id ?? null }
      }
      case 'measurements/upsert': {
        const data = clinicalData(state), records = action.records.map(validateMeasurement)
        if (records.some(r => !canAccessSubject(state, r.astronautId) || r.origin !== state.scope || !state.mission.crew.some(c => c.id === r.astronautId))) throw new Error('Record subject or origin does not match this workspace.')
        const measurements = [...new Map([...data.measurements, ...records].map(r => [r.id, r])).values()]
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
        return updateClinical(state, { ...data, alerts: data.alerts.map(a => a.id === action.id && a.astronautId && canAccessSubject(state, a.astronautId) ? { ...a, status: 'acknowledged' } : a) })
      }
      case 'encounter/transition': {
        const data = clinicalData(state)
        if (action.transition === 'resolve' && state.mode !== 'medical') throw new Error('Case resolution requires the medical officer review context.')
        return updateClinical(state, { ...data, encounters: data.encounters.map(e => e.id === action.id && canAccessSubject(state, e.astronautId) ? transitionEncounter(e, action.transition, action.at) : e) })
      }
      case 'encounter/follow-up': {
        const data = clinicalData(state)
        const followUp = actionSchema.parse(action.action) as ClinicalAction
        return updateClinical(state, { ...data, encounters: data.encounters.map(e => e.id === action.id && canAccessSubject(state, e.astronautId) ? addFollowUp(e, followUp) : e) })
      }
      case 'prevention/plan-upsert': {
        const data = clinicalData(state), plan = validatePreventionPlan(action.plan)
        if (!canAccessSubject(state, plan.astronautId) || plan.origin !== state.scope || !state.mission.crew.some(c => c.id === plan.astronautId)) {
          throw new Error('Prevention plan subject or origin does not match this workspace.')
        }
        const otherIds = new Set([...data.measurements, ...data.assessments, ...(data.examinations ?? []), ...(data.environment ?? []), ...(data.hydrationRecords ?? [])].map(r => r.id))
        if (otherIds.has(plan.id)) throw new Error('Prevention plan ID conflicts with an existing workspace record.')
        const existingPlans = data.preventionPlans ?? []
        const preventionPlans = [...new Map([...existingPlans, plan].map(p => [p.id, p])).values()]
        return updateClinical({ ...state, notice: 'Prevention plan saved locally.' }, { ...data, preventionPlans })
      }
      case 'prevention/complete': {
        const data = clinicalData(state)
        const completion = preventionCompletionSchema.parse(action.completion) as PreventionCompletionRecord
        if (!canAccessSubject(state, completion.astronautId) || completion.origin !== state.scope || !state.mission.crew.some(c => c.id === completion.astronautId)) {
          throw new Error('Completion subject or origin does not match this workspace.')
        }
        const plans = data.preventionPlans ?? []
        const target = plans.find(p => p.id === action.planId)
        if (!target || target.astronautId !== completion.astronautId || target.origin !== state.scope) {
          throw new Error('Target prevention plan not found in this workspace.')
        }
        let activities = data.activities ?? []
        let measurements = data.measurements
        let hydrationRecords = data.hydrationRecords ?? []
        if (action.activity) {
          const act = activitySchema.parse(action.activity) as ActivityRecord
          if (act.astronautId !== completion.astronautId || act.origin !== state.scope) throw new Error('Activity subject or origin mismatch.')
          activities = [...activities.filter(a => a.id !== act.id), act]
        }
        if (action.measurement) {
          const m = validateMeasurement(action.measurement)
          if (m.astronautId !== completion.astronautId || m.origin !== state.scope) throw new Error('Measurement subject or origin mismatch.')
          measurements = [...measurements.filter(r => r.id !== m.id), m]
        }
        if (action.hydration) {
          const h = validateHydrationRecord(action.hydration)
          if (h.astronautId !== completion.astronautId || h.origin !== state.scope) throw new Error('Hydration subject or origin mismatch.')
          hydrationRecords = [...hydrationRecords.filter(r => r.id !== h.id), h]
        }
        const linkedObservationIds = [...new Set([...target.linkedObservationIds, ...completion.evidenceIds])]
        const withheldObservationIds = (target.withheldObservationIds ?? []).filter(id => !completion.evidenceIds.includes(id))
        const updatedPlan = validatePreventionPlan({
          ...target,
          updatedAt: completion.completedAt,
          linkedObservationIds,
          withheldObservationIds,
          completions: [...target.completions, completion],
          history: [
            ...target.history,
            {
              id: `hist-${target.id}-${Date.parse(completion.completedAt)}-${target.history.length + 1}`,
              at: completion.completedAt,
              action: completion.source === 'manual' ? 'completed_manual' : 'evidence_linked',
              summary: `Recorded ${completion.source} completion (${completion.evidenceIds.join(', ')}).`,
              evidenceIds: completion.evidenceIds,
            },
          ],
        })
        const preventionPlans = plans.map(p => (p.id === target.id ? updatedPlan : p))
        return updateClinical(
          { ...state, notice: 'Prevention completion and linked evidence saved locally.' },
          { ...data, activities, measurements, hydrationRecords, preventionPlans },
        )
      }
      case 'prevention/evidence-withhold': {
        const data = clinicalData(state)
        const plans = data.preventionPlans ?? []
        const target = plans.find(p => p.id === action.planId)
        if (!target || !canAccessSubject(state, target.astronautId) || target.origin !== state.scope) {
          throw new Error('Target prevention plan is not accessible in this workspace.')
        }
        const linkedObservationIds = [...new Set([...target.linkedObservationIds, action.evidenceId])]
        const withheldObservationIds = [...new Set([...(target.withheldObservationIds ?? []), action.evidenceId])]
        const updatedPlan = validatePreventionPlan({
          ...target,
          updatedAt: action.at,
          linkedObservationIds,
          withheldObservationIds,
          history: [
            ...target.history,
            {
              id: `hist-${target.id}-withhold-${target.history.length + 1}`,
              at: action.at,
              action: 'evidence_withheld',
              summary: `Linked evidence ${action.evidenceId} withheld/removed; completion requires verifiable evidence.`,
              evidenceIds: [action.evidenceId],
            },
          ],
        })
        const activities = action.removeCanonicalRecord
          ? (data.activities ?? []).filter(a => a.id !== action.evidenceId)
          : data.activities ?? []
        const measurements = action.removeCanonicalRecord
          ? data.measurements.filter(m => m.id !== action.evidenceId)
          : data.measurements
        const hydrationRecords = action.removeCanonicalRecord
          ? (data.hydrationRecords ?? []).filter(h => h.id !== action.evidenceId)
          : data.hydrationRecords ?? []
        const preventionPlans = plans.map(p => (p.id === target.id ? updatedPlan : p))
        return updateClinical(
          { ...state, notice: 'Linked evidence withheld. Schedule status recalculated from remaining verified evidence.' },
          { ...data, activities, measurements, hydrationRecords, preventionPlans },
        )
      }
      case 'hydration/add': {
        const data = clinicalData(state), record = validateHydrationRecord(action.record)
        if (!canAccessSubject(state, record.astronautId) || record.origin !== state.scope || !state.mission.crew.some(c => c.id === record.astronautId)) {
          throw new Error('Hydration record subject or origin does not match this workspace.')
        }
        const otherIds = new Set([...data.measurements, ...data.assessments, ...(data.examinations ?? []), ...(data.environment ?? []), ...(data.preventionPlans ?? [])].map(r => r.id))
        if (otherIds.has(record.id)) throw new Error('Hydration record ID conflicts with an existing workspace record.')
        const hydrationRecords = [...new Map([...(data.hydrationRecords ?? []), record].map(r => [r.id, r])).values()]
        let preventionPlans = data.preventionPlans ?? []
        if (record.linkedPlanId) {
          preventionPlans = preventionPlans.map(p =>
            p.id === record.linkedPlanId && p.astronautId === record.astronautId && p.origin === state.scope
              ? validatePreventionPlan({
                  ...p,
                  updatedAt: record.timestamp,
                  linkedObservationIds: [...new Set([...p.linkedObservationIds, record.id])],
                  withheldObservationIds: (p.withheldObservationIds ?? []).filter(id => id !== record.id),
                  history: [
                    ...p.history,
                    {
                      id: `hist-${p.id}-hydration-${p.history.length + 1}`,
                      at: record.timestamp,
                      action: 'evidence_linked',
                      summary: `Linked hydration entry ${record.id} (${record.amount ?? 'missing'} ${record.unit}).`,
                      evidenceIds: [record.id],
                    },
                  ],
                })
              : p,
          )
        }
        return updateClinical(
          { ...state, notice: 'Hydration entry saved locally. No clinical hydration target is implied.' },
          { ...data, hydrationRecords, preventionPlans },
        )
      }
      case 'resources/update-status': {
        if (state.scope !== 'synthetic') {
          throw new Error('Resource status changes are only permitted in the synthetic mission workspace.')
        }
        const baseResources = ensureSyntheticMedicalResources(state.mission.resources, state.mission.missionTime)
        const resources = applyResourceStatusUpdate(baseResources, action)
        return {
          ...state,
          mission: { ...state.mission, resources },
          notice: 'Synthetic resource status updated locally.',
        }
      }
      case 'notice': return { ...state, notice: action.message }
      case 'fixture/reset': return { ...state, mission: seedMissionDefaults(initialState(state.mission.seed)), notice: 'Synthetic mission reset; observed records preserved.' }
    }
  } catch (error) { return { ...state, notice: `Not saved: ${error instanceof Error ? error.message : 'Invalid data'}` } }
}
