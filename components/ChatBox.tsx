'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Mic } from 'lucide-react'

interface ChatBoxProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
}

export function ChatBox({ messages, onSendMessage, isLoading }: ChatBoxProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasStreamingMessage = messages.some(
    message => message.role === 'assistant' && Boolean(message.isStreaming)
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isSending || isLoading) return

    const message = input.trim()
    setInput('')
    setIsSending(true)

    try {
      await onSendMessage(message)
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message, index) => {
          const isAssistantMessage = message.role === 'assistant'
          const isAssistantStreaming = isAssistantMessage && Boolean(message.isStreaming)
          const showBreathingDot = isAssistantStreaming && !message.content

          return (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {showBreathingDot ? (
                <span className="typing-indicator-dot text-gray-900 ml-4" />
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的想法..."
              className="w-full resize-none min-h-[60px] max-h-[120px] pr-14 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-200"
              disabled={isSending || isLoading}
            />
            <button
              type="button"
              className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 transition-colors hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="语音输入"
              title="敬请期待~"
              disabled={isSending || isLoading}
            >
              <Mic className="h-6 w-6" strokeWidth={2.1} />
            </button>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending || isLoading}
            className="h-[60px] w-[60px] shrink-0"
          >
            {isSending || isLoading ? (
              <span className="button-typing-dots">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
