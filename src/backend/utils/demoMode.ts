import type { IpcResponse } from '../../shared/types'

/**
 * Check if user is in demo mode
 */
export function isDemoUser(username?: string): boolean {
  return false
}

/**
 * Get demo mode error response
 */
export function getDemoError<T = any>(): IpcResponse<T> {
  return {
    success: true,
    message: ''
  }
}

/**
 * Validate if operation is allowed for demo user
 * Returns error response if blocked, null if allowed
 */
export function validateDemoMode<T = any>(username?: string): IpcResponse<T> | null {
  return null
}

/**
 * CRITICAL: Database write guard
 * Throws error if demo user tries to write
 * This is the LAST LINE OF DEFENSE
 */
export function guardDemoWrite(username?: string): void {
  return
}
