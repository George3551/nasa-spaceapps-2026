/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Guided mission-demo entry.
 * Implementation: team-directed, substantially AI-generated with possible mixed edits (OpenAI Codex).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { useAppState } from '../state/context'
import { Panel } from './Panel'

export function ReleaseIntro() {
  const { state, dispatch } = useAppState()
  function start() {
    const changed = state.mission.events.some(e => e.kind === 'operator_action') || state.mission.alerts.length > 0 || (state.mission.examinations?.length ?? 0) > 0 || state.mission.measurements.some(r => !r.generatedTelemetry && r.sourceRefId !== 'synthetic-v2')
    if (changed && !window.confirm('Restart the synthetic mission demo? This replaces synthetic mission records and cases. Your observed health records are preserved.')) return
    dispatch({ type: 'demo/start' })
  }
  const welcome = ['health', 'dashboard'].includes(state.section)
  if (!welcome && !(state.scope === 'synthetic' && state.mission.activeScenario === 'sleep-disruption' && ['performance', 'events', 'simulation'].includes(state.section))) return null
  return <div className="release-intro"><Panel title={welcome ? 'AEGIS' : 'Mission demo · synthetic data'} eyebrow="Autonomous Health Monitoring & Decision Support for Deep-Space Missions">
    {welcome ? <><p>Gather health observations, compare your own baseline, understand changes and choose a follow-up. Explore a fictional mission to see the complete workflow.</p><div className="control-row"><button className="button primary" onClick={start}>Start Mission Demo</button><button className="button" onClick={() => dispatch({ type: 'mode/set', mode: 'astronaut' })}>Check My Health</button><button className="button" onClick={() => { dispatch({ type: 'mode/set', mode: 'mission' }); dispatch({ type: 'navigate', section: 'spacecraft' }) }}>Explore the Spacecraft</button></div></> : <><p>Mira’s synthetic sleep, fatigue and reaction results have changed. The baseline and evidence come from the actual mission records; this demonstration does not diagnose a condition.</p><ol><li><strong>Evaluate:</strong> compare sleep, fatigue and reaction time in Integrated Review.</li><li><strong>Explain:</strong> read the finding, baseline sources and demonstration limits.</li><li><strong>Act and follow up:</strong> open Alerts & Cases, acknowledge, begin review and record what you checked. Acknowledgement is not recovery; case resolution requires the Medical Officer demo context.</li></ol><div className="control-row"><button className="button" onClick={() => dispatch({ type: 'navigate', section: 'performance' })}>View performance results</button><button className="button primary" onClick={() => dispatch({ type: 'navigate', section: 'events' })}>Open alerts and follow-up</button><button className="text-button" onClick={start}>Replay demo</button><button className="text-button" onClick={() => dispatch({ type: 'mode/set', mode: 'astronaut' })}>Return to My Health</button></div></>}
    <p className="sample-note">Research prototype · synthetic and observed records remain separate · no diagnosis or treatment prescription · camera is optional and starts only with your consent.</p>
  </Panel></div>
}
