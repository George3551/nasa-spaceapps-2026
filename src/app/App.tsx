/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Application shell and role-scoped navigation.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { useEffect, useState } from 'react'
import type { ModuleViews } from './integration/interfaces'
import { selectWorkspace } from './state/reducer'
import type { AppState, DataScope, UserMode } from './state/reducer'
import { useAppState } from './state/context'
import { formatTimestamp } from './format'
import { findNavItem, navigationFor, roleLabels } from './navigation'
import { Icon } from './components/Icon'
import { PageHeader } from './components/ui'
import { MissionView } from '../mission/MissionView'
import { SimulationControls } from '../simulation/SimulationControls'
import { Assessments } from '../health/Assessments'
import { Research } from '../health/Research'
import { Dashboard } from './views/Dashboard'
import { CrewHealth } from './views/CrewHealth'
import { Events } from './views/Events'
import { CameraAssessment } from '../vision/CameraAssessment'
import { Anatomy } from '../anatomy/Anatomy'
import { HumanPerformance } from '../health/HumanPerformance'
import { SensorIntegration } from '../sensors/SensorIntegration'
import { PreventiveHealth } from '../prevention/PreventiveHealth'
import { MissionResources } from '../resources/MissionResources'
import { ReleaseIntro } from './components/ReleaseIntro'

function Sidebar({ open, onNavigate }: { open: boolean; onNavigate(): void }) {
  const { state, dispatch } = useAppState()
  const workspace = selectWorkspace(state)
  const newAlerts = workspace.alerts.filter(a => a.status === 'new').length
  return <aside className={`sidebar ${open ? 'is-open' : ''}`} id="app-navigation">
    <a className="brand" href="#" onClick={event => { event.preventDefault(); dispatch({ type: 'navigate', section: 'dashboard' }); onNavigate() }}><span className="brand-symbol" aria-hidden="true">A</span><span className="brand-text">AEGIS<small>Crew health & mission</small></span></a>
    <button className="text-button" onClick={() => { dispatch({ type: 'mode/set', mode: 'astronaut' }); onNavigate() }}>How it works</button>
    <nav aria-label="Main navigation">{navigationFor(state.mode).map(group => <div className="nav-group" key={group.id}>
      {group.label && <p className="nav-group-label" id={`nav-${group.id}`}>{group.label}</p>}
      <ul aria-labelledby={group.label ? `nav-${group.id}` : undefined}>{group.items.map(item => <li key={item.id}>
        <button className="nav-item" aria-current={state.section === item.id ? 'page' : undefined} onClick={() => { dispatch({ type: 'navigate', section: item.id }); onNavigate() }}>
          <Icon name={item.icon} /><span className="nav-label">{item.label}</span>
          {item.id === 'events' && newAlerts > 0 && <><span className="nav-count" aria-hidden="true">{newAlerts}</span><span className="visually-hidden">, {newAlerts} new</span></>}
          {item.optional && <span className="nav-tag" aria-hidden="true">{item.optional}</span>}
        </button>
      </li>)}</ul>
    </div>)}</nav>
    {state.mode !== 'mission' && <p className="nav-hint">Spacecraft and Simulator are available in the Mission Overview context.</p>}
    <div className="sidebar-bottom"><p><Icon name="lock" size={12} /> Research prototype · not a medical device</p><p>Camera is opt-in · no video stored</p><a href="https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/" target="_blank" rel="noreferrer">Challenge reference ↗</a></div>
  </aside>
}

