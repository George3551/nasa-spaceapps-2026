/** AEGIS - team-directed, AI-assisted implementation (Google Gemini); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import { beforeEach, describe, expect, it } from 'vitest'
import { appReducer, createAppState } from '../app/state/reducer'
import { persistState, restoreState, STORAGE_KEY } from '../app/state/persistence'
import {
  evaluateMedicalResource,
  queryEquipmentCapability,
  selectAvailableMedicalEquipment,
  selectMedicalResourceById,
} from './index'

beforeEach(() => localStorage.clear())

describe('Mission Medical Resources — synthetic inventory, distinct fields, and typed selectors', () => {
  it('models availability, operability, occupancy, and operator qualification as distinct fields', () => {
    const state = createAppState()
    const inventory = selectAvailableMedicalEquipment(state, 'synthetic')

    // Primary ECG is available and functional
    const primaryEcg = inventory.items.find(i => i.id === 'ecg-12lead-01')!
    expect(primaryEcg.availability).toBe('available')
    expect(primaryEcg.operability).toBe('functional')
    expect(primaryEcg.requiredQualification).toBe('crew_medical_officer')
    expect(primaryEcg.usableForExamination).toBe(true)

    // Secondary ECG patch is functional (operability=functional) but unavailable (availability=unavailable, occupancy=in_use)
    const secondaryEcg = inventory.items.find(i => i.id === 'ecg-patch-02')!
    expect(secondaryEcg.availability).toBe('unavailable')
    expect(secondaryEcg.operability).toBe('functional')
    expect(secondaryEcg.occupancy).toBe('in_use')
    expect(secondaryEcg.usableForExamination).toBe(false)

    // Secondary ultrasound probe is out_of_service and unavailable
    const backupUltrasound = inventory.items.find(i => i.id === 'ultrasound-probe-02')!
    expect(backupUltrasound.availability).toBe('unavailable')
    expect(backupUltrasound.operability).toBe('out_of_service')
    expect(backupUltrasound.usableForExamination).toBe(false)

    // Point-of-care chemistry analyzer has explicit unknown availability, operability, and null quantity
    const pocAnalyzer = inventory.items.find(i => i.id === 'poc-analyzer-01')!
    expect(pocAnalyzer.availability).toBe('unknown')
    expect(pocAnalyzer.operability).toBe('unknown')
    expect(pocAnalyzer.quantity).toBeNull()
    expect(pocAnalyzer.usableForExamination).toBe(false)
  })

  it('never infers availability or operability from incomplete/legacy records', () => {
    const legacyRecord = evaluateMedicalResource(
      {
        id: 'legacy-device',
        label: 'Legacy Unverified Device',
        quantity: 1,
        unit: 'device',
        origin: 'synthetic',
        quality: 'estimated',
        timestamp: '2026-11-14T08:00:00.000Z',
        source: 'simulator',
        sourceRefIds: ['synthetic-v2'],
      },
      '2026-11-14T08:00:00.000Z',
    )
    expect(legacyRecord.availability).toBe('unknown')
    expect(legacyRecord.operability).toBe('unknown')
    expect(legacyRecord.requiredQualification).toBe('unknown')
    expect(legacyRecord.usableForExamination).toBe(false)
    expect(legacyRecord.statusReason).toContain('Legacy or incomplete')
  })

  it('answers typed capability queries accurately without inventing availability or recommending unsupervised procedures', () => {
    const state = createAppState()

    // 1. "Is ECG equipment available?" -> available_and_functional (primary 12-lead ECG, while noting secondary is unavailable)
    const ecgAnswer = queryEquipmentCapability(state, 'ecg', 'synthetic')
    expect(ecgAnswer.status).toBe('available_and_functional')
    expect(ecgAnswer.usableDevices.map(d => d.id)).toEqual(['ecg-12lead-01'])
    expect(ecgAnswer.matchingDevices).toHaveLength(2)

    // 2. Qualification check: if actor only has 'any_crew' qualification, ECG is qualification_restricted
    const ecgUnqualified = queryEquipmentCapability(state, 'ecg', 'synthetic', 'any_crew')
    expect(ecgUnqualified.status).toBe('qualification_restricted')
    expect(ecgUnqualified.usableDevices).toHaveLength(0)
    expect(ecgUnqualified.summary).toContain('Do not recommend unsupervised operation')

    // 3. "Which ultrasound device is functional?" -> returns only ultrasound-scanner-01, excluding out_of_service ultrasound-probe-02
    const usAnswer = queryEquipmentCapability(state, 'ultrasound', 'synthetic')
    expect(usAnswer.status).toBe('available_and_functional')
    expect(usAnswer.usableDevices.map(d => d.id)).toEqual(['ultrasound-scanner-01'])

    // 4. Querying out-of-service device directly returns out_of_service
    const probeAnswer = queryEquipmentCapability(state, 'ultrasound-probe-02', 'synthetic')
    expect(probeAnswer.status).toBe('out_of_service')
    expect(probeAnswer.usableDevices).toHaveLength(0)

    // 5. Querying unverified point-of-care laboratory analyzer returns unknown
    const labAnswer = queryEquipmentCapability(state, 'laboratory', 'synthetic')
    expect(labAnswer.status).toBe('unknown')
    expect(labAnswer.usableDevices).toHaveLength(0)

    // 6. Querying non-existent capability (e.g., MRI) returns unknown
    const mriAnswer = queryEquipmentCapability(state, 'mri-scanner', 'synthetic')
    expect(mriAnswer.status).toBe('unknown')
    expect(mriAnswer.matchingDevices).toHaveLength(0)

    // 7. Querying in observed local-device scope returns unknown (no physical spacecraft hardware connected)
    const observedAnswer = queryEquipmentCapability(state, 'ecg', 'observed')
    expect(observedAnswer.status).toBe('unknown')
    expect(observedAnswer.summary).toContain('no physical onboard inventory')
  })

  it('persists synthetic status updates across reload and blocks status writes in observed scope', () => {
    const initial = createAppState()
    // Blocked in observed scope
    const rejected = appReducer(initial, {
      type: 'resources/update-status',
      id: 'ecg-12lead-01',
      availability: 'unavailable',
      operability: 'out_of_service',
      statusReason: 'Attempted in observed scope',
      updatedAt: '2026-11-14T08:05:00.000Z',
    })
    expect(rejected.notice).toContain('Not saved')
    expect(selectMedicalResourceById(rejected, 'ecg-12lead-01', 'synthetic')?.availability).toBe('available')

    // Switch to synthetic scope and mark primary ECG out_of_service
    let synState = appReducer(initial, { type: 'scope/set', scope: 'synthetic' })
    synState = appReducer(synState, {
      type: 'resources/update-status',
      id: 'ecg-12lead-01',
      availability: 'unavailable',
      operability: 'out_of_service',
      occupancy: 'free',
      quantity: 0,
      statusReason: 'Synthetic lead cable fault during demo C test.',
      updatedAt: '2026-11-14T08:05:00.000Z',
      actorRole: 'astronaut',
    })
    expect(synState.notice).toContain('Synthetic resource status updated')

    const updatedEcg = selectMedicalResourceById(synState, 'ecg-12lead-01', 'synthetic')!
    expect(updatedEcg.availability).toBe('unavailable')
    expect(updatedEcg.operability).toBe('out_of_service')
    expect(updatedEcg.resource.history).toHaveLength(2)

    // Now querying ECG capability returns unavailable (since primary is out_of_service and secondary is unavailable/in_use)
    expect(queryEquipmentCapability(synState, 'ecg', 'synthetic').status).toBe('unavailable')

    // Persist and restore
    persistState(localStorage, synState)
    const restored = restoreState(localStorage)
    expect(restored.error).toBeNull()
    const restoredEcg = selectMedicalResourceById(restored.state!, 'ecg-12lead-01', 'synthetic')!
    expect(restoredEcg.operability).toBe('out_of_service')
    expect(restoredEcg.statusReason).toContain('Synthetic lead cable fault')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(4)
  })
})
