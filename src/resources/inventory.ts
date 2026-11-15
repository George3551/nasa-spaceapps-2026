import type {
  ISODateTime,
  MedicalResource,
  OperatorQualification,
  ResourceAvailability,
  ResourceCategory,
  ResourceOccupancy,
  ResourceOperability,
} from '../../contracts/types'
import { validateResource } from '../shared/validation'

export const SYNTHETIC_RESOURCE_EPOCH = '2026-11-14T08:00:00.000Z'

/**
 * Fictional onboard medical equipment fixtures for synthetic mission simulation.
 * Do not assert actual presence on any specific NASA vehicle.
 */
export function createSyntheticMedicalResources(asOf: ISODateTime = SYNTHETIC_RESOURCE_EPOCH): MedicalResource[] {
  const baseTime = Number.isFinite(Date.parse(asOf)) ? asOf : SYNTHETIC_RESOURCE_EPOCH
  const verifiedRecent = new Date(Date.parse(baseTime) - 15 * 60000).toISOString()
  const verifiedEarlier = new Date(Date.parse(baseTime) - 40 * 60000).toISOString()
  const verifiedFault = new Date(Date.parse(baseTime) - 120 * 60000).toISOString()

  const items: MedicalResource[] = [
    {
      id: 'bp-monitor',
      label: 'Blood pressure monitor (Automated Cuff)',
      category: 'vital_signs',
      availability: 'available',
      operability: 'functional',
      occupancy: 'free',
      quantity: 1,
      unit: 'device',
      compartmentId: 'medical',
      requiredQualification: 'any_crew',
      qualificationNote: 'Declared fixture: standard crew orientation for seated cuff placement; not a verified user credential.',
      lastVerifiedAt: verifiedRecent,
      statusReason: 'Synthetic inventory check recorded in Medical bay; cuff and pressure transducer functional.',
      constraints: 'Requires quiet seated posture for comparable baseline readings. Synthetic fixture only.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-bp-monitor-init',
          at: verifiedRecent,
          availability: 'available',
          operability: 'functional',
          occupancy: 'free',
          quantity: 1,
          reason: 'Initial synthetic inventory fixture.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'ecg-12lead-01',
      label: '12-Lead Diagnostic ECG Unit (Primary)',
      category: 'cardiac_monitoring',
      availability: 'available',
      operability: 'functional',
      occupancy: 'free',
      quantity: 1,
      unit: 'device',
      compartmentId: 'medical',
      requiredQualification: 'crew_medical_officer',
      qualificationNote: 'Declared fixture: requires Crew Medical Officer or trained lead-placement operator. Do not recommend unsupervised diagnostic procedures.',
      lastVerifiedAt: verifiedRecent,
      statusReason: 'Synthetic pre-shift self-test passed; electrode leads stocked in Medical bay.',
      constraints: 'AEGIS stores summary examination reports only; no raw waveform processing or automated arrhythmia diagnosis.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2', 'cdss-conops'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-ecg-12lead-init',
          at: verifiedRecent,
          availability: 'available',
          operability: 'functional',
          occupancy: 'free',
          quantity: 1,
          reason: 'Synthetic pre-shift check recorded as available and functional.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'ecg-patch-02',
      label: 'Wearable Chest ECG Patch Recorder (Secondary)',
      category: 'cardiac_monitoring',
      availability: 'unavailable',
      operability: 'functional',
      occupancy: 'in_use',
      quantity: 0,
      unit: 'device',
      compartmentId: 'living',
      requiredQualification: 'trained_operator',
      qualificationNote: 'Declared fixture: requires trained crew operator for lead check.',
      lastVerifiedAt: verifiedRecent,
      statusReason: 'Synthetic fixture: unit is functional (operability=functional) but currently unavailable (occupied/in_use in Living quarters).',
      constraints: 'Illustrates that functional operability is separate from current availability.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-ecg-patch-init',
          at: verifiedRecent,
          availability: 'unavailable',
          operability: 'functional',
          occupancy: 'in_use',
          quantity: 0,
          reason: 'Assigned to scheduled ambulatory monitoring in Living quarters.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'ultrasound-scanner-01',
      label: 'Portable Diagnostic Ultrasound Scanner (Primary)',
      category: 'imaging',
      availability: 'available',
      operability: 'functional',
      occupancy: 'free',
      quantity: 1,
      unit: 'device',
      compartmentId: 'medical',
      requiredQualification: 'crew_medical_officer',
      qualificationNote: 'Declared fixture: requires Crew Medical Officer or remote guidance qualification; unsupervised scanning is not recommended.',
      lastVerifiedAt: verifiedEarlier,
      statusReason: 'Synthetic status: console and phased-array probe functional in Medical bay.',
      constraints: 'AEGIS stores summary examination reports only; no raw ultrasound image interpretation.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2', 'cdss-conops'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-ultrasound-01-init',
          at: verifiedEarlier,
          availability: 'available',
          operability: 'functional',
          occupancy: 'free',
          quantity: 1,
          reason: 'Synthetic console and probe check passed.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'ultrasound-probe-02',
      label: 'Backup Handheld Ultrasound Array (Secondary)',
      category: 'imaging',
      availability: 'unavailable',
      operability: 'out_of_service',
      occupancy: 'free',
      quantity: 1,
      unit: 'device',
      compartmentId: 'medical',
      requiredQualification: 'crew_medical_officer',
      qualificationNote: 'Declared fixture: requires Crew Medical Officer qualification.',
      lastVerifiedAt: verifiedFault,
      statusReason: 'Synthetic fault fixture: transducer calibration fault flagged; unit is out of service and unavailable for examinations.',
      constraints: 'Out-of-service fixture; must not be selected as usable imaging equipment.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-ultrasound-02-init',
          at: verifiedFault,
          availability: 'unavailable',
          operability: 'out_of_service',
          occupancy: 'free',
          quantity: 1,
          reason: 'Transducer calibration fault flagged in synthetic fixture.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'pulse-oximeter-01',
      label: 'Fingertip Pulse Oximeter (SpO₂ / PR)',
      category: 'vital_signs',
      availability: 'available',
      operability: 'functional',
      occupancy: 'free',
      quantity: 2,
      unit: 'device',
      compartmentId: 'medical',
      requiredQualification: 'any_crew',
      qualificationNote: 'Declared fixture: standard crew self-check equipment.',
      lastVerifiedAt: verifiedRecent,
      statusReason: 'Synthetic inventory: two functional units stowed in Medical bay drawer A.',
      constraints: 'Motion and peripheral perfusion affect optical SpO₂ readings.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-pulse-ox-init',
          at: verifiedRecent,
          availability: 'available',
          operability: 'functional',
          occupancy: 'free',
          quantity: 2,
          reason: 'Two functional units verified in Medical bay drawer A.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'thermometer-ir-01',
      label: 'Digital Tympanic / Temporal Thermometer',
      category: 'vital_signs',
      availability: 'available',
      operability: 'functional',
      occupancy: 'free',
      quantity: 1,
      unit: 'device',
      compartmentId: 'living',
      requiredQualification: 'any_crew',
      qualificationNote: 'Declared fixture: standard crew self-check equipment.',
      lastVerifiedAt: verifiedRecent,
      statusReason: 'Synthetic inventory: functional unit available in Living quarters kit.',
      constraints: 'Use consistent measurement site and condition for baseline comparisons.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-thermometer-init',
          at: verifiedRecent,
          availability: 'available',
          operability: 'functional',
          occupancy: 'free',
          quantity: 1,
          reason: 'Functional unit stowed in Living quarters kit.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'first-aid-station-01',
      label: 'Basic Onboard First-Aid & Examination Station',
      category: 'first_aid',
      availability: 'available',
      operability: 'functional',
      occupancy: 'free',
      quantity: 1,
      unit: 'station',
      compartmentId: 'medical',
      requiredQualification: 'any_crew',
      qualificationNote: 'Declared fixture: basic non-invasive inspection available to all crew; advanced procedures require medical officer qualification.',
      lastVerifiedAt: verifiedEarlier,
      statusReason: 'Synthetic seal and non-medication supply inspection recorded in Medical bay.',
      constraints: 'Equipment registry only; no medication selection, prescribing, dosing or clinical procedure synthesis.',
      origin: 'synthetic',
      quality: 'estimated',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-first-aid-init',
          at: verifiedEarlier,
          availability: 'available',
          operability: 'functional',
          occupancy: 'free',
          quantity: 1,
          reason: 'Synthetic seal check recorded.',
          actorRole: 'simulator',
        },
      ],
    },
    {
      id: 'poc-analyzer-01',
      label: 'Point-of-Care Blood Chemistry Analyzer',
      category: 'laboratory_point_of_care',
      availability: 'unknown',
      operability: 'unknown',
      occupancy: 'unknown',
      quantity: null,
      unit: 'device',
      compartmentId: 'medical',
      requiredQualification: 'trained_operator',
      qualificationNote: 'Declared fixture: requires trained operator and verified reagent cartridge.',
      lastVerifiedAt: null,
      statusReason: 'Synthetic unknown-state fixture: analyzer calibration and reagent cartridge status have not been verified in this mission snapshot.',
      constraints: 'Demonstrates explicit unknown availability/operability; never inferred as available when metadata is missing or unverified.',
      origin: 'synthetic',
      quality: 'missing',
      timestamp: baseTime,
      source: 'simulator',
      sourceRefIds: ['synthetic-v2'],
      demonstrationOnly: true,
      history: [
        {
          id: 'hist-poc-analyzer-init',
          at: baseTime,
          availability: 'unknown',
          operability: 'unknown',
          occupancy: 'unknown',
          quantity: null,
          reason: 'Unverified status in initial synthetic snapshot.',
          actorRole: 'simulator',
        },
      ],
    },
  ]

  return items.map(validateResource)
}

