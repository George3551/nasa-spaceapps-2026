/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import { lazy, Suspense, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppState } from '../app/state/context'
import type { AssistantProvider } from './provider'
import { conversationKey } from './scope'

// Loaded from the same origin on first open; keeps the initial application bundle unchanged.
const AssistantPanel = lazy(() => import('./AssistantPanel'))

/** Sidebar toggle + side panel. Mounted once in the app shell for Astronaut Mode.
 *  The conversation is in-memory only and is keyed by user context/workspace/subject. */
export function AssistantDock({ provider, onOpen }: { provider?: AssistantProvider; onOpen?(): void }) {
  const { state, dispatch } = useAppState()
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  return <>
    <button ref={toggle} type="button" className="nav-item" title="Opens your own records in Astronaut Mode" aria-expanded={open && state.mode === 'astronaut'} aria-controls="aegis-assistant-panel" onClick={() => {
      if (state.mode !== 'astronaut') {
        dispatch({ type: 'mode/set', mode: 'astronaut' })
        dispatch({ type: 'scope/set', scope: state.scope })
        dispatch({ type: 'notice', message: `Assistant opened in your own Astronaut Mode records (${state.scope}).` })
      }
      const opening = state.mode !== 'astronaut' || !open
      setLoaded(true); setOpen(opening)
      if (opening) onOpen?.()
    }}><span className="mono" aria-hidden="true">?</span>{state.mode === 'astronaut' ? 'Guided Assistant' : 'Open personal Guided Assistant'}</button>
    {loaded && createPortal(<Suspense fallback={<p className="sr-only" role="status">Loading assistant…</p>}><AssistantPanel key={conversationKey(state)} {...(provider ? { provider } : {})} open={open && state.mode === 'astronaut'} onClose={() => { setOpen(false); toggle.current?.focus() }} /></Suspense>, document.body)}
  </>
}
