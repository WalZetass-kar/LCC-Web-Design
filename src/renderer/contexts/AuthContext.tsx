import { createContext, useContext, useState, type ReactNode } from 'react'
import type { UserSession } from '../../shared/types'

interface AuthContextValue {
  user: UserSession | null
  login: (user: UserSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('pos_session')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const login = (u: UserSession) => {
    setUser(u)
    localStorage.setItem('pos_session', JSON.stringify(u))
  }
  const logout = () => {
    setUser(null)
    localStorage.removeItem('pos_session')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
