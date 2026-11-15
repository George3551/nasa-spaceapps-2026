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
