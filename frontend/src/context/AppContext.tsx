import { createContext, useContext, type ReactNode } from 'react'
import { useAppState } from '../hooks/useAppState'
import type { AppState } from '../types'

interface AppContextValue {
  state: AppState
  update: (patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void
  newChat: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { state, update, newChat } = useAppState()
  return (
    <AppContext.Provider value={{ state, update, newChat }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
