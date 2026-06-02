export type AppRole = 'demo' | 'kasir' | 'operator' | 'admin' | 'super_admin' | 'developer'

const ROLE_ALIASES: Record<string, AppRole> = {
  superadmin: 'developer',
  owner: 'admin',
  user: 'kasir',
}

const ROLE_LEVEL: Record<AppRole, number> = {
  developer: 50,
  super_admin: 45,
  admin: 40,
  operator: 30,
  kasir: 20,
  demo: 10,
}

export const USER_PANEL_ROLES: AppRole[] = ['developer', 'super_admin', 'admin', 'operator', 'kasir', 'demo']
export const OPERATIONAL_ADMIN_ROLES: AppRole[] = ['developer', 'super_admin', 'admin']
export const DEVELOPER_PANEL_ROLES: AppRole[] = ['developer', 'super_admin']

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null
  const normalized = role.trim().toLowerCase()
  return ROLE_ALIASES[normalized] ?? (ROLE_LEVEL[normalized as AppRole] ? normalized as AppRole : null)
}

export function hasRole(role: string | null | undefined, allowedRoles: readonly AppRole[]): boolean {
  const normalized = normalizeRole(role)
  return !!normalized && allowedRoles.includes(normalized)
}

export function hasMinRole(role: string | null | undefined, minRole: AppRole): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  return ROLE_LEVEL[normalized] >= ROLE_LEVEL[minRole]
}

export function canOpenUserPanel(role: string | null | undefined): boolean {
  return hasRole(role, USER_PANEL_ROLES)
}

export function canManageOperations(role: string | null | undefined): boolean {
  return hasRole(role, OPERATIONAL_ADMIN_ROLES)
}

export function canOpenDeveloperPanel(role: string | null | undefined): boolean {
  return hasRole(role, DEVELOPER_PANEL_ROLES)
}
