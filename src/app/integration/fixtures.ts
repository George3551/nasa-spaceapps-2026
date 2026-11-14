import type { MissionState, SourceReference } from '../../../contracts/types'

export const fixtureSource: SourceReference = {
  id: 'integration-fixture-v1',
  title: 'AEGIS integration fixture v1',
  kind: 'synthetic_fixture',
  note: 'Invented identity and value. Tests data rendering only; no clinical interpretation.',
}

// Temporary integration data, deliberately separate from the simulation module.
export function createIntegrationFixture(): MissionState {
  return {
    missionTime: '2026-11-14T08:00:00.000Z',
    paused: true,
    speed: 1,
    activeScenario: 'normal-day',
    seed: 42,
    crew: [{
      id: 'crew-01', displayName: 'Mira Chen', role: 'Mission specialist',
      baselines: {}, currentCompartmentId: 'medical', syntheticIdentity: true,
    }],
    compartments: [{ id: 'medical', label: 'Medical bay', category: 'medical' }],
    measurements: [{
      id: 'integration-hr-01', astronautId: 'crew-01', metric: 'resting_heart_rate',
      value: 64, unit: 'bpm', timestamp: '2026-11-14T08:00:00.000Z',
      source: 'simulator', origin: 'synthetic', quality: 'valid',
      compartmentId: 'medical', sourceRefId: fixtureSource.id, demonstrationOnly: true,
    }],
    environment: [], activities: [], alerts: [], events: [],
  }
}
