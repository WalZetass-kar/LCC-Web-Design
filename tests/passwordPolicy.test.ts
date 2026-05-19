import { describe, expect, it } from 'vitest'
import { validatePasswordStrength } from '../src/shared/passwordPolicy'

describe('password policy', () => {
  it('requires uppercase, lowercase, number, and symbol', () => {
    expect(validatePasswordStrength('Password1').valid).toBe(false)
    expect(validatePasswordStrength('Password1!').valid).toBe(true)
  })

  it('marks long compliant passwords as strong', () => {
    expect(validatePasswordStrength('KasirStrong123!').strength).toBe('strong')
  })
})