function ContextBar() {
  const { state, dispatch } = useAppState()
  const workspace = selectWorkspace(state)
  const selectSubject = (id: string) => { const section = state.section; dispatch({ type: 'crew/select', id }); dispatch({ type: 'navigate', section }) }
  return <div className="context-controls" role="group" aria-label="Working context">
    <label className="context-field"><span>Viewing as</span><select aria-label="Demo user context" value={state.mode} onChange={e => dispatch({ type: 'mode/set', mode: e.target.value as UserMode })}>{(Object.keys(roleLabels) as UserMode[]).map(m => <option key={m} value={m}>{roleLabels[m]}</option>)}</select></label>
    {state.mode !== 'mission'
      ? <label className="context-field"><span>Data</span><select aria-label="Data workspace" value={state.scope} onChange={e => dispatch({ type: 'scope/set', scope: e.target.value as DataScope })}><option value="observed">Observed records</option><option value="synthetic">Synthetic mission preview</option></select></label>
      : <div className="context-field static"><span>Data</span><strong>Synthetic only</strong></div>}
    {state.mode !== 'astronaut'
      ? <label className="context-field"><span>Crew member</span><select aria-label="Crew member" value={state.selectedAstronautId ?? ''} onChange={e => selectSubject(e.target.value)}>{workspace.crew.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select></label>
      : <div className="context-field static"><span>Subject</span><strong>{workspace.crew[0]?.displayName ?? 'Own profile'} (you)</strong></div>}
  </div>
}

function WorkspaceBanner({ state }: { state: AppState }) {
  const synthetic = state.scope === 'synthetic'
  return <div className={`workspace-banner ${synthetic ? 'is-synthetic' : 'is-observed'}`}>
    <span className="workspace-banner-mark" aria-hidden="true" />
    <p><strong>{synthetic ? 'Synthetic workspace' : 'Observed workspace'}</strong>{synthetic ? ' — simulated mission data for demonstration, not real measurements. Live assessments are disabled here.' : ' — records entered on this device, stored only in this browser and kept separate from the simulation.'}</p>
    {synthetic && <p className="workspace-clock"><Icon name="clock" size={12} /> <span className="mono">{formatTimestamp(state.mission.missionTime)}</span> · {state.mission.paused ? 'Paused' : `Running ${state.mission.speed}×`}</p>}
    <p className="workspace-disclaimer">Fictional identities. Role switching is not authentication or authorization. Use only non-sensitive test data.</p>
  </div>
}

function Toast() {
  const { state, dispatch } = useAppState()
  const failed = state.notice?.startsWith('Not saved') ?? false
  useEffect(() => {
    if (!state.notice || failed) return
    const timer = window.setTimeout(() => dispatch({ type: 'notice', message: null }), 8000)
    return () => window.clearTimeout(timer)
  }, [state.notice, failed, dispatch])
  if (!state.notice) return null
  return <div className={`toast ${failed ? 'tone-critical' : 'tone-success'}`} role={failed ? 'alert' : 'status'}>
    <Icon name={failed ? 'warning' : 'check'} /><p>{state.notice}</p>
    <button className="icon-button" aria-label="Dismiss notification" onClick={() => dispatch({ type: 'notice', message: null })}><Icon name="close" /></button>
  </div>
}

export function App({ modules = {} }: { modules?: ModuleViews }) {
  const { state, dispatch } = useAppState()
  const [navOpen, setNavOpen] = useState(false)
  const Spacecraft = modules.spacecraft ?? MissionView, Simulation = modules.simulation
  const workspace = selectWorkspace(state)
  const location = findNavItem(state)
  useEffect(() => {
    if (!navOpen) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [navOpen])
  return <div className={`app-shell scope-${state.scope}`}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
    {navOpen && <div className="scrim" aria-hidden="true" onClick={() => setNavOpen(false)} />}
    <div className="workspace">
      <header className="topbar">
        <button className="icon-button menu-button" aria-expanded={navOpen} aria-controls="app-navigation" aria-label={navOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setNavOpen(o => !o)}><Icon name={navOpen ? 'close' : 'menu'} size={20} /></button>
        <p className="breadcrumb"><span>{roleLabels[state.mode]}</span>{location?.group.label && <><span aria-hidden="true">/</span><span>{location.group.label}</span></>}<span aria-hidden="true">/</span><strong>{location?.item.label}</strong></p>
        <ContextBar />
      </header>
      <WorkspaceBanner state={state} />
      <main id="main-content" className="main-content" key={`${state.section}-${state.mode}-${state.scope}-${state.selectedAstronautId}`}>
        <ReleaseIntro />
        {state.section === 'dashboard' && <Dashboard />}
        {state.section === 'health' && <CrewHealth modules={modules} />}
        {state.section === 'spacecraft' && state.mode === 'mission' && <><PageHeader title="Spacecraft" description="Conceptual compartment layout with synthetic crew positions and cabin readings. Select a compartment for readings or a crew member to open their synthetic profile." /><Spacecraft mission={workspace} selectedAstronautId={state.selectedAstronautId} selectedCompartmentId={state.selectedCompartmentId} onSelectAstronaut={id => dispatch({ type: 'crew/select', id })} onSelectCompartment={id => dispatch({ type: 'compartment/select', id })} /></>}
        {state.section === 'simulation' && state.mode === 'mission' && <><PageHeader title="Simulator" description="Control the reproducible synthetic mission: one authoritative clock, deterministic scenarios and seeds. Observed records are never affected." />{Simulation ? <Simulation mission={workspace} onMissionChanged={mission => dispatch({ type: 'mission/replace', mission })} /> : <SimulationControls />}</>}
        {state.section === 'events' && <Events />}
        {state.section === 'assessments' && <Assessments />}
        {state.section === 'research' && <Research />}
        {state.section === 'visual' && state.mode !== 'mission' && <CameraAssessment kind="visual" />}
        {state.section === 'physical' && state.mode !== 'mission' && <CameraAssessment kind="physical" />}
        {state.section === 'anatomy' && <Anatomy />}
        {state.section === 'performance' && <HumanPerformance />}
        {state.section === 'sensors' && <SensorIntegration />}
        {state.section === 'prevention' && <PreventiveHealth />}
        {state.section === 'resources' && <MissionResources />}
      </main>
      <footer className="footer"><span>AEGIS · research prototype · {state.scope} workspace</span><span>No clinical diagnosis · no external runtime API</span></footer>
    </div>
    <Toast />
  </div>
}
