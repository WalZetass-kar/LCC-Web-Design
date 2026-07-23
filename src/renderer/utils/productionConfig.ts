import { assertProductionEndpoint } from '../../shared/endpointSecurity'
import { getSupabaseConfig, isSupabaseConfigured } from '../../shared/supabase/config'

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  aiProviderUrl: import.meta.env.VITE_AI_PROVIDER_URL as string | undefined,
  supabaseApiKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  supabaseProjectId: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  aiRefererUrl: import.meta.env.VITE_AI_REFERER_URL as string | undefined,
  requireProductionEndpoints: import.meta.env.VITE_REQUIRE_PRODUCTION_ENDPOINTS === 'true',
  certPinSha256: import.meta.env.VITE_CERT_PIN_SHA256 as string | undefined,
}

export function validateProductionConfig() {
  if (!appConfig.requireProductionEndpoints) {
    return { valid: true as const }
  }

  const api = assertProductionEndpoint(appConfig.apiBaseUrl ?? '', 'VITE_API_BASE_URL')
  if (!api.valid) return api

  const ai = assertProductionEndpoint(appConfig.aiProviderUrl ?? '', 'VITE_AI_PROVIDER_URL')
  if (!ai.valid) return ai

  if (!isSupabaseConfigured()) {
    const fb = getSupabaseConfig()
    return {
      valid: false as const,
      message:
        'Konfigurasi Supabase belum lengkap. Setel VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, ' +
        'dan VITE_FIREBASE_APP_ID untuk build production.',
    }
  }

  if (!appConfig.certPinSha256?.trim()) {
    return {
      valid: false as const,
      message: 'VITE_CERT_PIN_SHA256 wajib diisi untuk build production',
    }
  }

  return { valid: true as const, apiBaseUrl: api.url }
}
