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
