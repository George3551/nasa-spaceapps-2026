import { lazy, Suspense, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppState } from '../app/state/context'
import type { AssistantProvider } from './provider'
import { conversationKey } from './scope'

// Loaded from the same origin on first open; keeps the initial application bundle unchanged.
const AssistantPanel = lazy(() => import('./AssistantPanel'))

/** Sidebar toggle + side panel. Mounted once in the app shell for Astronaut Mode.
 *  The conversation is in-memory only and is keyed by user context/workspace/subject. */
export function AssistantDock({ provider }: { provider?: AssistantProvider }) {
  const { state } = useAppState()
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  return <>
    <button ref={toggle} type="button" className="nav-item" aria-expanded={open} aria-controls="aegis-assistant-panel" onClick={() => { setLoaded(true); setOpen(o => !o) }}><span className="mono" aria-hidden="true">13</span>Guided Assistant</button>
    {loaded && createPortal(<Suspense fallback={<p className="sr-only" role="status">Loading assistant…</p>}><AssistantPanel key={conversationKey(state)} {...(provider ? { provider } : {})} open={open} onClose={() => { setOpen(false); toggle.current?.focus() }} /></Suspense>, document.body)}
  </>
}
