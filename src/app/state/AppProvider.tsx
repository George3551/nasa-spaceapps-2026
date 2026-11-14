import { useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { AppContext } from './context'
import { appReducer, createAppState } from './reducer'

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createAppState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
