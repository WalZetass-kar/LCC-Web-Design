import { describe, it, expect } from 'vitest'

function calcPoinEarned(subTotal: number, hasCustomer: boolean): number {
  if (!hasCustomer) return 0
  return Math.floor(subTotal / 10000)
}

function normalizePhoneForWhatsapp(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits
}

describe('Business Logic', () => {
  describe('calcPoinEarned', () => {
    it('tanpa customer = 0 poin', () => expect(calcPoinEarned(100000, false)).toBe(0))
    it('100000 belanja = 10 poin', () => expect(calcPoinEarned(100000, true)).toBe(10))
    it('poin dibulatkan ke bawah', () => expect(calcPoinEarned(15000, true)).toBe(1))
    it('belanja 0 = 0 poin', () => expect(calcPoinEarned(0, true)).toBe(0))
  })

  describe('normalizePhoneForWhatsapp', () => {
    it('08x dikonversi ke 628x', () => {
      expect(normalizePhoneForWhatsapp('081234567890')).toBe('6281234567890')
    })
    it('628x tetap', () => {
      expect(normalizePhoneForWhatsapp('6281234567890')).toBe('6281234567890')
    })
    it('karakter non-digit dihapus', () => {
      expect(normalizePhoneForWhatsapp('+62 812-3456-7890')).toBe('6281234567890')
    })
  })
})
