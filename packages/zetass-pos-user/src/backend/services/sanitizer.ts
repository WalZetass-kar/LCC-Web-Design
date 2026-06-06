/**
 * Input Sanitization Service
 * Prevents XSS, SQL injection, and other security vulnerabilities
 */

/**
 * Remove HTML tags from string
 * @param input - Input string
 * @returns Sanitized string
 */
export function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Remove script tags and their content
 * @param input - Input string
 * @returns Sanitized string
 */
export function stripScriptTags(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

/**
 * Sanitize string for safe display (prevent XSS)
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return input
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize input for database queries (prevent SQL injection)
 * Note: This is a basic sanitizer. Always use parameterized queries!
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeForDatabase(input: string): string {
  if (!input) return input
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
}

/**
 * Validate and sanitize email address
 * @param email - Email address
 * @returns Object with validity and sanitized email
 */
export function sanitizeEmail(email: string): { valid: boolean; email: string } {
  if (!email) return { valid: false, email: '' }
  
  const sanitized = email.trim().toLowerCase()
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  return {
    valid: emailRegex.test(sanitized),
    email: sanitized,
  }
}

/**
 * Validate and sanitize phone number
 * @param phone - Phone number
 * @returns Object with validity and sanitized phone
 */
export function sanitizePhone(phone: string): { valid: boolean; phone: string } {
  if (!phone) return { valid: false, phone: '' }
  
  // Remove all non-numeric characters except + at start
  const sanitized = phone.replace(/[^\d+]/g, '')
  
  // Indonesian phone format: 08xx-xxxx-xxxx or +628xx-xxxx-xxxx
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
  
  return {
    valid: phoneRegex.test(sanitized),
    phone: sanitized,
  }
}

/**
 * Validate and sanitize numeric input
 * @param input - Input value
 * @returns Object with validity and sanitized number
 */
export function sanitizeNumber(input: string | number): { valid: boolean; number: number } {
  if (input === null || input === undefined || input === '') {
    return { valid: false, number: 0 }
  }
  
  const num = typeof input === 'string' ? parseFloat(input) : input
  
  return {
    valid: !isNaN(num) && isFinite(num),
    number: num,
  }
}

/**
 * Validate and sanitize integer input
 * @param input - Input value
 * @returns Object with validity and sanitized integer
 */
export function sanitizeInteger(input: string | number): { valid: boolean; number: number } {
  if (input === null || input === undefined || input === '') {
    return { valid: false, number: 0 }
  }
  
  const num = typeof input === 'string' ? parseInt(input, 10) : Math.floor(input)
  
  return {
    valid: !isNaN(num) && isFinite(num),
    number: num,
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validity and error message
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  message?: string
  strength: 'weak' | 'medium' | 'strong'
} {
  if (!password) {
    return { valid: false, message: 'Password tidak boleh kosong', strength: 'weak' }
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter', strength: 'weak' }
  }
  
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  // Minimum requirements: uppercase, lowercase, number, symbol
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      message: 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol',
      strength: 'weak',
    }
  }
  
  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'medium'
  
  if (password.length >= 12) {
    strength = 'strong'
  } else if (password.length >= 10) {
    strength = 'medium'
  }
  
  return { valid: true, strength }
}

/**
 * Validate file upload
 * @param filename - File name
 * @param size - File size in bytes
 * @param allowedExtensions - Array of allowed extensions (e.g., ['.jpg', '.png'])
 * @param maxSize - Maximum file size in bytes
 * @returns Object with validity and error message
 */
export function validateFileUpload(
  filename: string,
  size: number,
  allowedExtensions: string[],
  maxSize: number
): { valid: boolean; message?: string } {
  if (!filename) {
    return { valid: false, message: 'Nama file tidak boleh kosong' }
  }
  
  // Check file extension
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      message: `Ekstensi file tidak diizinkan. Hanya ${allowedExtensions.join(', ')} yang diperbolehkan`,
    }
  }
  
  // Check file size
  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      message: `Ukuran file terlalu besar. Maksimal ${maxSizeMB} MB`,
    }
  }
  
  return { valid: true }
}

/**
 * Sanitize filename for safe storage
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return ''
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 255) // Limit length
}

/**
 * Validate input length
 * @param input - Input string
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @returns Object with validity and error message
 */
export function validateLength(
  input: string,
  minLength: number,
  maxLength: number
): { valid: boolean; message?: string } {
  if (!input) {
    return { valid: false, message: 'Input tidak boleh kosong' }
  }
  
  if (input.length < minLength) {
    return { valid: false, message: `Input minimal ${minLength} karakter` }
  }
  
  if (input.length > maxLength) {
    return { valid: false, message: `Input maksimal ${maxLength} karakter` }
  }
  
  return { valid: true }
}

/**
 * Sanitize object by applying sanitization to all string properties
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = stripHtmlTags(sanitized[key] as string) as any
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }
  
  return sanitized
}
