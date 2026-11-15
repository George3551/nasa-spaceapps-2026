/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: React entry point.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AppProvider } from './app/state/AppProvider'
import './app/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Application root element is missing')

createRoot(root).render(
  <StrictMode>
    <AppProvider><App /></AppProvider>
  </StrictMode>,
)
