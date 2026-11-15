/** AEGIS - team-directed, AI-assisted implementation (Google Gemini); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
export {
  createSyntheticMedicalResources,
  ensureSyntheticMedicalResources,
  applyResourceStatusUpdate,
  resourceCategoryLabels,
  qualificationLabels,
  SYNTHETIC_RESOURCE_EPOCH,
} from './inventory'
export type { ResourceStatusUpdateInput } from './inventory'

export {
  selectAvailableMedicalEquipment,
  selectMedicalResourceById,
  queryEquipmentCapability,
  evaluateMedicalResource,
  meetsQualification,
} from './selectors'
export type {
  ResourceStateContainer,
  EvaluatedMedicalResource,
  MedicalEquipmentFilter,
  MedicalEquipmentQueryResult,
  EquipmentCapabilityAnswer,
} from './selectors'

export { MissionResources } from './MissionResources'
