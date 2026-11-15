/** AEGIS - team-directed, AI-assisted implementation (Google Gemini); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import type {
  CompartmentId,
  DataOrigin,
  ISODateTime,
  MedicalResource,
  MissionState,
  OperatorQualification,
  ResourceAvailability,
  ResourceCategory,
  ResourceOccupancy,
  ResourceOperability,
} from '../../contracts/types'
import { ensureSyntheticMedicalResources, qualificationLabels, resourceCategoryLabels, SYNTHETIC_RESOURCE_EPOCH } from './inventory'

export interface ResourceStateContainer {
  mission: MissionState;
  scope?: DataOrigin;
}

export interface EvaluatedMedicalResource {
  resource: MedicalResource;
  id: string;
  label: string;
  category: ResourceCategory;
  categoryLabel: string;
  availability: ResourceAvailability;
  operability: ResourceOperability;
  occupancy: ResourceOccupancy;
  quantity: number | null;
  unit: string;
  compartmentId: CompartmentId | null;
  requiredQualification: OperatorQualification;
  qualificationLabel: string;
  qualificationNote: string;
  lastVerifiedAt: ISODateTime | null;
  verificationFreshness: 'verified' | 'stale' | 'unverified';
  usableForExamination: boolean;
  usabilityReason: string;
  supervisionWarning: string | null;
  statusReason: string;
  constraints: string;
  syntheticDemo: true;
}

export interface MedicalEquipmentFilter {
  category?: ResourceCategory | 'all';
  availability?: ResourceAvailability | 'all';
  operability?: ResourceOperability | 'all';
  compartmentId?: CompartmentId | 'all';
  search?: string;
  onlyAvailableAndFunctional?: boolean;
  actorQualification?: OperatorQualification;
  asOf?: ISODateTime;
  /** When true, returns raw resource records without injecting default v4.2 fixtures into a minimal legacy array. */
  preserveRawLegacyResources?: boolean;
}

export interface MedicalEquipmentQueryResult {
  scope: DataOrigin;
  asOf: ISODateTime;
  syntheticInventory: true;
  observedHardwareConnected: false;
  scopeNotice: string;
  items: EvaluatedMedicalResource[];
  counts: {
    total: number;
    availableAndFunctional: number;
    unavailable: number;
    outOfService: number;
    unknown: number;
  };
  limitations: string[];
}

export interface EquipmentCapabilityAnswer {
  capability: string;
  scope: DataOrigin;
  asOf: ISODateTime;
  status: 'available_and_functional' | 'unavailable' | 'out_of_service' | 'unknown' | 'qualification_restricted';
  matchingDevices: EvaluatedMedicalResource[];
  usableDevices: EvaluatedMedicalResource[];
  qualificationMet: boolean | 'unknown';
  summary: string;
  supervisionNotice: string;
  demonstrationOnly: true;
}

const QUALIFICATION_RANK: Record<OperatorQualification, number> = {
  any_crew: 1,
  trained_operator: 2,
  crew_medical_officer: 3,
  unknown: 99,
}

export function meetsQualification(
  actor: OperatorQualification | undefined,
  required: OperatorQualification,
): boolean | 'unknown' {
  if (required === 'unknown') return 'unknown'
  if (!actor) return required === 'any_crew' ? true : 'unknown'
  if (actor === 'unknown') return required === 'any_crew' ? true : false
  return QUALIFICATION_RANK[actor] >= QUALIFICATION_RANK[required]
}

function resolveMission(source: ResourceStateContainer | MissionState): MissionState {
  return 'mission' in source ? source.mission : source
}

/**
 * Evaluates a single MedicalResource without inferring availability, operability,
 * or quantity from missing metadata.
 */
