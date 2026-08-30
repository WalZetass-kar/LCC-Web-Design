interface DemoSession {
  username: string
  hakAkses: string
  loginTime: number
  isDemo: boolean
}

class DemoSessionManager {
  private currentSession: DemoSession | null = null
  private demoViolationLog: Array<{
    timestamp: string
    channel: string
    args: string
    blocked: boolean
  }> = []

  /**
   * Set the current session after successful login.
   * ONLY called from AuthController.login() in main process.
   */
  setSession(username: string, hakAkses: string): void {
    this.currentSession = {
      username,
      hakAkses,
      loginTime: Date.now(),
      isDemo: hakAkses === 'demo',
    }
    console.log(` DemoSessionManager: Session set for "${username}" (role: ${hakAkses}, demoMode: ${hakAkses === 'demo' ? 'active' : 'inactive'})`)
  }

  /**
   * Clear the session on logout.
   */
  clearSession(): void {
    if (this.currentSession) {
      console.log(` DemoSessionManager: Session cleared for "${this.currentSession.username}"`)
    }
    this.currentSession = null
  }

  /**
   * Check if the current session is in demo mode.
   * This is the AUTHORITATIVE check — all guards call this.
   */
  isDemoMode(): boolean {
    return this.currentSession?.isDemo === true
  }

  /**
   * Get the current username.
   */
  getUsername(): string | null {
    return this.currentSession?.username ?? null
  }

  /**
   * Get the current role.
   */
  getRole(): string | null {
    return this.currentSession?.hakAkses ?? null
  }

  /**
   * Get the full session (read-only copy).
   */
  getSession(): Readonly<DemoSession> | null {
    return this.currentSession ? { ...this.currentSession } : null
  }

  /**
   * Log a demo mode violation attempt.
   * Called when a blocked operation is attempted.
   */
  logViolation(channel: string, args: unknown[]): void {
    const entry = {
      timestamp: new Date().toISOString(),
      channel,
      args: JSON.stringify(args).substring(0, 200), // Truncate for safety
      blocked: true,
    }
    this.demoViolationLog.push(entry)
    
    // Keep only last 100 violations in memory
    if (this.demoViolationLog.length > 100) {
      this.demoViolationLog = this.demoViolationLog.slice(-100)
    }

    console.warn(` DEMO VIOLATION BLOCKED: channel="${channel}" user="${this.currentSession?.username}" at ${entry.timestamp}`)
  }

  /**
   * Get all violation logs (for admin review).
   */
  getViolationLog(): ReadonlyArray<typeof this.demoViolationLog[number]> {
    return [...this.demoViolationLog]
  }

  /**
   * Get violation count.
   */
  getViolationCount(): number {
    return this.demoViolationLog.length
  }
}

// Singleton — lives in main process memory, unreachable from renderer
export const demoSession = new DemoSessionManager()
