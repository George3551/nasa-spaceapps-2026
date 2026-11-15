/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Navigation and role-interface regression tests.
 * Implementation: team-directed, AI-assisted (Anthropic Claude Code).
 * AI-assisted software tests use fixtures/mocks; passing tests do not establish clinical or physical-camera validity.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { AppProvider } from './state/AppProvider'
import { navigationFor } from './navigation'

beforeEach(() => localStorage.clear())
const mount = () => render(<AppProvider><App /></AppProvider>)

describe('redesigned shell and information architecture', () => {
  it('groups navigation and offers only destinations the role can open', () => {
    const astronaut = navigationFor('astronaut').flatMap(g => g.items.map(i => i.id))
    const mission = navigationFor('mission').flatMap(g => g.items.map(i => i.id))
    expect(astronaut).not.toContain('spacecraft'); expect(astronaut).toContain('visual')
    expect(mission).toContain('simulation'); expect(mission).not.toContain('physical')
    mount()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByText('Record data')).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'My Health' })).toHaveAttribute('aria-current', 'page')
  })
  it('shows a persistent provenance banner that changes with the data workspace', async () => {
    const user = userEvent.setup(); mount()
    expect(screen.getByText('Observed workspace')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Data workspace'), 'synthetic')
    expect(screen.getByText('Synthetic workspace')).toBeInTheDocument()
    expect(screen.queryByText('Observed workspace')).not.toBeInTheDocument()
  })
  it('lets the medical officer change subject without leaving the current page', async () => {
    const user = userEvent.setup(); mount()
    await user.selectOptions(screen.getByLabelText('Demo user context'), 'medical')
    await user.click(screen.getByRole('button', { name: 'Body Systems' }))
    const select = screen.getByLabelText('Crew member') as HTMLSelectElement
    const other = Array.from(select.options).find(o => o.value !== select.value)!
    await user.selectOptions(select, other.value)
    expect(screen.getByRole('heading', { level: 1, name: 'Body Systems' })).toBeInTheDocument()
    expect((screen.getByLabelText('Crew member') as HTMLSelectElement).value).toBe(other.value)
  })
  it('requires an inline confirmation before resetting the synthetic scenario, and cancel keeps it', async () => {
    const user = userEvent.setup(); mount()
    await user.selectOptions(screen.getByLabelText('Demo user context'), 'mission')
    await user.click(screen.getByRole('button', { name: 'Simulator' }))
    await user.selectOptions(screen.getByLabelText('Scenario'), 'sleep-disruption')
    await user.click(screen.getByRole('button', { name: 'Load scenario' }))
    expect(screen.getByText('Reset synthetic scenario history?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(within(screen.getByRole('main')).getByText('Normal mission', { selector: 'dd' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load scenario' }))
    await user.click(screen.getByRole('button', { name: 'Reset and load' }))
    expect(within(screen.getByRole('main')).getByText('Sleep disruption', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Synthetic scenario reset')
  })
  it('surfaces new alerts in navigation and the overview', async () => {
    const user = userEvent.setup(); mount()
    await user.selectOptions(screen.getByLabelText('Demo user context'), 'mission')
    await user.click(screen.getByRole('button', { name: 'Simulator' }))
    await user.selectOptions(screen.getByLabelText('Scenario'), 'sleep-disruption')
    await user.click(screen.getByRole('button', { name: 'Load scenario' }))
    await user.click(screen.getByRole('button', { name: 'Reset and load' }))
    await user.click(screen.getByRole('button', { name: 'Advance 3 virtual minutes' }))
    expect(screen.getByRole('button', { name: /^Alerts & Cases, \d+ new$/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Overview' }))
    expect(screen.getByRole('button', { name: /New alerts [1-9]/ })).toBeInTheDocument()
  })
})
