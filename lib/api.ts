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

const CLASSIFICATION_PROMPT = `帮我根据用户说的话，分析用户说的是什么事情，提取重要信息分别记录{{a}}=还没完成或还没解决的代办事情;{{b}}=高兴和有成就感的事情;{{c}}=需要感恩的事情。没有提到则字段先为空。JSON格式。禁止输出其他内容。`

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

export async function getChatResponse(conversationHistory: Message[]): Promise<string> {
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
          ...conversationHistory
        ],
        stream: false,
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || '抱歉，我遇到了一些问题，请再说一次好吗？'
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
      const pickValue = (obj: Record<string, unknown>, key: string) => {
        return obj?.[key] ?? obj?.[`{{${key}}}`]
      }

      return {
        unsolved: normalizeToArray(pickValue(parsed, 'a')),
        achievements: normalizeToArray(pickValue(parsed, 'b')),
        gratitude: normalizeToArray(pickValue(parsed, 'c'))
      }
    } catch (parseError) {
      console.error('Error parsing classification response:', parseError, cleanedContent)
      return {
        unsolved: [],
        achievements: [],
        gratitude: []
      }
    }
  } catch (error) {
    console.error('Error classifying message:', error)
    return {
      unsolved: [],
      achievements: [],
      gratitude: []
    }
  }
}
