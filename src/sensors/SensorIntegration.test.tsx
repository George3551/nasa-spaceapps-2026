import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { AppProvider } from '../app/state/AppProvider'
import { STORAGE_KEY } from '../app/state/persistence'

beforeEach(() => localStorage.clear())
const mount = () => render(<AppProvider><App /></AppProvider>)
describe('integrated astronaut acquisition and assessment journey', () => {
  it('requires explicit synthetic scope, saves demo packets, and preserves them after refresh', async () => {
    const user = userEvent.setup(), root = mount()
    await user.click(screen.getByRole('button', { name: 'Sensors & Exams' }))
    expect(screen.getByText(/No medical hardware is connected/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acquire physiological demo packet' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use synthetic workspace for sensor demonstration' }))
    await user.click(screen.getByRole('button', { name: 'Acquire medical demo packet' }))
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.state.mission.examinations).toHaveLength(2); expect(saved.state.personal.examinations).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Integrated Review' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Integrated Review' })).toBeInTheDocument()
    expect(screen.getByText('Synthetic observations and generated baselines')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByText('Alex Rivera')).not.toBeInTheDocument()
    root.unmount(); mount(); saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.state.mission.examinations).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 1, name: 'My Health' })).toBeInTheDocument()
  })
  it('records an observed examination with conditions in the same store and own medical history', async () => {
    const user = userEvent.setup(); mount()
    await user.click(screen.getByRole('button', { name: 'Sensors & Exams' }))
    await user.type(screen.getByLabelText('Report / examination context'), 'Demonstration report entered by tester; no interpretation.')
    await user.selectOptions(screen.getByLabelText('Examination conditions'), 'quiet-seated')
    await user.click(screen.getByRole('button', { name: 'Save examination record' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.state.personal.examinations[0]).toMatchObject({ kind: 'ecg', source: 'manual', origin: 'observed', acquisition: { condition: 'quiet-seated' } })
    await user.click(screen.getByRole('button', { name: 'My Health' }))
    expect(screen.getByText(/Demonstration report entered by tester/)).toBeInTheDocument()
  })
  it('shows explicit missing baselines and retains self-report acquisition conditions', async () => {
    const user = userEvent.setup(); mount()
    await user.selectOptions(screen.getByLabelText('Acquisition conditions'), 'quiet-seated')
    await user.type(screen.getByLabelText('Value (h)'), '7.5')
    await user.click(screen.getByRole('button', { name: 'Save observation' }))
    await user.click(screen.getByRole('button', { name: 'Integrated Review' }))
    expect(screen.getByText(/No demonstration combination established/)).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.state.personal.measurements[0].acquisition.condition).toBe('quiet-seated')
    expect(screen.getAllByText('Insufficient baseline')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Missing').length).toBeGreaterThan(0)
  })
})
