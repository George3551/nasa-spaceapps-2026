import type { ModuleViews } from './integration/interfaces'
import type { Section } from './state/reducer'
import { useAppState } from './state/context'
import { formatTimestamp } from './format'
import { ModulePlaceholder } from './components/Panel'
import { Dashboard } from './views/Dashboard'
import { CrewHealth } from './views/CrewHealth'
import { Events } from './views/Events'

const navigation: { id: Section; label: string; mark: string }[] = [
  { id: 'dashboard', label: 'Mission Dashboard', mark: '01' },
  { id: 'health', label: 'Crew Health', mark: '02' },
  { id: 'spacecraft', label: 'Spacecraft', mark: '03' },
  { id: 'simulation', label: 'Mission Simulation', mark: '04' },
  { id: 'events', label: 'Events & Alerts', mark: '05' },
]

export function App({ modules = {} }: { modules?: ModuleViews }) {
  const { state, dispatch } = useAppState()
  const Spacecraft = modules.spacecraft, Simulation = modules.simulation
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar"><a className="brand" href="#" onClick={event => { event.preventDefault(); dispatch({ type: 'navigate', section: 'dashboard' }) }}><span className="brand-symbol" aria-hidden="true">A</span><span>AEGIS<small>Crew health & mission</small></span></a>
      <p className="sidebar-caption">WORKSPACE</p><nav aria-label="Main navigation">{navigation.map(item => <button key={item.id} className="nav-item" aria-current={state.section === item.id ? 'page' : undefined} onClick={() => dispatch({ type: 'navigate', section: item.id })}><span className="mono" aria-hidden="true">{item.mark}</span>{item.label}</button>)}</nav>
      <div className="sidebar-bottom"><span className="badge neutral">Foundation v0.1</span><p>Integration workspace<br />Domain modules pending</p><a href="https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/" target="_blank" rel="noreferrer">Challenge reference ↗</a></div>
    </aside>
    <div className="workspace"><header className="topbar"><div><span className="mission-label">DEEP SPACE / DEMONSTRATION</span><p className="mono">{formatTimestamp(state.mission.missionTime)}</p></div><div className="topbar-status"><span className="badge">Synthetic mission data</span><span className="badge neutral">{state.mission.paused ? 'Clock paused' : 'Clock running'}</span></div></header>
      <main id="main-content" className="main-content" key={state.section}>
        {state.section === 'dashboard' && <Dashboard />}
        {state.section === 'health' && <CrewHealth modules={modules} />}
        {state.section === 'spacecraft' && <><div className="page-intro"><div><p className="eyebrow">Mission context</p><h1>Spacecraft</h1></div></div>{Spacecraft ? <Spacecraft mission={state.mission} selectedAstronautId={state.selectedAstronautId} selectedCompartmentId={state.selectedCompartmentId} onSelectAstronaut={id => dispatch({ type: 'crew/select', id })} onSelectCompartment={id => dispatch({ type: 'compartment/select', id })} /> : <ModulePlaceholder name="Spacecraft digital twin" owner="src/mission/ · feat/mission-ui">The mission view will display compartments, crew positions and environmental context from the shared state.</ModulePlaceholder>}</>}
        {state.section === 'simulation' && <><div className="page-intro"><div><p className="eyebrow">Mission simulation</p><h1>A reproducible mission.</h1></div></div>{Simulation ? <Simulation mission={state.mission} onMissionChanged={mission => dispatch({ type: 'mission/replace', mission })} /> : <ModulePlaceholder name="Mission simulator" owner="src/simulation/ · feat/simulation">Scenario controls and a single mission clock will be added by the simulation developer. No engine is running.</ModulePlaceholder>}<div className="fixture-control"><p className="muted">Reloading restores the one-profile integration fixture. Page refresh also resets this temporary state.</p><button className="button" onClick={() => dispatch({ type: 'fixture/reset' })}>Reload integration sample</button></div></>}
        {state.section === 'events' && <Events />}
      </main>
      <footer className="footer"><span>AEGIS · Research prototype · Synthetic data</span><span>Not a clinical assessment · No external runtime API</span></footer>
    </div>
  </div>
}
