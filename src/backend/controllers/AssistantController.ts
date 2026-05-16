import { IndustrySettingsController } from './IndustrySettingsController.js'
import { buildAssistantPrompt, buildLocalAssistantResponse } from '../../shared/dashboardAssistant.js'
import { defaultModelForProvider, type IndustrySettings } from '../../shared/industrySettings.js'
import type { DashboardSummary } from '../../shared/types.js'

interface AssistantRequest {
  question: string
  summary: DashboardSummary
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

function defaultBaseUrl(settings: IndustrySettings) {
  if (settings.aiProvider === 'deepseek') return 'https://api.deepseek.com/chat/completions'
  if (settings.aiProvider === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions'
  return settings.aiBaseUrl
}

async function askOpenAiCompatible(settings: IndustrySettings, prompt: string) {
  const url = defaultBaseUrl(settings)
  if (!url) throw new Error('Base URL AI belum diisi')
  if (!settings.aiApiKey) throw new Error('API key AI belum diisi')

  const model = settings.aiModel || defaultModelForProvider(settings.aiProvider)
  if (!model) throw new Error('Model AI belum diisi')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.aiApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mediasoft-pos-zetass.local',
      'X-Title': 'MediaSoft POS Zetass v2.0',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah Asisten Zetass-Kar, analis POS yang menjawab ringkas, akurat, dan praktis dalam Bahasa Indonesia.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const data = await response.json().catch(() => null) as ChatCompletionResponse | null
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `AI HTTP ${response.status}`)
  }

  const answer = data?.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('AI tidak mengembalikan jawaban')
  return answer
}

async function askGemini(settings: IndustrySettings, prompt: string) {
  if (!settings.aiApiKey) throw new Error('API key Gemini belum diisi')

  const model = settings.aiModel || defaultModelForProvider('gemini')
  const baseUrl = settings.aiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta'
  const url = `${baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.aiApiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
    }),
  })

  const data = await response.json().catch(() => null) as any
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`)
  }

  const answer = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text).filter(Boolean).join('\n').trim()
  if (!answer) throw new Error('Gemini tidak mengembalikan jawaban')
  return answer
}

async function askOnline(settings: IndustrySettings, prompt: string) {
  if (settings.aiProvider === 'gemini') return askGemini(settings, prompt)
  return askOpenAiCompatible(settings, prompt)
}

export class AssistantController {
  static async ask(input: AssistantRequest) {
    try {
      const question = String(input?.question ?? '').trim()
      if (!question) return { success: false, message: 'Pertanyaan wajib diisi' }
      if (!input?.summary) return { success: false, message: 'Data dashboard belum tersedia' }

      const settings = IndustrySettingsController.getSettings()
      const localAnswer = buildLocalAssistantResponse(question, input.summary)

      if (!settings.aiEnabled || settings.aiProvider === 'local') {
        return {
          success: true,
          data: { answer: localAnswer, provider: 'local', online: false },
        }
      }

      try {
        const answer = await askOnline(settings, buildAssistantPrompt(question, input.summary))
        return {
          success: true,
          data: { answer, provider: settings.aiProvider, model: settings.aiModel || defaultModelForProvider(settings.aiProvider), online: true },
        }
      } catch (error) {
        return {
          success: true,
          data: {
            answer: `${localAnswer}\n\nAI online belum bisa dipakai: ${error instanceof Error ? error.message : String(error)}`,
            provider: 'local-fallback',
            online: false,
          },
        }
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }
}
