/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
/** Integrated v4.2 acceptance tests; generated with Codex under team direction.
 * Tests exercise synthetic/local records, not clinical validity or physical hardware. */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it } from 'vitest'
import { App } from '../app/App'
import { AppProvider } from '../app/state/AppProvider'
import { appReducer, createAppState } from '../app/state/reducer'
import type { AppState } from '../app/state/reducer'
import { localRulesProvider } from './provider'
import { buildManualExerciseCompletion } from '../prevention/fixtures'
import { selectPreventionSchedule } from '../prevention/selectors'
import { findViolations } from './safety'

beforeEach(() => localStorage.clear())
const demo = () => appReducer(createAppState(), { type: 'demo/start' })
const own = (state: AppState) => ({ ...state, mode: 'astronaut' as const, selectedAstronautId: state.sessionAstronautId })
const ask = (state: AppState, question: string) => localRulesProvider.answer({ question, state: own(state), previous: null }).reply

it('reads current equipment and reflects actual status edits without canned answers', () => {
  const state = demo(), before = structuredClone(state)
  const answer = ask(state, 'Which ECG equipment is available?')
  expect(answer.status).toBe('answered')
  expect(answer.evidence.map(e => e.id)).toContain('ecg-12lead-01')
  expect(findViolations(answer)).toEqual([])
  expect(state).toEqual(before)
  const changed = appReducer(state, { type: 'resources/update-status', id: 'ecg-12lead-01', availability: 'unavailable', operability: 'out_of_service', occupancy: 'reserved', statusReason: 'Test inspection', updatedAt: state.mission.missionTime })
  expect(ask(changed, 'Which ECG equipment is available?').body.join(' ')).toContain('operability out_of_service')
  expect(ask(changed, 'Which ECG equipment is available?').body.join(' ')).not.toContain('ecg-12lead-01): availability available')
})

it('reports completed prevention evidence through the shared selectors', () => {
  const state = demo(), plan = state.mission.preventionPlans!.find(p => p.astronautId === 'crew-01' && p.category === 'exercise')!
  const bundle = buildManualExerciseCompletion({ astronautId: 'crew-01', origin: 'synthetic', completedAt: state.mission.missionTime, durationMinutes: 10 })
  const completed = appReducer(state, { type: 'prevention/complete', planId: plan.id, ...bundle })
  const answer = ask(completed, 'Show my preventive plan and hydration')
  const schedule = selectPreventionSchedule(own(completed), 'crew-01', 'synthetic', completed.mission.missionTime)
  expect(answer.body.join(' ')).toContain(`Schedule: ${schedule.counts.completed} completed`)
  expect(answer.evidence.find(e => e.id === plan.id)?.value).toBe('completed')
  expect(answer.evidence.every(e => !e.id.includes('crew-02') && !e.id.includes('crew-03'))).toBe(true)
  expect(findViolations(answer)).toEqual([])
  expect(ask(completed, 'Show Alex Rivera prevention plan').status).toBe('refused')
})

it('opens an own-record assistant directly from the Guided Demo mission context', async () => {
  const user = userEvent.setup()
  render(<AppProvider><App /></AppProvider>)
  await user.click(screen.getByRole('button', { name: 'Start Mission Demo' }))
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  await user.click(screen.getByRole('button', { name: 'Open personal Guided Assistant' }))
  const panel = await screen.findByRole('dialog', { name: 'AEGIS Guided Assistant' })
  expect(screen.getByLabelText('Demo user context')).toHaveValue('astronaut')
  expect(screen.getByLabelText('Data workspace')).toHaveValue('synthetic')
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  await user.type(within(panel).getByLabelText('Ask about your accessible records'), 'Why did my performance change?{Enter}')
  expect(within(panel).getByText('Finding: Multiple performance indicators changed.')).toBeInTheDocument()
  await user.type(within(panel).getByLabelText('Ask about your accessible records'), 'Which ultrasound is functional?{Enter}')
  expect(within(panel).getByText('Medical equipment recorded in this workspace.')).toBeInTheDocument()
  expect(within(panel).getAllByText('ultrasound-scanner-01').length).toBeGreaterThan(0)
})
