import { useCallback, useState } from 'react'
import type { AppState } from '../types'
import { defaultCallSimulationState, defaultState } from '../types'

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState)

  const update = useCallback((patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }))
  }, [])

  const newChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      chatMessages: [],
      assistantProfile: null,
      callSimulation: { ...defaultCallSimulationState },
    }))
  }, [])

  return { state, update, newChat }
}
