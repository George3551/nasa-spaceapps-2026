import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { AppProvider } from './state/AppProvider'
import { MeasurementCard } from './components/MeasurementCard'
import { createIntegrationFixture } from './integration/fixtures'
import type { HealthViewProps, MissionViewProps } from './integration/interfaces'

describe('application foundation', () => {
  it('renders a canonical measurement with units, provenance and timestamp', () => {
    render(<AppProvider><App /></AppProvider>)
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByText('64')).toBeInTheDocument()
    expect(screen.getByText('bpm')).toBeInTheDocument()
    expect(screen.getByText('Synthetic data')).toBeInTheDocument()
    expect(screen.getByText('AEGIS integration fixture v1')).toBeInTheDocument()
    expect(screen.getByText('Display sample only · no health assessment')).toBeInTheDocument()
    expect(screen.getAllByText('2026-11-14 08:00:00 UTC')).toHaveLength(2)
  })

  it('navigates all shell sections and can reload the integration fixture', async () => {
    const user = userEvent.setup()
    render(<AppProvider><App /></AppProvider>)
    await user.click(screen.getByRole('button', { name: /Check My Health/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'My Health' })).toBeInTheDocument()
    expect(screen.getByText(/Baseline not established/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Spacecraft' }))
    expect(screen.getByText('Spacecraft digital twin is not connected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Events & Alerts' }))
    expect(screen.getByText(/No alert records/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mission Simulation' }))
    expect(screen.getByText('Mission simulator is not connected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reload integration sample' }))
    expect(screen.getByRole('heading', { level: 1, name: 'A clear view of crew health.' })).toBeInTheDocument()
  })

  it('renders missing and invalid observations as unavailable, never zero or healthy', () => {
    const measurement = createIntegrationFixture().measurements[0]!
    const { rerender } = render(<MeasurementCard measurement={{ ...measurement, value: null, quality: 'missing' }} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    rerender(<MeasurementCard measurement={{ ...measurement, value: 64, quality: 'invalid' }} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryByText('64')).not.toBeInTheDocument()
  })

  it('connects independent UI adapters to the same store', async () => {
    const user = userEvent.setup()
    function SpacecraftAdapter({ onSelectAstronaut }: MissionViewProps) {
      return <button onClick={() => onSelectAstronaut('crew-01')}>Select crew from ship</button>
    }
    function HealthAdapter({ mission, onMeasurementAdded }: HealthViewProps) {
      const record = mission.measurements[0]!
      return <><p>Adapter value: {record.value}</p><button onClick={() => onMeasurementAdded({ ...record, value: 65 })}>Update synthetic sample</button></>
    }
    render(<AppProvider><App modules={{ spacecraft: SpacecraftAdapter, health: HealthAdapter }} /></AppProvider>)
    await user.click(screen.getByRole('button', { name: 'Spacecraft' }))
    await user.click(screen.getByRole('button', { name: 'Select crew from ship' }))
    expect(screen.getByText('Adapter value: 64')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update synthetic sample' }))
    expect(screen.getByText('Adapter value: 65')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mission Dashboard' }))
    expect(screen.getByText('65')).toBeInTheDocument()
  })
})
