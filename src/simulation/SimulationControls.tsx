import { useState } from 'react'
import type { ScenarioId } from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { Badge, Callout } from '../app/components/ui'
import { useAppState } from '../app/state/context'
import { formatTimestamp } from '../app/format'

const scenarios: { id: ScenarioId; label: string; detail: string }[] = [
  { id: 'normal-day', label: 'Normal mission', detail: 'Routine schedule, no scripted incident.' },
  { id: 'sleep-disruption', label: 'Sleep disruption', detail: 'Compressed sleep history fixture for one crew member.' },
  { id: 'co2-excursion', label: 'Cabin environment incident', detail: 'Scripted CO₂ excursion in a compartment.' },
  { id: 'radiation-event', label: 'Radiation event (telemetry demo)', detail: 'Telemetry only; no dose-to-disease prediction.' },
]

export function SimulationControls() {
  const { state, dispatch } = useAppState()
  const [scenario, setScenario] = useState<ScenarioId>(state.mission.activeScenario), [seed, setSeed] = useState(String(state.mission.seed))
  const [confirming, setConfirming] = useState(false)
  const active = scenarios.find(s => s.id === state.mission.activeScenario)
  return <div className="content-grid">
    <Panel title="Playback" eyebrow="Synthetic data only · one authoritative clock">
      <dl className="key-value"><div><dt>Active scenario</dt><dd>{active?.label ?? state.mission.activeScenario}</dd></div><div><dt>Mission time</dt><dd className="mono">{formatTimestamp(state.mission.missionTime)}</dd></div><div><dt>Clock</dt><dd>{state.mission.paused ? <Badge>Paused</Badge> : <Badge tone="success">Running {state.mission.speed}×</Badge>}</dd></div></dl>
      <div className="control-row"><button className="button primary" onClick={() => dispatch({ type: 'mission/paused', paused: !state.mission.paused })}>{state.mission.paused ? 'Resume mission' : 'Pause mission'}</button>
        <label className="field inline">Speed<select value={state.mission.speed} onChange={e => dispatch({ type: 'mission/speed', speed: Number(e.target.value) })}><option value="1">1×</option><option value="60">60×</option><option value="300">300×</option></select></label>
        <button className="button" onClick={() => dispatch({ type: 'mission/advance', seconds: 180 })}>Advance 3 virtual minutes</button>
      </div>
      <p className="muted small">Snapshots every virtual minute. Sleep histories are compressed test fixtures, not a model of human physiology.</p>
    </Panel>
    <Panel title="Load a scenario" eyebrow="Deterministic · same seed reproduces the same events">
      <form className="entry-form" onSubmit={e => { e.preventDefault(); setConfirming(true) }}>
        <label className="field">Scenario<select value={scenario} disabled={confirming} onChange={e => setScenario(e.target.value as ScenarioId)}>{scenarios.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <p className="field-hint">{scenarios.find(s => s.id === scenario)?.detail}</p>
        <label className="field">Random seed<input type="number" min="0" max="4294967295" step="1" value={seed} disabled={confirming} onChange={e => setSeed(e.target.value)} required /></label>
        {!confirming && <div className="form-actions"><button className="button" type="submit">Load scenario</button></div>}
      </form>
      {confirming && <div className="confirm-box" role="group" aria-label="Confirm scenario reset">
        <Callout tone="attention" title="Reset synthetic scenario history?">This replaces the current synthetic mission. Observed records and live assessments are preserved.</Callout>
        <div className="form-actions"><button className="button primary" onClick={() => { setConfirming(false); dispatch({ type: 'mission/scenario', scenario, seed: Number(seed) }) }}>Reset and load</button><button className="button ghost" onClick={() => setConfirming(false)}>Cancel</button></div>
      </div>}
      <p className="muted small">Reset affects only the synthetic mission. Personal records are stored separately. Radiation is displayed as scenario telemetry; no dose-to-disease prediction is made.</p>
    </Panel>
  </div>
}
