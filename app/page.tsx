'use client'

import { useEffect, useState } from 'react'
import { ChatBox } from '@/components/ChatBox'
import { RecordsPanel } from '@/components/RecordsPanel'
import { AppState, Message, INITIAL_STATE } from '@/lib/types'
import { loadState, saveState, clearState } from '@/lib/storage'
import { getChatResponse, classifyMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { RefreshCw, Menu, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const GREETING_MESSAGE = '你好！我是小安，可以在睡前帮你把脑子里盘旋的事情安顿好，让你轻松入睡。请问怎么称呼你呢？'

export default function Home() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [showRecords, setShowRecords] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const savedState = loadState()

    if (savedState.conversationHistory.length === 0) {
      const greetingMessage: Message = {
        role: 'assistant',
        content: GREETING_MESSAGE,
        timestamp: Date.now()
      }
      const newState = {
        ...savedState,
        conversationHistory: [greetingMessage]
      }
      setState(newState)
      saveState(newState)
    } else {
      setState(savedState)
    }
  }, [])

  const mergeCategories = (existing: string[], newItems: string[]): string[] => {
    const merged = [...existing]
    newItems.forEach(item => {
      if (item && item.trim() && !merged.includes(item.trim())) {
        merged.push(item.trim())
      }
    })
    return merged
  }

  const handleSendMessage = async (message: string) => {
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    }

    const updatedHistory = [...state.conversationHistory, userMessage]

    setState(prev => ({
      ...prev,
      conversationHistory: updatedHistory
    }))

    setIsLoading(true)

    try {
      const [assistantResponse, classification] = await Promise.all([
        getChatResponse(updatedHistory),
        classifyMessage(message)
      ])

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now()
      }

      setState(prev => {
        const newState: AppState = {
          conversationHistory: [...updatedHistory, assistantMessage],
          categories: {
            unsolved: mergeCategories(prev.categories.unsolved, classification.unsolved),
            achievements: mergeCategories(prev.categories.achievements, classification.achievements),
            gratitude: mergeCategories(prev.categories.gratitude, classification.gratitude)
          },
          conversationProgress: prev.conversationProgress
        }

        saveState(newState)
        return newState
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: '发送失败',
        description: '网络连接出现问题，请检查网络后重试',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    clearState()

    const greetingMessage: Message = {
      role: 'assistant',
      content: GREETING_MESSAGE,
      timestamp: Date.now()
    }

    const newState = {
      ...INITIAL_STATE,
      conversationHistory: [greetingMessage]
    }

    setState(newState)
    saveState(newState)
    setShowRecords(false)

    toast({
      title: '已开始新会话',
      description: '之前的对话已清空'
    })
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b px-4 py-4 flex items-center justify-between bg-white">
        <h1 className="text-xl font-semibold text-gray-900">安心睡眠伙伴 - 你的睡前思绪整理助手</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            title="开始新会话"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowRecords(!showRecords)}
            className="lg:hidden"
          >
            {showRecords ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full lg:grid lg:grid-cols-2 min-h-0">
          <div className={`h-full border-r ${showRecords ? 'hidden lg:flex' : 'flex'} flex-col min-h-0`}>
            <ChatBox
              messages={state.conversationHistory}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>

          <div className={`h-full ${showRecords ? 'flex' : 'hidden lg:flex'} flex-col min-h-0`}>
            <RecordsPanel categories={state.categories} />
          </div>
        </div>
      </div>
    </div>
  )
}
