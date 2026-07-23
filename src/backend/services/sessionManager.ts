/**
 * Session Manager Service
 * Handles user sessions and automatic timeout
 * Reads configuration from SecurityController settings
 */

import { sqlite } from '../../database/connection.js'

interface UserSession {
  username: string
  loginTime: number
  lastActivity: number
  hakAkses: string
}

function getSessionTimeout(): number {
  try {
    const row = sqlite.prepare('SELECT session_timeout FROM mediasoft_security_settings WHERE id = 1').get() as any
    return (row?.session_timeout ?? 30) * 60 * 1000 // convert minutes to ms
  } catch {
    return 30 * 60 * 1000
  }
}

class SessionManager {
  private sessions: Map<string, UserSession> = new Map()

  /**
   * Create a new session for a user
   * @param username - Username
   * @param hakAkses - User access level
   * @returns Session ID
   */
  createSession(username: string, hakAkses: string): string {
    const sessionId = this.generateSessionId()
    const now = Date.now()

    this.sessions.set(sessionId, {
      username,
      loginTime: now,
      lastActivity: now,
      hakAkses,
    })

    return sessionId
  }

  /**
   * Update last activity time for a session
   * @param sessionId - Session ID
   * @returns True if session exists and was updated
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      return false
    }

    session.lastActivity = Date.now()
    this.sessions.set(sessionId, session)
    return true
  }

  /**
   * Check if a session is valid and not expired
   * @param sessionId - Session ID
   * @returns Object with validity status and session data
   */
  validateSession(sessionId: string): {
    valid: boolean
    session?: UserSession
    shouldWarn?: boolean
    remainingTime?: number
  } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { valid: false }
    }

    const now = Date.now()
    const inactiveTime = now - session.lastActivity
    const sessionTimeout = getSessionTimeout()
    const warningThreshold = sessionTimeout - 60 * 1000 // 1 minute before timeout

    // Session expired
    if (inactiveTime > sessionTimeout) {
      this.sessions.delete(sessionId)
      return { valid: false }
    }

    // Session valid but should warn user
    if (inactiveTime > warningThreshold) {
      const remainingTime = Math.ceil((sessionTimeout - inactiveTime) / 1000)
      return {
        valid: true,
        session,
        shouldWarn: true,
        remainingTime,
      }
    }

    return { valid: true, session }
  }

  /**
   * Destroy a session (logout)
   * @param sessionId - Session ID
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /**
   * Get session data
   * @param sessionId - Session ID
   * @returns Session data or undefined
   */
  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  cleanup(): void {
    const now = Date.now()
    const sessionTimeout = getSessionTimeout()

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > sessionTimeout) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * Get all active sessions for a user
   * @param username - Username
   * @returns Array of session IDs
   */
  getUserSessions(username: string): string[] {
    const sessionIds: string[] = []

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.username === username) {
        sessionIds.push(sessionId)
      }
    }

    return sessionIds
  }

  /**
   * Destroy all sessions for a user
   * @param username - Username
   */
  destroyUserSessions(username: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.username === username) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * Generate a unique session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Get total active sessions count
   * @returns Number of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessions.size
  }
}

// Singleton instance
export const sessionManager = new SessionManager()

// Cleanup every 5 minutes
setInterval(() => {
  sessionManager.cleanup()
}, 5 * 60 * 1000)
