import { describe, it, expect } from 'vitest'
import { validatePasswordStrength } from '../src/shared/passwordPolicy'

describe('validatePasswordStrength', () => {
  it('rejects empty password', () => {
    const r = validatePasswordStrength('')
    expect(r.valid).toBe(false)
    expect(r.strength).toBe('weak')
  })

  it('rejects short password', () => {
    const r = validatePasswordStrength('Ab1!')
    expect(r.valid).toBe(false)
    expect(r.message).toContain('8 karakter')
  })

  it('rejects password without uppercase', () => {
    const r = validatePasswordStrength('abcdefg1!')
    expect(r.valid).toBe(false)
  })

  it('rejects password without lowercase', () => {
    const r = validatePasswordStrength('ABCDEFG1!')
    expect(r.valid).toBe(false)
  })

  it('rejects password without number', () => {
    const r = validatePasswordStrength('Abcdefgh!')
    expect(r.valid).toBe(false)
  })

  it('rejects password without special char', () => {
    const r = validatePasswordStrength('Abcdefgh1')
    expect(r.valid).toBe(false)
  })

  it('accepts valid medium password (8-11 chars)', () => {
    const r = validatePasswordStrength('Abcdef1!')
    expect(r.valid).toBe(true)
    expect(r.strength).toBe('medium')
  })

  it('accepts valid strong password (12+ chars)', () => {
    const r = validatePasswordStrength('Abcdefgh123!')
    expect(r.valid).toBe(true)
    expect(r.strength).toBe('strong')
  })

  it('rejects password over 100 chars', () => {
    const r = validatePasswordStrength('A'.repeat(101))
    expect(r.valid).toBe(false)
    expect(r.message).toContain('100')
  })
})
