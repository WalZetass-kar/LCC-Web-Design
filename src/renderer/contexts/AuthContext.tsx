import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import type { UserSession } from '../../shared/types'
import { api } from '../utils/api'

/** Session TTL: 8 hours in milliseconds */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
/** Check session expiry every 60 seconds */
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000

interface StoredSession extends UserSession {
  loginAt: number
  expiresAt: number
}

interface AuthContextValue {
  user: UserSession | null
  /** Whether the current user is in demo mode (UX helper) */
  isDemo: boolean
  login: (user: UserSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Restore session from localStorage with expiry validation */
function restoreSession(): UserSession | null {
  try {
    const saved = localStorage.getItem('pos_session')
    if (!saved) return null
    const parsed: StoredSession = JSON.parse(saved)
    // Check session expiry
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem('pos_session')
      return null
    }
    return {
      nama_pengguna: parsed.nama_pengguna,
      nama_lengkap: parsed.nama_lengkap,
      hak_akses: parsed.hak_akses,
      access_expires_at: parsed.access_expires_at ?? null,
      access_days_remaining: parsed.access_days_remaining ?? null,
    }
  } catch {
    localStorage.removeItem('pos_session')
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(restoreSession)

  const isDemo = useMemo(() => user?.hak_akses === 'demo', [user])

  const logout = useCallback(() => {
    // Notify main process to clear server-side session
    try {
      api('auth:logout', user?.nama_pengguna ?? '')
    } catch {
      // Ignore errors during logout
    }
    setUser(null)
    localStorage.removeItem('pos_session')
  }, [user?.nama_pengguna])

  const login = useCallback((u: UserSession) => {
    const stored: StoredSession = {
      ...u,
      loginAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    }
    setUser(u)
    localStorage.setItem('pos_session', JSON.stringify(stored))
  }, [])

  useEffect(() => {
    if (!user?.nama_pengguna) return

    let cancelled = false
    api<UserSession>('auth:restoreSession', user.nama_pengguna)
      .then(result => {
        if (cancelled) return
        if (!result?.success || !result.data) {
          logout()
          return
        }

        const restored = result.data as UserSession
        setUser(restored)
        localStorage.setItem('pos_session', JSON.stringify({
          ...restored,
          loginAt: Date.now(),
          expiresAt: Date.now() + SESSION_TTL_MS,
        }))
      })
      .catch(() => {
        if (!cancelled) logout()
      })

    return () => { cancelled = true }
  }, [user?.nama_pengguna, logout])

  // Auto-logout when session expires
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      const restored = restoreSession()
      if (!restored) {
        logout()
      }
    }, EXPIRY_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, logout])

  return (
    <AuthContext.Provider value={{ user, isDemo, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