/**
 * Ensures synthetic mission state contains the full v4.2 synthetic inventory
 * while preserving any explicit status updates already present in `existing`.
 */
export function ensureSyntheticMedicalResources(
  existing: MedicalResource[] | undefined,
  asOf: ISODateTime = SYNTHETIC_RESOURCE_EPOCH,
): MedicalResource[] {
  const defaults = createSyntheticMedicalResources(asOf)
  if (!existing || existing.length === 0) return defaults
  // If only the legacy v2-v4 minimal bp-monitor record (without v4.2 availability/category fields) is present, upgrade it cleanly.
  if (existing.length === 1 && existing[0]?.id === 'bp-monitor' && existing[0].availability === undefined) {
    return defaults
  }
  const byId = new Map(existing.map(item => [item.id, item]))
  for (const def of defaults) {
    if (!byId.has(def.id)) byId.set(def.id, def)
  }
  return [...byId.values()]
}

export interface ResourceStatusUpdateInput {
  id: string;
  availability: ResourceAvailability;
  operability: ResourceOperability;
  occupancy?: ResourceOccupancy;
  quantity?: number | null;
  statusReason: string;
  updatedAt: ISODateTime;
  actorRole?: string;
}

export function applyResourceStatusUpdate(
  resources: MedicalResource[],
  input: ResourceStatusUpdateInput,
): MedicalResource[] {
  const reason = input.statusReason.trim()
  if (!reason) throw new Error('Enter a status reason when changing synthetic equipment state.')
  const target = resources.find(r => r.id === input.id)
  if (!target) throw new Error(`Unknown medical resource ID: ${input.id}`)
  const occupancy: ResourceOccupancy = input.occupancy ?? target.occupancy ?? 'unknown'
  const quantity = input.quantity !== undefined ? input.quantity : target.quantity
  const isUnknown = input.availability === 'unknown' || input.operability === 'unknown'
  const historyEntry = {
    id: `hist-${target.id}-${Date.parse(input.updatedAt)}-${(target.history?.length ?? 0) + 1}`,
    at: input.updatedAt,
    availability: input.availability,
    operability: input.operability,
    occupancy,
    quantity,
    reason,
    ...(input.actorRole ? { actorRole: input.actorRole } : {}),
  }
  const updated = validateResource({
    ...target,
    availability: input.availability,
    operability: input.operability,
    occupancy,
    quantity,
    quality: isUnknown ? 'missing' : 'estimated',
    timestamp: input.updatedAt,
    lastVerifiedAt: isUnknown ? target.lastVerifiedAt ?? null : input.updatedAt,
    statusReason: reason,
    demonstrationOnly: true,
    history: [...(target.history ?? []), historyEntry],
  })
  return resources.map(r => (r.id === input.id ? updated : r))
}

export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  cardiac_monitoring: 'Cardiac monitoring (ECG)',
  imaging: 'Diagnostic imaging (Ultrasound)',
  vital_signs: 'Vital signs monitoring',
  first_aid: 'First-aid & general station',
  laboratory_point_of_care: 'Point-of-care laboratory',
  general_equipment: 'General medical equipment',
}

export const qualificationLabels: Record<OperatorQualification, string> = {
  any_crew: 'Any crew member (declared orientation fixture)',
  trained_operator: 'Trained operator required (declared fixture)',
  crew_medical_officer: 'Crew Medical Officer required (declared fixture)',
  unknown: 'Qualification requirement unrecorded',
}
