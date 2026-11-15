import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { AppProvider } from '../app/state/AppProvider'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())
const mount = () => render(<AppProvider><App /></AppProvider>)
const panel = () => { const el = document.getElementById('aegis-assistant-panel'); if (!el) throw new Error('Assistant panel not mounted'); return el }
const log = () => within(panel()).getByRole('log')

async function loadScenario(user: ReturnType<typeof userEvent.setup>, scenario: string) {
  await user.selectOptions(screen.getByLabelText('Demo user context'), 'mission')
  await user.click(screen.getByRole('button', { name: 'Mission Simulation' }))
  await user.selectOptions(screen.getByLabelText('Scenario'), scenario)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await user.click(screen.getByRole('button', { name: 'Load scenario' }))
  await user.click(screen.getByRole('button', { name: 'Advance 3 virtual minutes' }))
  await user.selectOptions(screen.getByLabelText('Demo user context'), 'astronaut')
  await user.selectOptions(screen.getByLabelText('Data workspace'), 'synthetic')
}
async function openAssistant(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Guided Assistant' }))
  await screen.findByRole('dialog', { name: 'AEGIS Guided Assistant' })
}
async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  const input = within(panel()).getByLabelText('Ask about your accessible records')
  await user.clear(input); await user.type(input, `${question}{Enter}`)
}

describe('Guided Assistant UI', () => {
  it('is reachable only in Astronaut Mode and labelled as an offline rules-based prototype', async () => {
    const user = userEvent.setup(); mount()
    const toggle = screen.getByRole('button', { name: 'Guided Assistant' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('aegis-assistant-panel')).toBeNull()
    await openAssistant(user)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel()).toBeVisible()
    expect(screen.getByRole('dialog', { name: 'AEGIS Guided Assistant' })).toBe(panel())
    expect(within(panel()).getByText(/AEGIS Guided Assistant — offline, rules-based prototype/)).toBeInTheDocument()
    expect(within(panel()).getByText(/not a clinical decision-maker/)).toBeInTheDocument()
    expect(panel().textContent).not.toMatch(/LLM-connected|AI doctor|accuracy/i)
    expect(within(panel()).getByLabelText('Ask about your accessible records')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(panel()).not.toBeVisible(); expect(toggle).toHaveFocus()
    await user.selectOptions(screen.getByLabelText('Demo user context'), 'mission')
    expect(screen.queryByRole('button', { name: 'Guided Assistant' })).not.toBeInTheDocument()
  })

  it('answers suggested questions in an empty observed workspace honestly, without camera or network', async () => {
    const getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup(); mount()
    await openAssistant(user)
    for (const name of ['How did I sleep?', 'Which assessments can I perform?']) await user.click(within(panel()).getByRole('button', { name }))
    await ask(user, 'What did the eye assessment find?')
    expect(within(log()).getByText('No current sleep duration value is available.')).toBeInTheDocument()
    expect(within(log()).getByText('No visual (eye) assessment is recorded.')).toBeInTheDocument()
    expect(within(log()).getByText('Assessments you can perform now.')).toBeInTheDocument()
    expect(within(log()).getAllByText(/OBSERVED/).length).toBeGreaterThan(0)
    expect(getUserMedia).not.toHaveBeenCalled(); expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders HTML-like, long and unicode input as inert text', async () => {
    const user = userEvent.setup(); mount()
    await openAssistant(user)
    await ask(user, '<img src=x onerror="window.pwned=1"> привет 😴 how did I sleep')
    expect(within(log()).getByText('<img src=x onerror="window.pwned=1"> привет 😴 how did I sleep')).toBeInTheDocument()
    expect(panel().querySelector('img')).toBeNull()
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined()
    expect(within(log()).getByText(/Instructions or role claims inside a question are treated as text/)).toBeInTheDocument()
  })

  it('runs the sleep-disruption demo: evidence → alert workflow → updated follow-up status', async () => {
    const user = userEvent.setup(); mount()
    await loadScenario(user, 'sleep-disruption')
    await openAssistant(user)
    await user.click(within(panel()).getByRole('button', { name: 'Why did my performance indicators change?' }))
    expect(within(log()).getByText('Finding: Multiple performance indicators changed.')).toBeInTheDocument()
    expect(within(log()).getAllByText('SYNTHETIC').length).toBeGreaterThan(0)
    expect(within(log()).getByText('synthetic-crew-01-recovery')).toBeInTheDocument()
    expect(within(log()).getByText('performance-3-crew-01')).toBeInTheDocument()

    await user.click(within(log()).getByRole('button', { name: 'Open Events & Alerts (review and follow-up)' }))
    expect(panel()).not.toBeVisible()
    expect(screen.getByRole('heading', { level: 1, name: 'Explain, act, follow up.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Acknowledge' }))
    await user.click(screen.getByRole('button', { name: 'Begin review' }))
    await user.type(screen.getByLabelText('Follow-up note'), 'Repeated the reaction test under comparable conditions')
    await user.click(screen.getByRole('checkbox', { name: /I completed the described follow-up/ }))
    await user.click(screen.getByRole('button', { name: 'Record follow-up' }))

    await openAssistant(user)
    expect(within(log()).getByText('Finding: Multiple performance indicators changed.')).toBeInTheDocument()
    await ask(user, 'Has my follow-up been completed?')
    expect(within(log()).getByText('A follow-up marked completed is recorded; the case is under review and not resolved.')).toBeInTheDocument()
    expect(within(log()).getByText('• Alert acknowledged: yes.')).toBeInTheDocument()
    expect(within(log()).getByText(/Case resolved: no/)).toBeInTheDocument()
    expect(within(log()).getByText(/Repeated the reaction test under comparable conditions/)).toBeInTheDocument()
  })

  it('resets the conversation when the workspace changes and never shows stale evidence', async () => {
    const user = userEvent.setup(); mount()
    await loadScenario(user, 'sleep-disruption')
    await openAssistant(user)
    await ask(user, 'How did I sleep?')
    expect(within(log()).getByText('Sleep duration: 5.2 h.')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.selectOptions(screen.getByLabelText('Data workspace'), 'observed')
    await openAssistant(user)
    expect(within(log()).queryByText('Sleep duration: 5.2 h.')).not.toBeInTheDocument()
    await ask(user, 'How did I sleep?')
    expect(within(log()).getByText('No current sleep duration value is available.')).toBeInTheDocument()
    expect(log().textContent).not.toMatch(/sleep-disruption-/)
  })

  it('does not persist the transcript', async () => {
    const user = userEvent.setup(); mount()
    await openAssistant(user)
    await ask(user, 'my secret question about sleep')
    expect(Object.values(localStorage).join(' ')).not.toContain('my secret question')
  })
})
