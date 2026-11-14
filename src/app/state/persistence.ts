import { z } from 'zod'
import { clinicalSchema, missionSchema } from '../../shared/validation'
import type { AppState } from './reducer'

export const STORAGE_KEY = 'aegis.core.v3'
export const LEGACY_STORAGE_KEY = 'aegis.core.v2'
export const STORAGE_VERSION = 3
export function readSavedRaw(storage: Pick<Storage, 'getItem'>) { return storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY) }
export const stateSchema = z.object({ mission: missionSchema, personal: clinicalSchema,
  section: z.enum(['dashboard', 'health', 'spacecraft', 'simulation', 'events', 'assessments', 'research', 'visual', 'physical', 'anatomy']), mode: z.enum(['astronaut', 'medical', 'mission']), scope: z.enum(['observed', 'synthetic']), sessionAstronautId: z.literal('crew-01'), selectedAstronautId: z.string().nullable(), selectedCompartmentId: z.string().nullable(), notice: z.string().nullable(),
}).superRefine((state, ctx) => {
  if (state.personal.measurements.some(r => r.origin !== 'observed') || state.personal.assessments.some(r => r.origin !== 'observed') || state.personal.encounters.some(r => r.origin !== 'observed') || state.personal.activities.some(r => r.origin !== 'observed')) ctx.addIssue({ code: 'custom', message: 'Personal workspace contains non-observed data' })
  if (state.mission.measurements.some(r => r.origin !== 'synthetic') || state.mission.assessments.some(r => r.origin !== 'synthetic') || state.mission.environment.some(r => r.origin !== 'synthetic') || state.mission.activities.some(r => r.origin !== 'synthetic')) ctx.addIssue({ code: 'custom', message: 'Simulation contains non-synthetic data' })
  for (const workspace of [state.personal, state.mission]) {
    const records = [...workspace.measurements, ...workspace.assessments]
    if (new Set(records.map(r => r.id)).size !== records.length) ctx.addIssue({ code: 'custom', message: 'Duplicate record ID' })
    if (records.some(r => !state.mission.crew.some(c => c.id === r.astronautId))) ctx.addIssue({ code: 'custom', message: 'Unknown astronaut reference' })
  }
})
export function restoreState(storage: Pick<Storage, 'getItem'>): { state: AppState | null; error: string | null } {
  try {
    const raw = readSavedRaw(storage)
    if (!raw) return { state: null, error: null }
    const parsed = z.object({ version: z.union([z.literal(2), z.literal(3)]), state: stateSchema }).parse(JSON.parse(raw))
    return { state: { ...parsed.state, mode: 'astronaut', scope: 'observed', section: 'health', selectedAstronautId: 'crew-01', mission: { ...parsed.state.mission, paused: true }, notice: 'Saved records restored. Mission paused.' } as AppState, error: null }
  } catch { return { state: null, error: 'Saved data could not be validated. It has been retained unchanged. Download the saved data or explicitly replace it before saving new records.' } }
}
export function persistState(storage: Pick<Storage, 'setItem'>, state: AppState) {
  stateSchema.parse(state)
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state }))
}
