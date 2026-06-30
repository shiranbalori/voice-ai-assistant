import { useCallback, useEffect, useState } from 'react'
import type { AppState } from '../types'
import { STORAGE_KEY, defaultCallSimulationState, defaultState } from '../types'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...defaultState,
        ...parsed,
        callSimulation: { ...defaultCallSimulationState, ...parsed.callSimulation },
      }
    }
  } catch {
    /* ignore */
  }
  return { ...defaultState }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const update = useCallback((patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }))
  }, [])

  const reset = useCallback(() => {
    setState({ ...defaultState })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { state, update, reset }
}
