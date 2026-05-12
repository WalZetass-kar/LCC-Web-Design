import { describe, expect, it } from 'vitest'
import { buildFonntePayload, isValidWhatsAppTarget, normalizeWhatsAppNumber } from '../src/backend/services/whatsappService'

describe('WhatsAppService helpers', () => {
  it('normalizes common Indonesian phone formats', () => {
    expect(normalizeWhatsAppNumber('0812-3456-7890')).toBe('6281234567890')
    expect(normalizeWhatsAppNumber('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizeWhatsAppNumber('81234567890')).toBe('6281234567890')
  })

  it('validates WhatsApp targets', () => {
    expect(isValidWhatsAppTarget('6281234567890')).toBe(true)
    expect(isValidWhatsAppTarget('12345')).toBe(false)
    expect(isValidWhatsAppTarget('120363123456789@g.us')).toBe(true)
  })

  it('builds a Fonnte-compatible form payload', () => {
    const payload = buildFonntePayload({ to: '081234567890', message: 'Test' })

    expect(payload.get('target')).toBe('6281234567890')
    expect(payload.get('message')).toBe('Test')
    expect(payload.get('countryCode')).toBe('62')
    expect(payload.get('connectOnly')).toBe('true')
  })
})
