import crypto from 'crypto'
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 12

/**
 * Hash password using bcrypt (secure)
 * @param plain - Plain text password
 * @returns Bcrypt hashed password
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * Verify password against bcrypt hash
 * @param plain - Plain text password
 * @param hash - Bcrypt hash
 * @returns True if password matches
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Encrypt password using SHA1 (legacy - for backward compatibility)
 * @deprecated Use hashPassword instead
 */
export function encryptPassword(plain: string): string {
  return crypto.createHash('sha1').update(plain).digest('hex')
}

/**
 * Check if a hash is SHA1 format (40 hex characters)
 * @param hash - Hash to check
 * @returns True if SHA1 format
 */
export function isSHA1Hash(hash: string): boolean {
  return /^[a-f0-9]{40}$/i.test(hash)
}

/**
 * Encrypt sensitive data using AES-256
 * @param text - Text to encrypt
 * @param key - Encryption key (32 bytes)
 * @returns Encrypted text with IV prepended
 */
export function encryptData(text: string, key: string): string {
  const algorithm = 'aes-256-cbc'
  const keyBuffer = crypto.scryptSync(key, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt data encrypted with encryptData
 * @param encryptedText - Encrypted text with IV prepended
 * @param key - Decryption key (32 bytes)
 * @returns Decrypted text
 */
export function decryptData(encryptedText: string, key: string): string {
  const algorithm = 'aes-256-cbc'
  const keyBuffer = crypto.scryptSync(key, 'salt', 32)
  
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
