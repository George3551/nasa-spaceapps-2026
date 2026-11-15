/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Mocked camera UI and coverage-label tests.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import type { CameraSnapshot } from './CameraSession'
import { CameraAssessment } from './CameraAssessment'
import { AppProvider } from '../app/state/AppProvider'
import { VisualMetrics } from './metrics'

const driver = vi.hoisted(() => ({
  snapshot: null as CameraSnapshot | null,
  publish: null as ((s: CameraSnapshot) => void) | null,
  end: null as ((s: CameraSnapshot) => void) | null,
}))
vi.mock('./CameraSession', () => ({ CameraSession: class {
  constructor(...args: unknown[]) { driver.publish = args[3] as typeof driver.publish; driver.end = args[5] as typeof driver.end }
  async start() { driver.publish?.(driver.snapshot!) }
  stop() { return { ...driver.snapshot!, endReason: 'user_stop' } }
} }))
beforeEach(() => {
  localStorage.clear()
  const metrics = new VisualMetrics()
  for (let at = 0; at <= 59700; at += 50) metrics.feed(at, at < 10400 ? { ear: null, issue: 'no_face' } : { ear: .298, issue: null })
  driver.snapshot = { visual: metrics.result(59800), physical: null, issue: null, rawSignal: .298, visibility: null, endReason: null }
})
async function start() {
  const user = userEvent.setup()
  render(<AppProvider><CameraAssessment kind="visual" /></AppProvider>)
  await user.click(screen.getByRole('checkbox', { name: /Associate this observed session/ }))
  await user.click(screen.getByRole('button', { name: 'Start Assessment' }))
  return user
}
it('labels the post-calibration denominator and preserves the final tracking observation on user Stop', async () => {
  const user = await start()
  expect(screen.getByText('Usable coverage after calibration')).toBeInTheDocument()
  expect(screen.getByText('13.4 s (excluded from coverage)')).toBeInTheDocument()
  expect(screen.getByText('46.4 s')).toBeInTheDocument()
  expect(screen.getByText('99.7% (time coverage, not confidence)')).toBeInTheDocument()
  expect(screen.getByText('Whole-session usable proportion')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Stop Assessment' }))
  expect(screen.getByText('Session ended: Stopped by you.')).toBeInTheDocument()
  expect(screen.getByText('Last tracking observation: usable geometry.')).toBeInTheDocument()
})
it('explains a hidden-tab stop separately from its final tracking issue', async () => {
  await start()
  act(() => driver.end?.({ ...driver.snapshot!, issue: 'camera_interrupted', endReason: 'tab_hidden' }))
  expect(screen.getByText('Session ended: Stopped because the page became hidden (privacy safeguard).')).toBeInTheDocument()
  expect(screen.getByText('Last tracking observation: camera interrupted.')).toBeInTheDocument()
})
