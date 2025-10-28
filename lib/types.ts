export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Categories {
  unsolved: string[]
  achievements: string[]
  gratitude: string[]
}

export interface ConversationProgress {
  currentCategory: 'unsolved' | 'achievements' | 'gratitude' | 'completed'
  currentStep: number
  userName: string
  isCompleted: boolean
}

export interface AppState {
  conversationHistory: Message[]
  categories: Categories
  conversationProgress: ConversationProgress
}

export const INITIAL_STATE: AppState = {
  conversationHistory: [],
  categories: {
    unsolved: [],
    achievements: [],
    gratitude: []
  },
  conversationProgress: {
    currentCategory: 'unsolved',
    currentStep: 0,
    userName: '',
    isCompleted: false
  }
}
