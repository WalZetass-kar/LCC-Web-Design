import type { IpcResponse } from '../../shared/types'

/**
 * Check if user is in demo mode
 */
export function isDemoUser(username?: string): boolean {
  return username === 'demo'
}

/**
 * Get demo mode error response
 */
export function getDemoError<T = any>(): IpcResponse<T> {
  return {
    success: false,
    message: '🔒 Mode Demo: Anda tidak dapat melakukan perubahan data. Silakan login dengan akun biasa untuk menggunakan fitur ini.'
  }
}

/**
 * Validate if operation is allowed for demo user
 * Returns error response if blocked, null if allowed
 */
export function validateDemoMode<T = any>(username?: string): IpcResponse<T> | null {
  if (isDemoUser(username)) {
    return getDemoError<T>()
  }
  return null
}

/**
 * CRITICAL: Database write guard
 * Throws error if demo user tries to write
 * This is the LAST LINE OF DEFENSE
 */
export function guardDemoWrite(username?: string): void {
  if (isDemoUser(username)) {
    throw new Error('DEMO_MODE_BLOCKED: Write operations are not allowed in demo mode')
  }
}
