import { useState } from 'react'
import type { ScenarioId } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { useAppState } from '../app/state/context'

export function SimulationControls() {
  const { state, dispatch } = useAppState()
  const [scenario, setScenario] = useState<ScenarioId>(state.mission.activeScenario), [seed, setSeed] = useState(String(state.mission.seed))
  return <Panel title="Mission simulation" eyebrow="Synthetic data only · one authoritative clock">
    <p className="muted">Scenario: {state.mission.activeScenario}. Snapshots every virtual minute. Sleep histories are compressed test fixtures, not a model of human physiology.</p>
    <div className="control-row"><button className="button primary" onClick={() => dispatch({ type: 'mission/paused', paused: !state.mission.paused })}>{state.mission.paused ? 'Resume mission' : 'Pause mission'}</button>
      <label className="field">Speed<select value={state.mission.speed} onChange={e => dispatch({ type: 'mission/speed', speed: Number(e.target.value) })}><option value="1">1×</option><option value="60">60×</option><option value="300">300×</option></select></label>
      <button className="button" onClick={() => dispatch({ type: 'mission/advance', seconds: 180 })}>Advance 3 virtual minutes</button>
    </div>
    <form className="control-row" onSubmit={e => { e.preventDefault(); if (window.confirm('Reset synthetic scenario history? Observed records and live assessments are preserved.')) dispatch({ type: 'mission/scenario', scenario, seed: Number(seed) }) }}>
      <label className="field">Scenario<select value={scenario} onChange={e => setScenario(e.target.value as ScenarioId)}><option value="normal-day">Normal mission</option><option value="sleep-disruption">Sleep disruption</option><option value="co2-excursion">Cabin environment incident</option><option value="radiation-event">Radiation event (telemetry demo)</option></select></label>
      <label className="field">Random seed<input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e => setSeed(e.target.value)} required /></label><button className="button" type="submit">Load scenario</button>
    </form>
    <p className="sample-note">Reset affects only the synthetic mission. Personal records are stored separately. Radiation is displayed as scenario telemetry; no dose-to-disease prediction is made.</p>
  </Panel>
}
