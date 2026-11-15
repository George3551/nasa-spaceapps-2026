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
