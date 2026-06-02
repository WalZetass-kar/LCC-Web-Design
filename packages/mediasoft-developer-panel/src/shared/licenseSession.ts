type LicenseResultLike = {
  message?: unknown
  error_code?: unknown
  data?: unknown
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function getLicenseSessionErrorCode(result: LicenseResultLike | null | undefined): string {
  const data = record(result?.data)
  return text(result?.error_code || data.error_code).trim().toUpperCase()
}

export function isLicenseSessionExpiredResult(result: LicenseResultLike | null | undefined): boolean {
  const code = getLicenseSessionErrorCode(result)
  if (code === 'SESSION_EXPIRED' || code === 'TOKEN_EXPIRED') return true

  const data = record(result?.data)
  const message = [
    result?.message,
    data.message,
    data.detail,
  ].map(text).join(' ').toLowerCase()

  return message.includes('invalid jwt')
    || message.includes('token is expired')
    || (message.includes('jwt') && (message.includes('expired') || message.includes('kedaluwarsa') || message.includes('kadaluarsa')))
    || (message.includes('session') && message.includes('developer') && (message.includes('expired') || message.includes('kedaluwarsa') || message.includes('kadaluarsa')))
}
