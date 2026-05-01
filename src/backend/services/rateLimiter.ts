/**
 * Rate Limiter Service
 * Prevents brute force attacks by limiting login attempts
 */

interface LoginAttempt {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

class RateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map()
  private readonly MAX_ATTEMPTS = 5
  private readonly LOCK_DURATION = 15 * 60 * 1000 // 15 minutes
  private readonly ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 minutes

  /**
   * Check if a username is currently locked
   * @param username - Username to check
   * @returns Object with locked status and remaining time
   */
  isLocked(username: string): { locked: boolean; remainingTime?: number } {
    const attempt = this.attempts.get(username)
    
    if (!attempt || !attempt.lockedUntil) {
      return { locked: false }
    }

    const now = Date.now()
    
    if (now < attempt.lockedUntil) {
      const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000)
      return { locked: true, remainingTime }
    }

    // Lock expired, reset
    this.attempts.delete(username)
    return { locked: false }
  }

  /**
   * Record a failed login attempt
   * @param username - Username that failed
   * @returns Object with locked status and remaining attempts
   */
  recordFailedAttempt(username: string): {
    locked: boolean
    remainingAttempts: number
    lockedUntil?: number
  } {
    const now = Date.now()
    const attempt = this.attempts.get(username)

    if (!attempt) {
      // First failed attempt
      this.attempts.set(username, {
        count: 1,
        firstAttempt: now,
      })
      return {
        locked: false,
        remainingAttempts: this.MAX_ATTEMPTS - 1,
      }
    }

    // Check if attempt window has expired
    if (now - attempt.firstAttempt > this.ATTEMPT_WINDOW) {
      // Reset counter
      this.attempts.set(username, {
        count: 1,
        firstAttempt: now,
      })
      return {
        locked: false,
        remainingAttempts: this.MAX_ATTEMPTS - 1,
      }
    }

    // Increment attempt count
    attempt.count++

    if (attempt.count >= this.MAX_ATTEMPTS) {
      // Lock the account
      attempt.lockedUntil = now + this.LOCK_DURATION
      this.attempts.set(username, attempt)
      
      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: attempt.lockedUntil,
      }
    }

    this.attempts.set(username, attempt)
    return {
      locked: false,
      remainingAttempts: this.MAX_ATTEMPTS - attempt.count,
    }
  }

  /**
   * Reset attempts for a username (on successful login)
   * @param username - Username to reset
   */
  resetAttempts(username: string): void {
    this.attempts.delete(username)
  }

  /**
   * Clean up old attempts (run periodically)
   */
  cleanup(): void {
    const now = Date.now()
    
    for (const [username, attempt] of this.attempts.entries()) {
      // Remove if lock expired or attempt window expired
      if (
        (attempt.lockedUntil && now > attempt.lockedUntil) ||
        (!attempt.lockedUntil && now - attempt.firstAttempt > this.ATTEMPT_WINDOW)
      ) {
        this.attempts.delete(username)
      }
    }
  }

  /**
   * Get current attempt count for a username
   * @param username - Username to check
   * @returns Current attempt count
   */
  getAttemptCount(username: string): number {
    return this.attempts.get(username)?.count || 0
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Cleanup every 10 minutes
setInterval(() => {
  rateLimiter.cleanup()
}, 10 * 60 * 1000)
