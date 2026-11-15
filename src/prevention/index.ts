/** AEGIS - team-directed, AI-assisted implementation (Google Gemini); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
export {
  createSyntheticPreventionPlans,
  createSyntheticHydrationRecords,
  ensureSyntheticPreventionPlans,
  buildUserPreventionPlan,
  buildHydrationRecord,
  buildManualExerciseCompletion,
  SYNTHETIC_PREVENTION_EPOCH,
} from './fixtures'
export type {
  CreateUserPlanInput,
  CreateHydrationInput,
  ManualExerciseCompletionBundle,
} from './fixtures'

export {
  selectPreventionSchedule,
  selectPreventionItemStatus,
  selectHydrationSummary,
  selectSleepRecoveryContext,
  computeActiveScheduleWindow,
} from './selectors'
export type {
  PreventionStateContainer,
  PreventionEvidenceRef,
  EvaluatedPreventionItem,
  HydrationPeriodSummary,
  SleepRecoveryContext,
  PreventionScheduleSummary,
} from './selectors'

export { PreventiveHealth } from './PreventiveHealth'
