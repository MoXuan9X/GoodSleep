export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export interface Categories {
  pendingThings: string[]
  happyThings: string[]
  gratefulThings: string[]
}

export interface ConversationProgress {
  currentCategory: 'pendingThings' | 'happyThings' | 'gratefulThings' | 'completed'
  currentStep: number
  userName: string
  isCompleted: boolean
}

export interface AppState {
  conversationHistory: Message[]
  categories: Categories
  conversationProgress: ConversationProgress
  lastSessionDate: string
}

export const INITIAL_STATE: AppState = {
  conversationHistory: [],
  categories: {
    pendingThings: [],
    happyThings: [],
    gratefulThings: []
  },
  conversationProgress: {
    currentCategory: 'pendingThings',
    currentStep: 0,
    userName: '',
    isCompleted: false
  },
  lastSessionDate: ''
}
