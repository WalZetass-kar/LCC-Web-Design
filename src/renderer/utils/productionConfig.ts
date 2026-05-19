import { assertProductionEndpoint } from '../../shared/endpointSecurity'
import { Capacitor } from '@capacitor/core'

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  requireProductionEndpoints: import.meta.env.VITE_REQUIRE_PRODUCTION_ENDPOINTS === 'true',
  certPinSha256: import.meta.env.VITE_CERT_PIN_SHA256 as string | undefined,
}

export function validateProductionConfig() {
  const isNativeRuntime = Capacitor.isNativePlatform()
  const isElectronRuntime = typeof window !== 'undefined' && !!window.api

  // Android Capacitor and Electron use the local/offline data path by default.
  // Keep the HTTPS endpoint gate for browser-hosted production builds only.
  if (isNativeRuntime || isElectronRuntime) {
    return { valid: true as const }
  }

  if (!appConfig.requireProductionEndpoints) {
    return { valid: true as const }
  }

  const api = assertProductionEndpoint(appConfig.apiBaseUrl ?? '', 'VITE_API_BASE_URL')
  if (!api.valid) return api

  if (!appConfig.certPinSha256?.trim()) {
    return {
      valid: false as const,
      message: 'VITE_CERT_PIN_SHA256 wajib diisi untuk build production',
    }
  }

  return { valid: true as const, apiBaseUrl: api.url }
}