export function evaluateMedicalResource(
  raw: MedicalResource,
  asOf: ISODateTime,
  actorQualification?: OperatorQualification,
): EvaluatedMedicalResource {
  const category: ResourceCategory = raw.category ?? 'general_equipment'
  // Never infer availability or operability if omitted on legacy or incomplete records.
  const availability: ResourceAvailability = raw.availability ?? 'unknown'
  const operability: ResourceOperability = raw.operability ?? 'unknown'
  const occupancy: ResourceOccupancy = raw.occupancy ?? 'unknown'
  const requiredQualification: OperatorQualification = raw.requiredQualification ?? 'unknown'
  const lastVerifiedAt = raw.lastVerifiedAt ?? null

  const nowMs = Date.parse(asOf)
  const verifiedMs = lastVerifiedAt ? Date.parse(lastVerifiedAt) : NaN
  // 24-hour engineering verification freshness window (not a clinical certification).
  const verificationFreshness: EvaluatedMedicalResource['verificationFreshness'] =
    !Number.isFinite(nowMs) || !Number.isFinite(verifiedMs) || verifiedMs > nowMs || availability === 'unknown' || operability === 'unknown'
      ? 'unverified'
      : Number.isFinite(nowMs) && nowMs - verifiedMs > 24 * 3600000
        ? 'stale'
        : 'verified'

  const qualCheck = meetsQualification(actorQualification, requiredQualification)
  const hasPositiveOrUnmodeledQty = raw.quantity === null ? availability === 'available' : raw.quantity > 0
  const baseUsable =
    availability === 'available' &&
    operability === 'functional' &&
    verificationFreshness === 'verified' &&
    occupancy === 'free' &&
    hasPositiveOrUnmodeledQty &&
    (actorQualification === undefined || qualCheck === true)

  let usabilityReason: string
  if (verificationFreshness !== 'verified') {
    usabilityReason = 'Equipment verification is missing, future-dated or stale; confirm status before considering it ready.'
  } else if (availability === 'unknown' || operability === 'unknown') {
    usabilityReason = 'Availability or operability is unknown/unverified; AEGIS never assumes missing equipment metadata means available.'
  } else if (operability === 'out_of_service') {
    usabilityReason = `Equipment is out of service (availability: ${availability}); do not use for examinations.`
  } else if (availability === 'unavailable') {
    usabilityReason = `Equipment is functional (${operability}) but currently unavailable (${occupancy === 'in_use' ? 'occupied / in use' : 'not available'}).`
  } else if (occupancy !== 'free') {
    usabilityReason = 'Equipment occupancy is in use, reserved or unknown; no free unit is confirmed.'
  } else if (!hasPositiveOrUnmodeledQty) {
    usabilityReason = 'Available quantity is 0; no unit is currently free.'
  } else if (actorQualification !== undefined && qualCheck !== true) {
    usabilityReason = `Operator qualification requirement (${qualificationLabels[requiredQualification]}) is not met by declared role (${actorQualification}).`
  } else {
    usabilityReason = 'Synthetic fixture is listed as available and functional in the simulated inventory.'
  }

  let supervisionWarning: string | null = null
  if (!baseUsable) {
    supervisionWarning = 'Unsupervised or substitute procedures are not recommended when equipment is unavailable, out of service, unverified, or lacks qualified operator coverage.'
  } else if (requiredQualification === 'crew_medical_officer' || requiredQualification === 'trained_operator') {
    supervisionWarning = `Declared operator requirement: ${qualificationLabels[requiredQualification]}. Do not perform unsupervised procedures without required qualification.`
  }

  return {
    resource: raw,
    id: raw.id,
    label: raw.label,
    category,
    categoryLabel: resourceCategoryLabels[category],
    availability,
    operability,
    occupancy,
    quantity: raw.quantity,
    unit: raw.unit,
    compartmentId: raw.compartmentId ?? null,
    requiredQualification,
    qualificationLabel: qualificationLabels[requiredQualification],
    qualificationNote: raw.qualificationNote ?? 'Declared prototype fixture, not a verified credential.',
    lastVerifiedAt,
    verificationFreshness,
    usableForExamination: baseUsable,
    usabilityReason,
    supervisionWarning,
    statusReason:
      raw.statusReason ??
      (raw.availability === undefined || raw.operability === undefined
        ? 'Legacy or incomplete resource record; availability and operability were not declared.'
        : 'Synthetic fixture status.'),
    constraints: raw.constraints ?? 'Synthetic demonstration inventory; no real spacecraft hardware connection.',
    syntheticDemo: true,
  }
}

/**
 * Primary read-only selector for the Medical Assistant and UI views.
 * Returns onboard medical equipment with explicit availability, operability,
 * declared qualification requirements, and provenance.
 */
