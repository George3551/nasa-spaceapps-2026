/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Mission-demo navigation regression test.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { App } from '../App'
import { AppProvider } from '../state/AppProvider'
import { STORAGE_KEY } from '../state/persistence'

beforeEach(() => localStorage.clear())
it('starts the actual scenario, opens evidence and alerts, and confirms before replay', async () => {
  const user = userEvent.setup(); render(<AppProvider><App /></AppProvider>)
  expect(screen.getByText(/Gather health observations/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Start Mission Demo' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Integrated Review' })).toBeInTheDocument()
  expect(screen.getByText('Multiple performance indicators changed')).toBeInTheDocument()
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
  expect(stored.state.mission.activeScenario).toBe('sleep-disruption')
  expect(stored.state.personal.measurements).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Open alerts and follow-up' }))
  expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await user.click(screen.getByRole('button', { name: 'Replay demo' }))
  expect(confirm).toHaveBeenCalled(); confirm.mockRestore()
})
