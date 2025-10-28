import { AppState, INITIAL_STATE } from './types'

const STORAGE_KEY = 'anxin-sleep-app-state'

export const loadState = (): AppState => {
  if (typeof window === 'undefined') {
    return INITIAL_STATE
  }

  try {
    const serializedState = localStorage.getItem(STORAGE_KEY)
    if (serializedState === null) {
      return INITIAL_STATE
    }
    return JSON.parse(serializedState)
  } catch (err) {
    console.error('Error loading state from localStorage:', err)
    return INITIAL_STATE
  }
}

export const saveState = (state: AppState): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const serializedState = JSON.stringify(state)
    localStorage.setItem(STORAGE_KEY, serializedState)
  } catch (err) {
    console.error('Error saving state to localStorage:', err)
  }
}

export const clearState = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Error clearing state from localStorage:', err)
  }
}
