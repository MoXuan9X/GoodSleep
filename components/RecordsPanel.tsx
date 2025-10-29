'use client'

import { Categories } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check } from 'lucide-react'
import { useMemo, useState } from 'react'

interface RecordsPanelProps {
  categories: Categories
}

export function RecordsPanel({ categories }: RecordsPanelProps) {
  const [copied, setCopied] = useState(false)
  const dateLabel = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  }, [])

  const sections = [
    {
      title: '还没解决的事',
      emptyText: '心中暂无牵挂',
      items: categories.pendingThings
    },
    {
      title: '值得开心的事',
      emptyText: '美好待你发现',
      items: categories.happyThings
    },
    {
      title: '心中感恩的事',
      emptyText: '留下幸运瞬间',
      items: categories.gratefulThings
    }
  ]

  const handleCopy = async () => {
    const lines: string[] = [`今日睡前思绪-${dateLabel}`]
    const sectionsToCopy = sections.filter(section => section.items.length > 0)

    if (sectionsToCopy.length === 0) {
      lines.push('今日暂无记录')
    } else {
      sectionsToCopy.forEach((section, sectionIndex) => {
        lines.push(section.title)
        section.items.forEach((item, index) => {
          lines.push(`${index + 1}. ${item}`)
        })

        if (sectionIndex < sectionsToCopy.length - 1) {
          lines.push('')
        }
      })
    }

    const content = lines.join('\n').trim()

    try {
      await navigator.clipboard.writeText(content.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">今日睡前思绪-{dateLabel}</h2>

        {sections.map((section, index) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.items.length === 0 ? (
                <p className="text-sm text-gray-500">{section.emptyText}</p>
              ) : (
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm flex items-start">
                      <span className="text-gray-400 mr-2">{itemIndex + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-4 border-t bg-white">
        <Button
          onClick={handleCopy}
          variant="outline"
          className="w-full"
          disabled={copied}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              复制今日记录
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
