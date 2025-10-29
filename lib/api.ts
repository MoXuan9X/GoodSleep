import { Message, Categories } from './types'

const SYSTEM_PROMPT = `### 身份
助眠朋友小安，专注于通过聊天对话式沟通帮助用户把睡前脑子里想的事情都挖掘出来，引导用户安心入睡。

### 对话流程
1. **轻松开场**：跟用户打招呼，告知用户小安可以在睡前帮忙把他脑子里盘旋的事情安顿好方便他能轻松入睡。然后询问用户称呼方式。
2. **引导输出**：依次引导用户在睡前告诉小安三类事情：
    - 今天没解决的事情
    - 高兴的或是有成就感的事情
    - 需要感恩的事情
    按顺序依次引导用户说出每个类型的全部事情，每个类型最多问10件事情。当用户说完10件或用户说没有了再开始询问下个类型的事情。直到用户说今天脑子里全部没有事情了。
3.**说晚安**：用户今天都分享结束之后，温暖的说明今天睡前思绪我们都梳理完了，温柔的跟用户说晚安好梦。

### 对话要求
1. **回应用户**：用户每次新说一件事情就根据用户输出的信息回应和安抚、夸奖用户，引导用户接纳自己，并且跟用户说会帮助记录下来这些事情，在同一句话继续接下来的询问。
2. **对话风格**：通过温柔、简短的对话方式。
3. **内容限制**：禁止把帮用户记录的内容回复给用户。
4. **问题处理**：用户提出来没解决的事情不要给具体的解决方案，你只需要帮用户记下来作为代办就可以了。

### 检查机制
1. **流程检查**：用户说没有了说完了，要检查现在流程进行到哪一步，有没有依次问完三类事情。如果没有则继续问，直到用户说脑子里全部事情说完了。
2. **回复限制**：不要给具体的解决方案，不要追问事情细节，只需要回复用户帮助记录下来就可以了。
3. **内容保密**：不要回复具体的记录内容。

### 输出要求
- **格式**：纯文本
- **风格**：像和朋友聊天一样的简短一句话聊天内容
- **限制**：不要一次性说很多，禁止出现包含括号的内容，不要回复对话内容以外的任何内容`

const CLASSIFICATION_PROMPT = `
## 角色 
你是“睡前思绪整理助手”的分类模块，需要把用户当次话语整理成三类记录。请严格输出 JSON（UTF-8，字段顺序固定，禁止额外文本或注释）。

## 分类定义：
- "pendingThings": “还没解决的事”列表，用来记录未完成、尚未处理的内容。
- "happyThings": “值得开心的事”列表，用来记录让用户感到开心、满足或有成就感的事情。
- "gratefulThings": “心中感恩的事”列表，用来记录用户表达感谢、感恩或珍惜的人和事。

## 处理规则：
1. 提取用户事情的关键信息进行输出，不要记录口水话。还没解决的事情去掉今日、明日之类的描述，因为不确定用户哪些会执行。
2. 输入可能包含诸如“1. …”“2) …”“① …”等前缀或符号，请先忽略这些标号，再逐条理解。
3. 遇到“没有…/没做…/还没…”等表达未完成、缺失或担忧的句子，归入 "pendingThings"。
4. 同一句如果提到多件事，请拆成多条；保持原意，可适度精简描述。
5. 若某一类没有内容，请返回空数组 []，不要放空字符串或 null。

## 输出要求
1. 输出必须是合法 JSON格式：  {"pendingThings":[...], "happyThings":[...], "gratefulThings":[...] }，除 JSON 外不要输出任何其他文字。`

const API_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions'

const sanitizeJsonContent = (content: string): string => {
  const trimmed = content.trim()

  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim()
  }

  return trimmed
}

const normalizeToArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

type DeltaHandler = (delta: string) => Promise<void> | void

export async function streamChatResponse(
  conversationHistory: Message[],
  onDelta?: DeltaHandler
): Promise<string> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          ...conversationHistory.map(message => ({
            role: message.role,
            content: message.content
          }))
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported in this environment')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let fullContent = ''
    let isDone = false

    while (!isDone) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        const lines = event.split('\n')

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line.startsWith('data:')) {
            continue
          }

          const dataContent = line.slice(5).trim()
          if (!dataContent) {
            continue
          }

          if (dataContent === '[DONE]') {
            isDone = true
            break
          }

          try {
            const parsed = JSON.parse(dataContent)
            const delta = parsed.choices?.[0]?.delta
            if (!delta) {
              continue
            }

            const pieces = [
              typeof delta.content === 'string' ? delta.content : '',
              typeof delta.reasoning_content === 'string' ? delta.reasoning_content : ''
            ].join('')

            if (pieces) {
              fullContent += pieces
              if (onDelta) {
                await onDelta(pieces)
              }
            }
          } catch (parseError) {
            console.error('Error parsing stream chunk:', parseError, dataContent)
          }
        }

        if (isDone) {
          break
        }
      }
    }

    if (!isDone) {
      const remaining = buffer.trim()
      if (remaining && remaining !== '[DONE]') {
        try {
          const parsed = JSON.parse(remaining.replace(/^data:\s*/, ''))
          const delta = parsed.choices?.[0]?.delta
          if (delta) {
            const tailPieces = [
              typeof delta.content === 'string' ? delta.content : '',
              typeof delta.reasoning_content === 'string' ? delta.reasoning_content : ''
            ].join('')
            if (tailPieces) {
              fullContent += tailPieces
              if (onDelta) {
                await onDelta(tailPieces)
              }
            }
          }
        } catch (error) {
          // Swallow JSON parse errors for trailing buffer
        }
      }
    }

    return fullContent || '抱歉，我遇到了一些问题，请再说一次好吗？'
  } catch (error) {
    console.error('Error streaming chat API:', error)
    throw error
  }
}

export async function getChatResponse(conversationHistory: Message[]): Promise<string> {
  try {
    let combined = ''
    await streamChatResponse(conversationHistory, delta => {
      combined += delta
    })
    return combined || '抱歉，我遇到了一些问题，请再说一次好吗？'
  } catch (error) {
    console.error('Error calling chat API:', error)
    throw error
  }
}

export async function classifyMessage(userMessage: string): Promise<Categories> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'system',
            content: CLASSIFICATION_PROMPT
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const rawContent = data.choices[0]?.message?.content || '{}'
    const cleanedContent = sanitizeJsonContent(rawContent)

    try {
      const parsed = JSON.parse(cleanedContent)
      const pickValue = (obj: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
          const direct = obj?.[key]
          if (direct !== undefined) {
            return direct
          }
        }
        return undefined
      }

      return {
        pendingThings: normalizeToArray(pickValue(parsed, ['pendingThings'])),
        happyThings: normalizeToArray(pickValue(parsed, ['happyThings'])),
        gratefulThings: normalizeToArray(pickValue(parsed, ['gratefulThings']))        
      }
    } catch (parseError) {
      console.error('Error parsing classification response:', parseError, cleanedContent)
      return {
        pendingThings: [],
        happyThings: [],
        gratefulThings: []
      }
    }
  } catch (error) {
    console.error('Error classifying message:', error)
    return {
      pendingThings: [],
      happyThings: [],
      gratefulThings: []
    }
  }
}
