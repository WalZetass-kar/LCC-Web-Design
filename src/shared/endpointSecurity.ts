export interface UrlValidationResult {
  valid: boolean
  url?: string
  message?: string
}

const PLACEHOLDER_HOSTS = new Set([
  `your${'pos'}.com`,
  `api.your${'pos'}.com`,
  `your-${'site'}.com`,
  'example.com',
  'localhost',
  '127.0.0.1',
])

export function normalizeHttpsUrl(value: string): UrlValidationResult {
  const raw = value.trim().replace(/\/+$/, '')
  if (!raw) return { valid: false, message: 'URL wajib diisi' }

  let parsed: URL
  try {
    parsed = new URL(raw.includes('://') ? raw : `https://${raw}`)
  } catch {
    return { valid: false, message: 'Format URL tidak valid' }
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, message: 'URL harus menggunakan HTTPS' }
  }

  if (PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { valid: false, message: 'URL masih placeholder atau alamat development' }
  }

  return { valid: true, url: parsed.toString().replace(/\/+$/, '') }
}

export function assertProductionEndpoint(value: string, label = 'Endpoint'): UrlValidationResult {
  const result = normalizeHttpsUrl(value)
  if (!result.valid) {
    return { ...result, message: `${label}: ${result.message}` }
  }
  return result
}
