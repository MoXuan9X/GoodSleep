'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Mic, Check, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ChatBoxProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
}

export function ChatBox({ messages, onSendMessage, isLoading }: ChatBoxProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const shouldTranscribeRef = useRef(false)
  const hasStreamingMessage = messages.some(
    message => message.role === 'assistant' && Boolean(message.isStreaming)
  )
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const stopStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }
  }

  const transcriptionApiKey = process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY || ''

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size === 0) {
      return
    }

    if (!transcriptionApiKey) {
      console.error('Missing transcription API key. Set NEXT_PUBLIC_SILICONFLOW_API_KEY.')
      return
    }

    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append('model', 'TeleAI/TeleSpeechASR')
      formData.append('file', audioBlob, `recording-${Date.now()}.webm`)

      const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${transcriptionApiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const data = await response.json()
      const transcript: string =
        typeof data?.text === 'string'
          ? data.text
          : typeof data?.result === 'string'
            ? data.result
            : ''

      if (transcript) {
        setInput(prev => {
          if (!prev) {
            return transcript.trim()
          }
          const needsSpace = /\s$/.test(prev)
          return `${prev}${needsSpace ? '' : ' '}${transcript.trim()}`
        })
        requestAnimationFrame(() => {
          textareaRef.current?.focus()
        })
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
    } finally {
      setIsTranscribing(false)
      shouldTranscribeRef.current = false
    }
  }

  const handleStartRecording = async () => {
    if (isRecording || isTranscribing || isSending || isLoading) return

    if (!transcriptionApiKey) {
      console.error('Missing transcription API key. Set NEXT_PUBLIC_SILICONFLOW_API_KEY.')
      return
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.error('Audio recording is not supported in this browser.')
      return
    }

    shouldTranscribeRef.current = false
    setIsTranscribing(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      recordedChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = (event: unknown) => {
        console.error('MediaRecorder error:', event)
        setIsRecording(false)
        mediaRecorderRef.current = null
        stopStream()
      }

      mediaRecorder.onstop = () => {
        const shouldTranscribe = shouldTranscribeRef.current
        setIsRecording(false)
        stopStream()
        mediaRecorderRef.current = null

        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        recordedChunksRef.current = []

        if (shouldTranscribe) {
          transcribeAudio(audioBlob)
        } else {
          shouldTranscribeRef.current = false
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setIsRecording(false)
      mediaRecorderRef.current = null
      stopStream()
    }
  }

  const handleCancelRecording = () => {
    if (!isRecording && !mediaRecorderRef.current) return

    shouldTranscribeRef.current = false
    recordedChunksRef.current = []

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    } else {
      setIsRecording(false)
      stopStream()
    }
  }

  const handleConfirmRecording = () => {
    if (!isRecording) return

    shouldTranscribeRef.current = true
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isSending || isLoading || isTranscribing || isRecording) return

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
              placeholder={
                isTranscribing
                  ? '小安正在认真思考哦~'
                  : isRecording
                    ? '小安正在听...'
                    : '告诉小安你的想法...'
              }
              className={`w-full resize-none min-h-[60px] max-h-[120px] pr-[120px] focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-200 placeholder:text-gray-400 transition-all ${
                isRecording || isTranscribing
                  ? 'opacity-0 pointer-events-none border-transparent'
                  : 'opacity-100'
              }`}
              disabled={isSending || isLoading || isRecording || isTranscribing}
            />

            <div className="absolute inset-y-0 right-[20px] flex items-center">
              {isRecording || isTranscribing ? (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="voice-overlay__btn"
                    aria-label="取消语音输入"
                    onClick={handleCancelRecording}
                    disabled={isTranscribing}
                  >
                    <X strokeWidth={2.1} />
                  </button>
                  <button
                    type="button"
                    className={`voice-overlay__btn ${isTranscribing ? 'voice-overlay__btn--spinner' : ''}`}
                    aria-label="结束并识别"
                    onClick={handleConfirmRecording}
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? <span className="voice-overlay__spinner" /> : <Check strokeWidth={2.1} />}
                  </button>
                </div>
              ) : (
                <TooltipProvider delayDuration={500}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="voice-overlay__btn text-gray-900 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="语音输入"
                        onClick={handleStartRecording}
                        disabled={isSending || isLoading || !transcriptionApiKey}
                      >
                        <Mic className="h-6 w-6" strokeWidth={2.1} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {transcriptionApiKey ? '语音输入' : '请先配置语音识别密钥'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending || isLoading || isRecording || isTranscribing}
            className="h-[60px] w-[60px] shrink-0 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
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
