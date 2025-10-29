import { AppState, INITIAL_STATE, Message } from './types'

const STORAGE_KEY = 'anxin-sleep-app-state'

export const getTodayDateKey = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const deriveDateFromHistory = (history: Message[]): string | null => {
  if (!history.length) {
    return null
  }

  const latestTimestamp = history[history.length - 1]?.timestamp
  if (!latestTimestamp) {
    return null
  }

  const latestDate = new Date(latestTimestamp)
  if (Number.isNaN(latestDate.getTime())) {
    return null
  }

  const year = latestDate.getFullYear()
  const month = String(latestDate.getMonth() + 1).padStart(2, '0')
  const day = String(latestDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeCategories = (rawCategories: unknown) => {
  const asRecord = (value: unknown) =>
    (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})

  const categories = asRecord(rawCategories)

  const ensureStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    return value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return {
    pendingThings: ensureStringArray(
      categories.pendingThings ?? categories.unsolved
    ),
    happyThings: ensureStringArray(
      categories.happyThings ?? categories.achievements
    ),
    gratefulThings: ensureStringArray(
      categories.gratefulThings ?? categories.gratitude
    )
  }
}

const normalizeConversationProgress = (rawProgress: unknown) => {
  const progress = rawProgress && typeof rawProgress === 'object'
    ? (rawProgress as Record<string, unknown>)
    : {}

  const legacyCategoryMap: Record<string, 'pendingThings' | 'happyThings' | 'gratefulThings' | 'completed'> = {
    unsolved: 'pendingThings',
    achievements: 'happyThings',
    gratitude: 'gratefulThings',
    completed: 'completed'
  }

  const rawCategory = typeof progress.currentCategory === 'string'
    ? progress.currentCategory
    : 'pendingThings'

  const currentCategory =
    legacyCategoryMap[rawCategory] ?? 'pendingThings'

  return {
    currentCategory,
    currentStep: typeof progress.currentStep === 'number' ? progress.currentStep : 0,
    userName: typeof progress.userName === 'string' ? progress.userName : '',
    isCompleted: typeof progress.isCompleted === 'boolean' ? progress.isCompleted : false
  }
}

export const loadState = (): AppState => {
  if (typeof window === 'undefined') {
    return INITIAL_STATE
  }

  try {
    const serializedState = localStorage.getItem(STORAGE_KEY)
    if (serializedState === null) {
      return INITIAL_STATE
    }
    const storedState = JSON.parse(serializedState) as Partial<AppState>
    const todayKey = getTodayDateKey()

    const conversationHistory = Array.isArray(storedState.conversationHistory)
      ? storedState.conversationHistory
      : INITIAL_STATE.conversationHistory

    const categories = normalizeCategories(storedState.categories)
    const conversationProgress = normalizeConversationProgress(storedState.conversationProgress)

    const derivedDate = deriveDateFromHistory(conversationHistory)
    const storedDate = storedState.lastSessionDate ?? derivedDate

    const isHistoryStale =
      !!derivedDate && derivedDate !== todayKey

    if (!storedDate) {
      const resetState: AppState = {
        ...INITIAL_STATE,
        lastSessionDate: todayKey
      }
      saveState(resetState)
      return resetState
    }

    if (storedDate !== todayKey || isHistoryStale) {
      const resetState: AppState = {
        ...INITIAL_STATE,
        lastSessionDate: todayKey
      }
      saveState(resetState)
      return resetState
    }

    const normalizedState: AppState = {
      conversationHistory,
      categories,
      conversationProgress,
      lastSessionDate: storedDate
    }

    if (!storedState.lastSessionDate) {
      saveState(normalizedState)
    }

    return normalizedState
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
    const sanitizeCategoryArray = (items: string[]): string[] =>
      items
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)

    const validCategories = {
      pendingThings: sanitizeCategoryArray(state.categories.pendingThings),
      happyThings: sanitizeCategoryArray(state.categories.happyThings),
      gratefulThings: sanitizeCategoryArray(state.categories.gratefulThings)
    }

    const validProgress = normalizeConversationProgress(state.conversationProgress)

    const stateWithDate: AppState = {
      conversationHistory: state.conversationHistory,
      categories: validCategories,
      conversationProgress: validProgress,
      lastSessionDate: state.lastSessionDate || getTodayDateKey()
    }
    const serializedState = JSON.stringify(stateWithDate)
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
