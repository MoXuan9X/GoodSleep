import { NextRequest, NextResponse } from 'next/server'

const TRANSCRIPTION_ENDPOINT = 'https://api.siliconflow.cn/v1/audio/transcriptions'
const DEFAULT_MODEL = 'FunAudioLLM/SenseVoiceSmall'

const apiKey = process.env.SILICONFLOW_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY

if (!apiKey) {
  console.warn('SiliconFlow API key is not set. Set SILICONFLOW_API_KEY or NEXT_PUBLIC_OPENROUTER_API_KEY.')
}

export async function POST(req: NextRequest) {
  try {
    const incomingFormData = await req.formData()
    const file = incomingFormData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: '缺少音频文件，请重新录制后再试。' },
        { status: 400 }
      )
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: '服务器缺少语音识别密钥，请联系管理员配置。' },
        { status: 500 }
      )
    }

    const model = incomingFormData.get('model')
    const forwardFormData = new FormData()
    forwardFormData.append('model', typeof model === 'string' && model.trim() ? model : DEFAULT_MODEL)
    forwardFormData.append('file', file, file.name)

    const response = await fetch(TRANSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: forwardFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SiliconFlow transcription error:', response.status, errorText)
      return NextResponse.json(
        { error: '语音识别服务失败，请稍后再试。', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Transcription proxy error:', error)
    return NextResponse.json(
      { error: '服务器处理语音识别时出现问题，请稍后再试。' },
      { status: 500 }
    )
  }
}
