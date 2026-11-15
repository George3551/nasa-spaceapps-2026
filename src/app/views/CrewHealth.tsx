/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Health module integration view.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { ModuleViews } from '../integration/interfaces'
import { useAppState } from '../state/context'
import { selectWorkspace } from '../state/reducer'
import { HealthMonitor } from '../../health/HealthMonitor'
import { PageHeader } from '../components/ui'
import { healthLabel } from '../navigation'

export function CrewHealth({ modules }: { modules: ModuleViews }) {
  const { state, dispatch } = useAppState(), mission = selectWorkspace(state)
  const Health = modules.health
  return <><PageHeader title={healthLabel(state.mode)} description={state.scope === 'synthetic' ? 'Simulation preview. These are not real health assessments.' : 'Observed records, personal history and follow-up checks.'} />
    {Health ? <Health mission={mission} astronautId={state.selectedAstronautId} onMeasurementAdded={record => dispatch({ type: 'measurements/upsert', records: [record] })} onAcknowledgeAlert={id => dispatch({ type: 'alerts/acknowledge', id })} /> : <HealthMonitor />}</>
}
