import { describe, expect, it } from 'vitest'
import { isLicenseSessionExpiredResult } from '../src/shared/licenseSession'

describe('license session result detection', () => {
  it('recognizes Supabase admin session expiration by error code', () => {
    expect(isLicenseSessionExpiredResult({
      success: false,
      message: 'Session developer kedaluwarsa. Silakan login ulang atau refresh token.',
      data: { error_code: 'SESSION_EXPIRED' },
    })).toBe(true)
  })

  it('recognizes expired JWT text', () => {
    expect(isLicenseSessionExpiredResult({
      success: false,
      message: 'invalid jwt: token is expired',
    })).toBe(true)
  })

  it('does not treat buyer subscription expiry as an auth session expiry', () => {
    expect(isLicenseSessionExpiredResult({
      success: false,
      message: 'Langganan sudah berakhir',
      data: { error_code: 'EXPIRED' },
    })).toBe(false)
  })
})
