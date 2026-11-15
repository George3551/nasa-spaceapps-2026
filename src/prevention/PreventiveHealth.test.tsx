import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { AppProvider } from '../app/state/AppProvider'
import { STORAGE_KEY } from '../app/state/persistence'

beforeEach(() => localStorage.clear())
const mount = () => render(<AppProvider><App /></AppProvider>)

describe('AEGIS v4.2 Preventive Health & Mission Medical Resources UI journeys (Demos A–D)', () => {
  it('Demo A: links planned exercise to recorded evidence, persists across refresh, and returns to insufficient_evidence when withheld', async () => {
    const user = userEvent.setup()
    const view = mount()

    await user.click(screen.getByRole('button', { name: /Preventive Health/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Preventive Health' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add starter personal prevention schedule' }))
    const exerciseCard = screen.getByTestId('prevention-item-plan-observed-crew-01-exercise')
    expect(within(exerciseCard).getByText('Status: due')).toBeInTheDocument()

    // Complete manual exercise check-in
    await user.click(within(exerciseCard).getByRole('button', { name: 'Record manual exercise completion' }))
    expect(within(exerciseCard).getByText('Status: completed')).toBeInTheDocument()
    expect(within(exerciseCard).getByText(/Verified linked evidence/)).toBeInTheDocument()

    // Refresh (unmount & remount) and confirm persistence
    view.unmount()
    mount()
    await user.click(screen.getByRole('button', { name: /Preventive Health/ }))
    const restoredCard = screen.getByTestId('prevention-item-plan-observed-crew-01-exercise')
    expect(within(restoredCard).getByText('Status: completed')).toBeInTheDocument()

    // Withhold linked evidence in controlled test -> status returns to insufficient_evidence
    await user.click(within(restoredCard).getByRole('button', { name: 'Withhold linked evidence (test verification)' }))
    expect(within(restoredCard).getByText('Status: insufficient evidence')).toBeInTheDocument()
  })

  it('Demo B: reflects Sleep disruption scenario & mission clock in Preventive Health without altering CDSS cases', async () => {
    const user = userEvent.setup()
    mount()

    await user.selectOptions(screen.getByLabelText('Demo user context'), 'mission')
    await user.click(screen.getByRole('button', { name: /Mission Simulation/ }))
    await user.selectOptions(screen.getByLabelText('Scenario'), 'sleep-disruption')
    const confirm = window.confirm
    window.confirm = () => true
    await user.click(screen.getByRole('button', { name: 'Load scenario' }))
    window.confirm = confirm
    await user.click(screen.getByRole('button', { name: 'Advance 3 virtual minutes' }))

    await user.click(screen.getByRole('button', { name: /Preventive Health/ }))
    const sleepCard = screen.getByTestId('prevention-item-plan-synthetic-crew-01-sleep')
    const reactionCard = screen.getByTestId('prevention-item-plan-synthetic-crew-01-reaction')
    expect(within(sleepCard).getByText('Status: completed')).toBeInTheDocument()
    expect(within(reactionCard).getByText('Status: completed')).toBeInTheDocument()
    expect(screen.getByText(/Latest sleep is 5\.2 h vs qualified 3-session median baseline/)).toBeInTheDocument()
    expect(screen.getByText(/case-synthetic-crew-01-recovery/)).toBeInTheDocument()

    // Complete synthetic exercise and confirm CDSS case remains open
    const exerciseCard = screen.getByTestId('prevention-item-plan-synthetic-crew-01-exercise')
    await user.click(within(exerciseCard).getByRole('button', { name: 'Record manual exercise completion' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.state.mission.encounters[0].status).toBe('open')
  })

  it('Demo C: filters synthetic medical resources, demonstrates unknown/unavailable queries, and persists status changes', async () => {
    const user = userEvent.setup()
    const view = mount()

    await user.click(screen.getByRole('button', { name: /Mission Medical Resources/ }))
    await user.click(screen.getByRole('button', { name: 'Use synthetic workspace for resource demonstration' }))

    // Inspect available functional primary ECG and out-of-service secondary ultrasound
    const primaryEcg = screen.getByTestId('resource-item-ecg-12lead-01')
    expect(within(primaryEcg).getByText('Availability: available')).toBeInTheDocument()
    expect(within(primaryEcg).getByText('Operability: functional')).toBeInTheDocument()

    const backupUs = screen.getByTestId('resource-item-ultrasound-probe-02')
    expect(within(backupUs).getByText('Availability: unavailable')).toBeInTheDocument()
    expect(within(backupUs).getByText('Operability: out of service')).toBeInTheDocument()

    // Demonstrate typed query returning unknown for unverified point-of-care analyzer
    await user.selectOptions(screen.getByLabelText('Capability or device query'), 'laboratory')
    expect(within(screen.getByRole('region', { name: 'Typed selector result' })).getByText('Selector status: unknown')).toBeInTheDocument()

    // Update synthetic status of ecg-patch-02 to available & functional and persist
    await user.selectOptions(screen.getByLabelText('Availability (separate from operability)'), 'available')
    await user.selectOptions(screen.getByLabelText('Occupancy state'), 'free')
    await user.type(screen.getByLabelText('Status reason / verification note'), 'Returned to Medical bay after ambulatory check.')
    await user.click(screen.getByRole('button', { name: 'Save synthetic status change' }))

    view.unmount()
    mount()
    await user.click(screen.getByRole('button', { name: /Mission Medical Resources/ }))
    await user.click(screen.getByRole('button', { name: 'Use synthetic workspace for resource demonstration' }))
    const updatedPatch = screen.getByTestId('resource-item-ecg-patch-02')
    expect(within(updatedPatch).getByText('Availability: available')).toBeInTheDocument()
    expect(within(updatedPatch).getAllByText(/Returned to Medical bay/).length).toBeGreaterThan(0)
  })

  it('Demo D: preserves personal observed plans/hydration across scenario reset and isolates subjects', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('button', { name: /Preventive Health/ }))
    await user.type(screen.getByLabelText('Plan title'), 'My Private Observed Countermeasure')
    await user.type(screen.getByLabelText(/Neutral informational description/), 'Personal observed countermeasure plan.')
    await user.click(screen.getByRole('button', { name: 'Save prevention plan item' }))
    expect(screen.getByText('My Private Observed Countermeasure')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log hydration entry' }))
    expect(screen.getAllByText(/350 mL/).length).toBeGreaterThan(0)

    // Switch to Mission Overview and reset synthetic scenario
    await user.selectOptions(screen.getByLabelText('Demo user context'), 'mission')
    await user.click(screen.getByRole('button', { name: /Mission Simulation/ }))
    const confirm = window.confirm
    window.confirm = () => true
    await user.click(screen.getByRole('button', { name: 'Load scenario' }))
    window.confirm = confirm

    // Switch to Crew Medical Officer Mode -> Observed records -> select Alex Rivera (crew-02)
    await user.selectOptions(screen.getByLabelText('Demo user context'), 'medical')
    await user.click(screen.getByRole('button', { name: /Preventive Health/ }))
    expect(screen.getByText('My Private Observed Countermeasure')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Crew member'), 'crew-02')
    expect(screen.queryByText('My Private Observed Countermeasure')).not.toBeInTheDocument()
  })
})
