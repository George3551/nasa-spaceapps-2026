import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { AppAction, AppState } from './reducer'

export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null)

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppState must be used inside AppProvider')
  return context
}