export function selectAvailableMedicalEquipment(
  source: ResourceStateContainer | MissionState,
  scope: DataOrigin = 'synthetic',
  filter: MedicalEquipmentFilter = {},
): MedicalEquipmentQueryResult {
  const mission = resolveMission(source)
  const asOf = filter.asOf ?? mission.missionTime ?? SYNTHETIC_RESOURCE_EPOCH
  const rawList = filter.preserveRawLegacyResources
    ? (mission.resources ?? [])
    : ensureSyntheticMedicalResources(mission.resources, asOf)

  const allEvaluated = rawList.map(r => evaluateMedicalResource(r, asOf, filter.actorQualification))
  const counts = {
    total: allEvaluated.length,
    availableAndFunctional: allEvaluated.filter(i => i.usableForExamination).length,
    unavailable: allEvaluated.filter(i => i.availability === 'unavailable').length,
    outOfService: allEvaluated.filter(i => i.operability === 'out_of_service').length,
    unknown: allEvaluated.filter(i => i.availability === 'unknown' || i.operability === 'unknown').length,
  }

  const search = filter.search?.trim().toLowerCase() ?? ''
  const filtered = allEvaluated.filter(item => {
    if (filter.category && filter.category !== 'all' && item.category !== filter.category) return false
    if (filter.availability && filter.availability !== 'all' && item.availability !== filter.availability) return false
    if (filter.operability && filter.operability !== 'all' && item.operability !== filter.operability) return false
    if (filter.compartmentId && filter.compartmentId !== 'all' && item.compartmentId !== filter.compartmentId) return false
    if (filter.onlyAvailableAndFunctional && !item.usableForExamination) return false
    if (search) {
      const haystack = [
        item.id,
        item.label,
        item.category,
        item.categoryLabel,
        item.availability,
        item.operability,
        item.compartmentId ?? '',
        item.statusReason,
        item.qualificationLabel,
      ].join(' ').toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  const scopeNotice =
    scope === 'observed'
      ? 'Observed local-device workspace has no physical spacecraft medical inventory connected. Synthetic onboard fixtures are shown as read-only reference only and must not be treated as real clinical hardware.'
      : 'Synthetic onboard medical resource inventory (SYNTHETIC / DEMO). Does not represent actual hardware on any NASA vehicle.'

  return {
    scope,
    asOf,
    syntheticInventory: true,
    observedHardwareConnected: false,
    scopeNotice,
    items: filtered,
    counts,
    limitations: [
      'Synthetic onboard inventory for demonstration only; does not assert actual presence on any NASA spacecraft.',
      'Availability (available / unavailable / unknown) is modeled separately from operability (functional / out_of_service / unknown).',
      'Operator qualifications are declared fixtures, not authenticated or verified clinical credentials.',
      'No medication selection, dosing calculations, or unsupervised clinical procedure recommendations are generated.',
    ],
  }
}

export function selectMedicalResourceById(
  source: ResourceStateContainer | MissionState,
  resourceId: string,
  scope: DataOrigin = 'synthetic',
  asOf?: ISODateTime,
): EvaluatedMedicalResource | null {
  const result = selectAvailableMedicalEquipment(source, scope, { ...(asOf ? { asOf } : {}) })
  return result.items.find(item => item.id === resourceId) ?? null
}

/**
 * Typed capability query selector for future Medical Assistant and CDSS integration.
 * Answers questions such as "Is ECG equipment available?" or "Which ultrasound device is functional?"
 * without inventing availability when equipment is unavailable, out of service, or unknown.
 */
export function queryEquipmentCapability(
  source: ResourceStateContainer | MissionState,
  capability: 'ecg' | 'ultrasound' | 'vital_signs' | 'first_aid' | 'laboratory' | string,
  scope: DataOrigin = 'synthetic',
  actorQualification?: OperatorQualification,
): EquipmentCapabilityAnswer {
  const mission = resolveMission(source)
  const asOf = mission.missionTime ?? SYNTHETIC_RESOURCE_EPOCH
  const SupervisionDefault = 'Do not perform or recommend unsupervised procedures when operator qualification is unverified or equipment is unavailable/out of service.'

  if (scope === 'observed') {
    return {
      capability,
      scope,
      asOf,
      status: 'unknown',
      matchingDevices: [],
      usableDevices: [],
      qualificationMet: 'unknown',
      summary: `Unknown in observed workspace: no physical onboard inventory for "${capability}" is connected to this local device. Switch to synthetic mission scope to query simulated onboard fixtures.`,
      supervisionNotice: SupervisionDefault,
      demonstrationOnly: true,
    }
  }

  const all = selectAvailableMedicalEquipment(source, 'synthetic', {
    asOf,
    ...(actorQualification ? { actorQualification } : {}),
  }).items

  const normalized = capability.trim().toLowerCase()
  const matchingDevices = all.filter(item => {
    if (normalized === 'ecg' || normalized === 'cardiac' || normalized === 'cardiac_monitoring') {
      return item.category === 'cardiac_monitoring' || item.id.toLowerCase().includes('ecg')
    }
    if (normalized === 'ultrasound' || normalized === 'imaging') {
      return item.category === 'imaging' || item.id.toLowerCase().includes('ultrasound')
    }
    if (normalized === 'vital_signs' || normalized === 'vitals') {
      return item.category === 'vital_signs'
    }
    if (normalized === 'first_aid') {
      return item.category === 'first_aid'
    }
    if (normalized === 'laboratory' || normalized === 'laboratory_point_of_care' || normalized === 'poc' || normalized === 'chemistry') {
      return item.category === 'laboratory_point_of_care' || item.id.toLowerCase().includes('poc')
    }
    return (
      item.id.toLowerCase() === normalized ||
      item.id.toLowerCase().includes(normalized) ||
      item.label.toLowerCase().includes(normalized) ||
      item.category.toLowerCase() === normalized
    )
  })

  if (matchingDevices.length === 0) {
    return {
      capability,
      scope,
      asOf,
      status: 'unknown',
      matchingDevices: [],
      usableDevices: [],
      qualificationMet: 'unknown',
      summary: `No synthetic onboard equipment record matches "${capability}". Status is unknown; availability is never inferred from missing records.`,
      supervisionNotice: SupervisionDefault,
      demonstrationOnly: true,
    }
  }

  if (matchingDevices.every(d => d.verificationFreshness !== 'verified')) return {
    capability, scope, asOf, status: 'unknown', matchingDevices, usableDevices: [], qualificationMet: 'unknown',
    summary: `Equipment status for "${capability}" is unverified, future-dated or stale. Verify the inventory before use.`,
    supervisionNotice: SupervisionDefault, demonstrationOnly: true,
  }
  // Evaluate usability both with and without actorQualification to distinguish qualification restriction from hardware unavailability.
  const hardwareReady = matchingDevices.filter(
    d => d.availability === 'available' && d.operability === 'functional' && d.verificationFreshness === 'verified' && d.occupancy === 'free' && (d.quantity === null || d.quantity > 0),
  )
  const usableDevices = matchingDevices.filter(d => d.usableForExamination)

  if (usableDevices.length > 0) {
    const names = usableDevices.map(d => `${d.label} (${d.id}, ${d.compartmentId ?? 'unassigned'}, qualification: ${d.requiredQualification})`).join('; ')
    const nonUsable = matchingDevices.filter(d => !d.usableForExamination)
    const secondaryNote = nonUsable.length
      ? ` Other matching units not usable: ${nonUsable.map(d => `${d.id} [availability=${d.availability}, operability=${d.operability}]`).join(', ')}.`
      : ''
    return {
      capability,
      scope,
      asOf,
      status: 'available_and_functional',
      matchingDevices,
      usableDevices,
      qualificationMet: actorQualification ? true : usableDevices.every(d => d.requiredQualification === 'any_crew') ? true : 'unknown',
      summary: `Synthetic inventory lists ${usableDevices.length} available & functional unit(s) for "${capability}": ${names}.${secondaryNote}`,
      supervisionNotice:
        usableDevices.find(d => d.supervisionWarning)?.supervisionWarning ??
        'Verify operator qualification and mission procedures before using onboard equipment.',
      demonstrationOnly: true,
    }
  }

  if (hardwareReady.length > 0 && actorQualification !== undefined) {
    const reqs = [...new Set(hardwareReady.map(d => d.requiredQualification))].join(', ')
    return {
      capability,
      scope,
      asOf,
      status: 'qualification_restricted',
      matchingDevices,
      usableDevices: [],
      qualificationMet: false,
      summary: `Equipment for "${capability}" is physically available and functional (${hardwareReady.map(d => d.id).join(', ')}), but requires declared operator qualification (${reqs}) higher than "${actorQualification}". Do not recommend unsupervised operation.`,
      supervisionNotice: SupervisionDefault,
      demonstrationOnly: true,
    }
  }

  if (matchingDevices.every(d => d.availability === 'unknown' || d.operability === 'unknown')) {
    return {
      capability,
      scope,
      asOf,
      status: 'unknown',
      matchingDevices,
      usableDevices: [],
      qualificationMet: 'unknown',
      summary: `Equipment status for "${capability}" (${matchingDevices.map(d => d.id).join(', ')}) is unknown/unverified: ${matchingDevices[0]!.statusReason}`,
      supervisionNotice: SupervisionDefault,
      demonstrationOnly: true,
    }
  }

  if (matchingDevices.every(d => d.operability === 'out_of_service')) {
    return {
      capability,
      scope,
      asOf,
      status: 'out_of_service',
      matchingDevices,
      usableDevices: [],
      qualificationMet: 'unknown',
      summary: `Equipment for "${capability}" (${matchingDevices.map(d => d.id).join(', ')}) is out of service: ${matchingDevices.map(d => `${d.id}: ${d.statusReason}`).join(' | ')}`,
      supervisionNotice: SupervisionDefault,
      demonstrationOnly: true,
    }
  }

  return {
    capability,
    scope,
    asOf,
    status: 'unavailable',
    matchingDevices,
    usableDevices: [],
    qualificationMet: 'unknown',
    summary: `No available & functional unit for "${capability}". Matching fixtures: ${matchingDevices.map(d => `${d.id} (availability=${d.availability}, operability=${d.operability})`).join('; ')}.`,
    supervisionNotice: SupervisionDefault,
    demonstrationOnly: true,
  }
}
