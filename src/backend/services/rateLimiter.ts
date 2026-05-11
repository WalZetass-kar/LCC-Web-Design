/**
 * Rate Limiter Service
 * Prevents brute force attacks and API abuse
 */

interface LoginAttempt {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

interface ApiRequest {
  count: number
  firstRequest: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  // Login rate limiter
  private loginAttempts: Map<string, LoginAttempt> = new Map()
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOGIN_LOCK_DURATION = 15 * 60 * 1000 // 15 minutes
  private readonly LOGIN_ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 minutes

  // API rate limiter (per IP)
  private apiRequests: Map<string, ApiRequest> = new Map()
  private readonly MAX_API_REQUESTS = 100 // per minute default
  private readonly API_WINDOW_MS = 60 * 1000 // 1 minute

  // Configurable limits per endpoint type
  private endpointLimits: Map<string, RateLimitConfig> = new Map([
    ['default', { maxRequests: 100, windowMs: 60000 }],
    ['read', { maxRequests: 200, windowMs: 60000 }],
    ['write', { maxRequests: 50, windowMs: 60000 }],
    ['sensitive', { maxRequests: 10, windowMs: 60000 }],
  ])

  /**
   * Check if a username is currently locked
   */
  isLocked(username: string): { locked: boolean; remainingTime?: number } {
    const attempt = this.loginAttempts.get(username)
    
    if (!attempt || !attempt.lockedUntil) {
      return { locked: false }
    }

    const now = Date.now()
    
    if (now < attempt.lockedUntil) {
      const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000)
      return { locked: true, remainingTime }
    }

    this.loginAttempts.delete(username)
    return { locked: false }
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(username: string): {
    locked: boolean
    remainingAttempts: number
    lockedUntil?: number
  } {
    const now = Date.now()
    const attempt = this.loginAttempts.get(username)

    if (!attempt) {
      this.loginAttempts.set(username, { count: 1, firstAttempt: now })
      return { locked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS - 1 }
    }

    if (now - attempt.firstAttempt > this.LOGIN_ATTEMPT_WINDOW) {
      this.loginAttempts.set(username, { count: 1, firstAttempt: now })
      return { locked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS - 1 }
    }

    attempt.count++

    if (attempt.count >= this.MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = now + this.LOGIN_LOCK_DURATION
      this.loginAttempts.set(username, attempt)
      return { locked: true, remainingAttempts: 0, lockedUntil: attempt.lockedUntil }
    }

    this.loginAttempts.set(username, attempt)
    return { locked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS - attempt.count }
  }

  /**
   * Reset attempts for a username (on successful login)
   */
  resetAttempts(username: string): void {
    this.loginAttempts.delete(username)
  }

  /**
   * Check API rate limit for an IP
   * @param ip - Client IP address
   * @param endpointType - Type of endpoint (default, read, write, sensitive)
   */
  checkApiRateLimit(ip: string, endpointType: string = 'default'): { allowed: boolean; remaining: number; resetIn?: number } {
    const now = Date.now()
    const limit = this.endpointLimits.get(endpointType) || this.endpointLimits.get('default')!
    const request = this.apiRequests.get(ip)

    if (!request || now - request.firstRequest > limit.windowMs) {
      this.apiRequests.set(ip, { count: 1, firstRequest: now })
      return { allowed: true, remaining: limit.maxRequests - 1 }
    }

    request.count++

    if (request.count > limit.maxRequests) {
      const resetIn = Math.ceil((request.firstRequest + limit.windowMs - now) / 1000)
      return { allowed: false, remaining: 0, resetIn }
    }

    this.apiRequests.set(ip, request)
    return { allowed: true, remaining: limit.maxRequests - request.count }
  }

  /**
   * Get current attempt count for a username
   */
  getAttemptCount(username: string): number {
    return this.loginAttempts.get(username)?.count || 0
  }

  /**
   * Clean up old attempts (run periodically)
   */
  cleanup(): void {
    const now = Date.now()
    
    // Clean login attempts
    for (const [username, attempt] of this.loginAttempts.entries()) {
      if (
        (attempt.lockedUntil && now > attempt.lockedUntil) ||
        (!attempt.lockedUntil && now - attempt.firstAttempt > this.LOGIN_ATTEMPT_WINDOW)
      ) {
        this.loginAttempts.delete(username)
      }
    }

    // Clean API requests
    for (const [ip, request] of this.apiRequests.entries()) {
      if (now - request.firstRequest > this.API_WINDOW_MS) {
        this.apiRequests.delete(ip)
      }
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats() {
    return {
      activeLoginAttempts: this.loginAttempts.size,
      activeApiRequests: this.apiRequests.size,
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Cleanup every 5 minutes
setInterval(() => {
  rateLimiter.cleanup()
}, 5 * 60 * 1000)

// For backwards compatibility
export const loginRateLimiter = rateLimiter
