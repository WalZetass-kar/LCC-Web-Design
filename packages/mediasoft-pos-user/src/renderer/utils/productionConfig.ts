import { assertProductionEndpoint } from '../../shared/endpointSecurity'

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  aiProviderUrl: import.meta.env.VITE_AI_PROVIDER_URL as string | undefined,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
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

  const supabase = assertProductionEndpoint(appConfig.supabaseUrl ?? '', 'VITE_SUPABASE_URL')
  if (!supabase.valid) return supabase

  if (!appConfig.certPinSha256?.trim()) {
    return {
      valid: false as const,
      message: 'VITE_CERT_PIN_SHA256 wajib diisi untuk build production',
    }
  }

  return { valid: true as const, apiBaseUrl: api.url }
}
