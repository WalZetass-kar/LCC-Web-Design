import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import type { UserSession } from '../../shared/types'
import { api } from '../utils/api'
import { secureStorage } from '../utils/secureStorage'
import { collectAuthDeviceInfo } from '../utils/authDevice'

/** Session TTL: 8 hours in milliseconds */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
/** Check session expiry every 60 seconds */
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000

interface StoredSession extends UserSession {
  loginAt: number
  expiresAt: number
  sessionToken: string
  sessionExpiresAt: string
  deviceId: string | null
}

interface AuthContextValue {
  user: UserSession | null
  /** Whether the current user is in demo mode (UX helper) */
  isDemo: boolean
  login: (user: UserSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Restore encrypted session with expiry validation */
function toPublicSession(session: StoredSession): UserSession {
  return {
    nama_pengguna: session.nama_pengguna,
    nama_lengkap: session.nama_lengkap,
    hak_akses: session.hak_akses,
    access_expires_at: session.access_expires_at ?? null,
    access_days_remaining: session.access_days_remaining ?? null,
    must_change_password: session.must_change_password ?? false,
  }
}

function restoreSession(): StoredSession | null {
  try {
    const saved = secureStorage.getItem('pos_session')
    if (!saved) return null
    const parsed: StoredSession = JSON.parse(saved)
    // Check session expiry
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      secureStorage.removeItem('pos_session')
      return null
    }
    if (parsed.must_change_password) {
      secureStorage.removeItem('pos_session')
      return null
    }
    const sessionExpiry = new Date(parsed.sessionExpiresAt).getTime()
    if (!parsed.sessionToken || !parsed.sessionExpiresAt || !Number.isFinite(sessionExpiry) || Date.now() > sessionExpiry) {
      secureStorage.removeItem('pos_session')
      return null
    }
    return parsed
  } catch {
    secureStorage.removeItem('pos_session')
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    const restored = restoreSession()
    return restored ? toPublicSession(restored) : null
  })

  const isDemo = useMemo(() => user?.hak_akses === 'demo', [user])

  const logout = useCallback(() => {
    const stored = restoreSession()
    // Notify main process to clear server-side session
    try {
      api('auth:logout', {
        username: user?.nama_pengguna ?? stored?.nama_pengguna ?? 'unknown',
        sessionToken: stored?.sessionToken,
        deviceInfo: collectAuthDeviceInfo(),
      })
    } catch {
      // Ignore errors during logout
    }
    setUser(null)
    secureStorage.removeItem('pos_session')
  }, [user?.nama_pengguna])

  const login = useCallback((u: UserSession) => {
    const sessionToken = u.session_token
    const sessionExpiresAt = u.session_expires_at
    if (!sessionToken || !sessionExpiresAt) {
      throw new Error('Session token tidak diterima dari backend')
    }

    const backendExpiry = new Date(sessionExpiresAt).getTime()
    const localExpiry = Number.isFinite(backendExpiry)
      ? Math.min(backendExpiry, Date.now() + SESSION_TTL_MS)
      : Date.now() + SESSION_TTL_MS

    const stored: StoredSession = {
      ...u,
      session_token: undefined,
      session_expires_at: undefined,
      sessionToken,
      sessionExpiresAt,
      deviceId: u.device_id ?? null,
      loginAt: Date.now(),
      expiresAt: localExpiry,
    }
    setUser(toPublicSession(stored))
    secureStorage.setJSON('pos_session', stored)
  }, [])

  useEffect(() => {
    let cancelled = false
    secureStorage.ready(['pos_session', 'rememberMe', 'auth_device_id']).then(() => {
      if (cancelled || user) return
      const restored = restoreSession()
      if (restored) setUser(toPublicSession(restored))
    })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!user?.nama_pengguna) return
    const stored = restoreSession()
    if (!stored?.sessionToken) {
      logout()
      return
    }

    let cancelled = false
    api<UserSession>('auth:restoreSession', {
      username: user.nama_pengguna,
      sessionToken: stored.sessionToken,
      deviceInfo: collectAuthDeviceInfo(),
    })
      .then(result => {
        if (cancelled) return
        if (!result?.success || !result.data) {
          logout()
          return
        }

        const restored = result.data as UserSession
        const nextStored: StoredSession = {
          ...restored,
          sessionToken: stored.sessionToken,
          sessionExpiresAt: stored.sessionExpiresAt,
          deviceId: stored.deviceId,
          loginAt: stored.loginAt,
          expiresAt: Math.min(stored.expiresAt, new Date(stored.sessionExpiresAt).getTime()),
        }
        setUser(toPublicSession(nextStored))
        secureStorage.setJSON('pos_session', {
          ...nextStored,
          loginAt: Date.now(),
        })
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
