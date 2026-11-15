/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import type { AssessmentResult, Compartment, CrewMember, DataOrigin, EnvironmentalMeasurement, ExaminationRecord, HealthAlert, HealthMeasurement, MedicalEncounter, PerformanceAssessment, PerformanceObservation } from '../../contracts/types'
import type { AppState } from '../app/state/reducer'
import { selectWorkspace } from '../app/state/reducer'
import { assessPerformance, performanceObservations } from '../health/intelligence'
import { selectPreventionSchedule } from '../prevention/selectors'
import type { PreventionScheduleSummary } from '../prevention/selectors'
import { selectAvailableMedicalEquipment } from '../resources/selectors'
import type { MedicalEquipmentQueryResult } from '../resources/selectors'

/** Records the assistant may read for one question. Built from the same reducer state
 *  and selectors as the rest of AEGIS, at question time; never cached between turns. */
export interface ScopedRecords {
  ok: true
  origin: Extract<DataOrigin, 'observed' | 'synthetic'>
  subject: CrewMember
  compartments: Compartment[]
  asOf: string
  measurements: HealthMeasurement[]
  assessments: AssessmentResult[]
  /** Environmental context reported to the user (synthetic: current compartment). */
  environment: EnvironmentalMeasurement[]
  /** All same-origin environmental records the subject may see (ship data in synthetic). */
  environmentAll: EnvironmentalMeasurement[]
  examinations: ExaminationRecord[]
  alerts: HealthAlert[]
  encounters: MedicalEncounter[]
  observations: PerformanceObservation[]
  performance: PerformanceAssessment
  prevention: PreventionScheduleSummary
  equipment: MedicalEquipmentQueryResult
  /** Every record/alert/case/action ID the reply may cite. */
  allowedIds: Set<string>
  /** Names and IDs of other crew members, used ONLY to refuse cross-subject requests. */
  otherSubjectTerms: string[]
}
export type AssistantScope = ScopedRecords | { ok: false; reason: string }
const ORIGIN_PREFIX = /^(?:synthetic|observed|research_dataset)-/

/** UI isolation only: demo role switching is not authentication or authorization. */
export function scopeFromState(state: AppState, now: Date = new Date()): AssistantScope {
  if (state.mode !== 'astronaut') return { ok: false, reason: 'The Guided Assistant is available in Astronaut Mode only, for the signed-in demo astronaut’s own records.' }
  const subjectId = state.sessionAstronautId
  if (state.selectedAstronautId !== subjectId) return { ok: false, reason: 'The selected profile does not match the Astronaut Mode subject. Re-select your own profile.' }
  const workspace = selectWorkspace(state)
  const subject = workspace.crew.find(c => c.id === subjectId)
  if (!subject) return { ok: false, reason: 'Your profile is not available in this workspace.' }
  const origin = state.scope
  const asOf = origin === 'synthetic' ? workspace.missionTime : now.toISOString()
  // Defence in depth: re-filter by subject AND origin even though selectWorkspace already scopes.
  const own = <T extends { astronautId?: string | undefined; origin: DataOrigin }>(r: T) => r.astronautId === subjectId && r.origin === origin
  const measurements = workspace.measurements.filter(own)
  const assessments = (workspace.assessments ?? []).filter(own)
  const examinations = (workspace.examinations ?? []).filter(own)
  // Synthetic: the subject's scenario compartment (not a personal exposure measurement).
  // Observed: only environmental records explicitly associated with this subject.
  const environmentAll = workspace.environment.filter(r => r.origin === origin && (origin !== 'observed' || r.astronautId === subjectId))
  const environment = environmentAll.filter(r => origin === 'observed' || r.compartmentId === subject.currentCompartmentId)
  const encounters = (workspace.encounters ?? []).filter(own)
  const recordIds = new Set<string>([...measurements, ...assessments, ...environmentAll, ...examinations].map(r => r.id))
  // Alert IDs carry their origin prefix (health/engine.ts). Unprefixed alerts are kept
  // only when every cited observation belongs to this subject's scoped records.
  const alerts = workspace.alerts.filter(a => a.astronautId === subjectId && (ORIGIN_PREFIX.test(a.id) ? a.id.startsWith(`${origin}-`) : a.evidence.every(e => recordIds.has(e.observationId))))
  // Same inputs as Human Performance Assessment, so both views agree.
  const scoped = { ...workspace, measurements, assessments, examinations, environment: environmentAll, encounters, alerts, crew: [subject] }
  const observations = performanceObservations(scoped, subjectId, origin)
  const performance = assessPerformance(scoped, subjectId, origin, asOf)
  const prevention = selectPreventionSchedule(state, subjectId, origin, asOf)
  const equipment = selectAvailableMedicalEquipment(state, origin, { asOf, preserveRawLegacyResources: true })
  const allowedIds = new Set<string>([...recordIds, ...alerts.map(r => r.id), ...encounters.map(r => r.id)])
  for (const p of prevention.items) allowedIds.add(p.plan.id)
  for (const h of prevention.hydrationSummary.records) if (h.astronautId === subjectId && h.origin === origin) allowedIds.add(h.id)
  for (const r of equipment.items) if (r.resource.origin === origin) allowedIds.add(r.id)
  for (const e of encounters) for (const a of e.actions) allowedIds.add(a.id)
  const otherSubjectTerms = state.mission.crew.filter(c => c.id !== subjectId).flatMap(c => [c.id, c.displayName, ...c.displayName.split(/\s+/)])
  return { ok: true, origin, subject, compartments: workspace.compartments, asOf, measurements, assessments, environment, environmentAll, examinations, alerts, encounters, observations, performance, prevention, equipment, allowedIds, otherSubjectTerms }
}

/** Stable key: any change of user context, workspace or subject resets the conversation. */
export function conversationKey(state: AppState) {
  return [state.mode, state.scope, state.sessionAstronautId, state.selectedAstronautId ?? 'none'].join('|')
}
