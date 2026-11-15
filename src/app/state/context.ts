/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Shared React state context.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { AppAction, AppState } from './reducer'

export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null)

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppState must be used inside AppProvider')
  return context
}
