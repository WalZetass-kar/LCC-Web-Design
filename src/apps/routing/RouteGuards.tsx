import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../renderer/contexts/AuthContext'
import {
  canManageOperations,
  canOpenDeveloperPanel,
  canOpenUserPanel,
  hasMinRole,
  hasRole,
  type AppRole,
} from '../../shared/config/rbac'

interface GuardProps {
  children: ReactNode
  fallback?: string
}

export function RequireAuth({ children }: GuardProps) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export function RequireUserPanel({ children, fallback = '/login' }: GuardProps) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return canOpenUserPanel(user.hak_akses) ? <>{children}</> : <Navigate to={fallback} replace />
}

export function RequireMinRole({ children, minRole, fallback = '/' }: GuardProps & { minRole: AppRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.hak_akses === 'demo') return <>{children}</>
  return hasMinRole(user.hak_akses, minRole) ? <>{children}</> : <Navigate to={fallback} replace />
}

export function RequireRoles({ children, allowedRoles, fallback = '/' }: GuardProps & { allowedRoles: AppRole[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.hak_akses === 'demo') return <Navigate to={fallback} replace />
  return hasRole(user.hak_akses, allowedRoles) ? <>{children}</> : <Navigate to={fallback} replace />
}

export function RequireOperationalAdmin({ children, fallback = '/' }: GuardProps) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.hak_akses === 'demo') return <Navigate to={fallback} replace />
  return canManageOperations(user.hak_akses) ? <>{children}</> : <Navigate to={fallback} replace />
}

export function RequireDeveloperPanel({ children, fallback = '/' }: GuardProps) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return canOpenDeveloperPanel(user.hak_akses) ? <>{children}</> : <Navigate to={fallback} replace />
}
