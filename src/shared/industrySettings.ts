export type AiProvider = 'local' | 'deepseek' | 'openrouter' | 'gemini' | 'custom'

export interface IndustrySettings {
  aiEnabled: boolean
  aiProvider: AiProvider
  aiModel: string
  aiBaseUrl: string
  aiApiKey: string
  googleSheetsEnabled: boolean
  googleSheetsWebAppUrl: string
  autoBackupEnabled: boolean
  backupRetentionDays: number
}

export const DEFAULT_INDUSTRY_SETTINGS: IndustrySettings = {
  aiEnabled: false,
  aiProvider: 'local',
  aiModel: '',
  aiBaseUrl: '',
  aiApiKey: '',
  googleSheetsEnabled: false,
  googleSheetsWebAppUrl: '',
  autoBackupEnabled: true,
  backupRetentionDays: 30,
}

const AI_PROVIDERS: AiProvider[] = ['local', 'deepseek', 'openrouter', 'gemini', 'custom']

function toBool(value: unknown, fallback = false) {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
  return Boolean(value)
}

function toText(value: unknown) {
  return String(value ?? '').trim()
}

function toRetentionDays(value: unknown) {
  const days = Number(value)
  if (!Number.isFinite(days)) return DEFAULT_INDUSTRY_SETTINGS.backupRetentionDays
  return Math.min(365, Math.max(1, Math.round(days)))
}

export function normalizeIndustrySettings(input: Partial<IndustrySettings> | Record<string, unknown> | null | undefined): IndustrySettings {
  const raw = (input ?? {}) as Record<string, unknown> & Partial<IndustrySettings>
  const provider = toText(raw.aiProvider || raw.ai_provider) as AiProvider
  return {
    aiEnabled: toBool(raw.aiEnabled ?? raw.ai_enabled, DEFAULT_INDUSTRY_SETTINGS.aiEnabled),
    aiProvider: AI_PROVIDERS.includes(provider) ? provider : DEFAULT_INDUSTRY_SETTINGS.aiProvider,
    aiModel: toText(raw.aiModel ?? raw.ai_model),
    aiBaseUrl: toText(raw.aiBaseUrl ?? raw.ai_base_url).replace(/\/+$/, ''),
    aiApiKey: toText(raw.aiApiKey ?? raw.ai_api_key),
    googleSheetsEnabled: toBool(raw.googleSheetsEnabled ?? raw.google_sheets_enabled, DEFAULT_INDUSTRY_SETTINGS.googleSheetsEnabled),
    googleSheetsWebAppUrl: toText(raw.googleSheetsWebAppUrl ?? raw.google_sheets_webapp_url),
    autoBackupEnabled: toBool(raw.autoBackupEnabled ?? raw.auto_backup_enabled, DEFAULT_INDUSTRY_SETTINGS.autoBackupEnabled),
    backupRetentionDays: toRetentionDays(raw.backupRetentionDays ?? raw.backup_retention_days),
  }
}

export function defaultModelForProvider(provider: AiProvider) {
  if (provider === 'deepseek') return 'deepseek-chat'
  if (provider === 'openrouter') return 'deepseek/deepseek-r1:free'
  if (provider === 'gemini') return 'gemini-1.5-flash'
  return ''
}
