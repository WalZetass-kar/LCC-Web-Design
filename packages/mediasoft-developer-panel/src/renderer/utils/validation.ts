// Frontend validation helpers

export const validateEmail = (email: string): boolean => {
  if (!email) return true // Optional field
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true // Optional field
  const re = /^[0-9+\-\s()]+$/
  return re.test(phone)
}

export const validateRequired = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export const validateNumber = (value: string | number): boolean => {
  if (typeof value === 'number') return !isNaN(value)
  return !isNaN(parseFloat(value))
}

export const validatePositive = (value: number): boolean => {
  return value >= 0
}

export const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max
}

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength
}

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength
}

// Form validation helper
export interface ValidationError {
  field: string
  message: string
}

export class FormValidator {
  private errors: ValidationError[] = []

  addError(field: string, message: string) {
    this.errors.push({ field, message })
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  getErrors(): ValidationError[] {
    return this.errors
  }

  getErrorMessage(field: string): string | undefined {
    const error = this.errors.find((e) => e.field === field)
    return error?.message
  }

  clear() {
    this.errors = []
  }
}
