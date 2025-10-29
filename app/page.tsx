'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChatBox } from '@/components/ChatBox'
import { RecordsPanel } from '@/components/RecordsPanel'
import { AppState, Message, INITIAL_STATE } from '@/lib/types'
import { loadState, saveState, clearState, getTodayDateKey } from '@/lib/storage'
import { getChatResponse, classifyMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

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
      const newState: AppState = {
        ...savedState,
        conversationHistory: [greetingMessage],
        lastSessionDate: getTodayDateKey()
      }
      setState(newState)
      saveState(newState)
    } else {
      setState(savedState)
    }
  }, [])

  const mergeCategories = (existing: string[], newItems: string[]): string[] => {
    const merged = existing.filter(item => item && item.trim()).map(item => item.trim())
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
      conversationHistory: updatedHistory,
      lastSessionDate: getTodayDateKey()
    }))

    setIsLoading(true)

    try {
      const assistantResponse = await getChatResponse(updatedHistory)

      const classificationInput = `用户: ${message}\n小安: ${assistantResponse}`
      const classification = await classifyMessage(classificationInput)
      console.log('[Classification Result]', {
        userMessage: message,
        assistantResponse,
        classification
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now()
      }

      setState(prev => {
        const todayKey = getTodayDateKey()
        console.log('[Categories Before Merge]', prev.categories)
        const newState: AppState = {
          conversationHistory: [...updatedHistory, assistantMessage],
          categories: {
            unsolved: mergeCategories(prev.categories.unsolved, classification.unsolved),
            achievements: mergeCategories(prev.categories.achievements, classification.achievements),
            gratitude: mergeCategories(prev.categories.gratitude, classification.gratitude)
          },
          conversationProgress: prev.conversationProgress,
          lastSessionDate: todayKey
        }

        console.log('[Categories After Merge]', newState.categories)

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

    const newState: AppState = {
      ...INITIAL_STATE,
      conversationHistory: [greetingMessage],
      lastSessionDate: getTodayDateKey()
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
        <div className="flex items-center gap-2">
          <Image
            src="/site-icon.png"
            alt="安心睡眠伙伴图标"
            width={32}
            height={32}
            className="rounded-md"
            priority
          />
          <h1 className="text-xl font-semibold text-gray-900">
            安心睡眠伙伴 - 你的睡前思绪整理助手
          </h1>
        </div>
        <TooltipProvider delayDuration={1000}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowRecords(!showRecords)}
                  className="lg:hidden"
                  aria-label={showRecords ? '回到对话框' : '查看思绪记录'}
                >
                  <Image
                    src={showRecords ? '/hide-records.png' : '/records.png'}
                    alt={showRecords ? '回到对话框' : '查看思绪记录'}
                    width={24}
                    height={24}
                    className="h-5 w-5"
                    priority
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showRecords ? '回到对话框' : '查看思绪记录'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  aria-label="新聊天"
                >
                  <Image
                    src="/new-chat.png"
                    alt="新聊天"
                    width={24}
                    height={24}
                    className="h-5 w-5"
                    priority
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>新聊天</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
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
