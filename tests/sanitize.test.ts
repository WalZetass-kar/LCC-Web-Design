import { describe, it, expect } from 'vitest'
import { escapeHtml, sanitizeText, sanitizePhoneNumber } from '../src/shared/sanitize'

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('converts non-string input to string', () => {
    expect(escapeHtml(42)).toBe('42')
    expect(escapeHtml(true)).toBe('true')
  })

  it('handles strings with no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s')
  })
})

describe('sanitizeText', () => {
  it('removes HTML special chars', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bbold/b')
  })

  it('collapses whitespace', () => {
    expect(sanitizeText('hello    world')).toBe('hello world')
  })

  it('trims leading/trailing spaces', () => {
    expect(sanitizeText('  spaced  ')).toBe('spaced')
  })

  it('returns empty string for null/undefined', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(undefined)).toBe('')
  })

  it('handles normal text', () => {
    expect(sanitizeText('John Doe')).toBe('John Doe')
  })

  it('removes quotes', () => {
    expect(sanitizeText('say "hello"')).toBe('say hello')
  })

  it('removes ampersand', () => {
    expect(sanitizeText('AT&T')).toBe('ATT')
  })
})

describe('sanitizePhoneNumber', () => {
  it('removes non-numeric chars except +', () => {
    expect(sanitizePhoneNumber('(+62) 812-3456-7890')).toBe('+6281234567890')
  })

  it('returns empty string for null/undefined', () => {
    expect(sanitizePhoneNumber(null)).toBe('')
    expect(sanitizePhoneNumber(undefined)).toBe('')
  })

  it('handles numbers only', () => {
    expect(sanitizePhoneNumber('08123456789')).toBe('08123456789')
  })

  it('strips letters', () => {
    expect(sanitizePhoneNumber('phone: 08123456789')).toBe('08123456789')
  })

  it('preserves leading +', () => {
    expect(sanitizePhoneNumber('+1 (555) 123-4567')).toBe('+15551234567')
  })
})
