export type PasswordStrength = 'weak' | 'medium' | 'strong'

export interface PasswordValidationResult {
  valid: boolean
  message?: string
  strength: PasswordStrength
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password) {
    return { valid: false, message: 'Password tidak boleh kosong', strength: 'weak' }
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter', strength: 'weak' }
  }

  if (password.length > 100) {
    return { valid: false, message: 'Password maksimal 100 karakter', strength: 'weak' }
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      message: 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol',
      strength: 'weak',
    }
  }

  if (password.length >= 12) {
    return { valid: true, strength: 'strong' }
  }

  return { valid: true, strength: 'medium' }
}
