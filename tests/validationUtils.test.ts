import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateNumber,
  validatePositive,
  validateRange,
  validateMinLength,
  validateMaxLength,
  FormValidator,
} from '../src/renderer/utils/validation'

describe('Frontend Validation Utils', () => {
  describe('validateEmail', () => {
    it('returns true for empty email (optional field)', () => {
      expect(validateEmail('')).toBe(true)
    })

    it('returns true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.id')).toBe(true)
    })

    it('returns false for invalid email', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('test @domain.com')).toBe(false)
    })
  })

  describe('validatePhone', () => {
    it('returns true for empty phone (optional field)', () => {
      expect(validatePhone('')).toBe(true)
    })

    it('returns true for valid phone numbers', () => {
      expect(validatePhone('081234567890')).toBe(true)
      expect(validatePhone('+62 812-3456-7890')).toBe(true)
      expect(validatePhone('(021) 1234567')).toBe(true)
    })

    it('returns false for invalid phone numbers', () => {
      expect(validatePhone('abc123')).toBe(false)
      expect(validatePhone('123#456')).toBe(false)
    })
  })

  describe('validateRequired', () => {
    it('returns false for null/undefined', () => {
      expect(validateRequired(null)).toBe(false)
      expect(validateRequired(undefined)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(validateRequired('')).toBe(false)
      expect(validateRequired('   ')).toBe(false)
    })

    it('returns true for non-empty string', () => {
      expect(validateRequired('test')).toBe(true)
      expect(validateRequired('  test  ')).toBe(true)
    })

    it('returns true for numbers (including 0)', () => {
      expect(validateRequired(0)).toBe(true)
      expect(validateRequired(123)).toBe(true)
    })
  })

  describe('validateNumber', () => {
    it('returns true for valid numbers', () => {
      expect(validateNumber(123)).toBe(true)
      expect(validateNumber(0)).toBe(true)
      expect(validateNumber(-45.67)).toBe(true)
      expect(validateNumber('123')).toBe(true)
      expect(validateNumber('45.67')).toBe(true)
    })

    it('returns false for invalid numbers', () => {
      expect(validateNumber('abc')).toBe(false)
      expect(validateNumber(NaN)).toBe(false)
    })
  })

  describe('validatePositive', () => {
    it('returns true for positive numbers and zero', () => {
      expect(validatePositive(0)).toBe(true)
      expect(validatePositive(100)).toBe(true)
      expect(validatePositive(0.5)).toBe(true)
    })

    it('returns false for negative numbers', () => {
      expect(validatePositive(-1)).toBe(false)
      expect(validatePositive(-0.5)).toBe(false)
    })
  })

  describe('validateRange', () => {
    it('returns true for values within range', () => {
      expect(validateRange(5, 0, 10)).toBe(true)
      expect(validateRange(0, 0, 10)).toBe(true)
      expect(validateRange(10, 0, 10)).toBe(true)
    })

    it('returns false for values outside range', () => {
      expect(validateRange(-1, 0, 10)).toBe(false)
      expect(validateRange(11, 0, 10)).toBe(false)
    })
  })

  describe('validateMinLength', () => {
    it('returns true for strings meeting minimum length', () => {
      expect(validateMinLength('test', 3)).toBe(true)
      expect(validateMinLength('test', 4)).toBe(true)
      expect(validateMinLength('  test  ', 3)).toBe(true) // trims
    })

    it('returns false for strings below minimum length', () => {
      expect(validateMinLength('te', 3)).toBe(false)
      expect(validateMinLength('  ', 3)).toBe(false)
    })
  })

  describe('validateMaxLength', () => {
    it('returns true for strings within maximum length', () => {
      expect(validateMaxLength('test', 10)).toBe(true)
      expect(validateMaxLength('test', 4)).toBe(true)
    })

    it('returns false for strings exceeding maximum length', () => {
      expect(validateMaxLength('testing', 5)).toBe(false)
    })
  })

  describe('FormValidator', () => {
    it('starts with no errors', () => {
      const validator = new FormValidator()
      expect(validator.hasErrors()).toBe(false)
      expect(validator.getErrors()).toEqual([])
    })

    it('adds and retrieves errors', () => {
      const validator = new FormValidator()
      validator.addError('email', 'Email tidak valid')
      validator.addError('password', 'Password terlalu pendek')

      expect(validator.hasErrors()).toBe(true)
      expect(validator.getErrors()).toHaveLength(2)
      expect(validator.getErrorMessage('email')).toBe('Email tidak valid')
      expect(validator.getErrorMessage('password')).toBe('Password terlalu pendek')
      expect(validator.getErrorMessage('username')).toBeUndefined()
    })

    it('clears errors', () => {
      const validator = new FormValidator()
      validator.addError('email', 'Email tidak valid')
      expect(validator.hasErrors()).toBe(true)

      validator.clear()
      expect(validator.hasErrors()).toBe(false)
      expect(validator.getErrors()).toEqual([])
    })
  })
})
