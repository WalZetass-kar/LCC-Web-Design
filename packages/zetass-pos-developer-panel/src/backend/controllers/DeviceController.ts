/**
 * DeviceController — kelola device tracking per user.
 * Dipanggil dari AuthController saat login, dan dari halaman Users/Security.
 */
import { sqlite } from '../../database/connection.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'

export interface DeviceInfo {
  username: string
  device_id: string
  device_name?: string
  platform?: string
  os_name?: string
  app_version?: string
  ip_address?: string
}

export interface DeviceLoginCheck {
  allowed: boolean
  reason?: 'revoked' | 'device_limit'
  current: number
  max: number
}

/** Deteksi platform & OS dari user_agent string */
export function detectPlatformOS(userAgent: string): { platform: string; os_name: string } {
  const ua = userAgent.toLowerCase()
  let platform = 'web'
  let os_name = 'Unknown'

  if (ua.includes('electron')) platform = 'electron'
  else if (ua.includes('android')) platform = 'android'
  else if (ua.includes('capacitor')) platform = 'android'

  if (ua.includes('windows')) os_name = 'Windows'
  else if (ua.includes('mac os') || ua.includes('macos')) os_name = 'macOS'
  else if (ua.includes('linux') && !ua.includes('android')) os_name = 'Linux'
  else if (ua.includes('android')) os_name = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os_name = 'iOS'

  return { platform, os_name }
}

export class DeviceController {
  /** Upsert device saat login — dipanggil dari AuthController */
  static upsert(info: DeviceInfo) {
    sqlite.prepare(`
      INSERT INTO mediasoft_user_devices
        (username, device_id, device_name, platform, os_name, app_version, ip_address, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(username, device_id) DO UPDATE SET
        device_name  = excluded.device_name,
        platform     = excluded.platform,
        os_name      = excluded.os_name,
        app_version  = excluded.app_version,
        ip_address   = excluded.ip_address,
        last_seen_at = datetime('now'),
        status       = CASE WHEN status = 'revoked' THEN 'revoked' ELSE 'active' END
    `).run(
      info.username, info.device_id, info.device_name ?? null,
      info.platform ?? null, info.os_name ?? null,
      info.app_version ?? null, info.ip_address ?? null,
    )
  }

  /** Cek apakah device diblokir */
  static isRevoked(username: string, device_id: string): boolean {
    const row = sqlite
      .prepare(`SELECT status FROM mediasoft_user_devices WHERE username = ? AND device_id = ?`)
      .get(username, device_id) as { status: string } | undefined
    return row?.status === 'revoked' || row?.status === 'blocked'
  }

  static validateLogin(username: string, device_id: string): DeviceLoginCheck {
    const user = sqlite
      .prepare(`SELECT hak_akses, subscription_plan_id FROM mediasoft_pengguna WHERE nama_pengguna = ?`)
      .get(username) as { hak_akses?: string | null; subscription_plan_id?: number | null } | undefined

    const existing = sqlite
      .prepare(`SELECT status FROM mediasoft_user_devices WHERE username = ? AND device_id = ?`)
      .get(username, device_id) as { status?: string | null } | undefined

    const current = (sqlite
      .prepare(`SELECT COUNT(*) AS c FROM mediasoft_user_devices WHERE username = ? AND status = 'active'`)
      .get(username) as { c: number }).c

    if (existing?.status === 'revoked' || existing?.status === 'blocked') {
      return { allowed: false, reason: 'revoked', current, max: 0 }
    }

    if (user?.hak_akses === 'developer' || user?.hak_akses === 'super_admin') {
      return { allowed: true, current, max: -1 }
    }

    const max = user?.subscription_plan_id
      ? ((sqlite.prepare(`SELECT max_devices FROM mediasoft_subscription_plans WHERE id = ?`).get(user.subscription_plan_id) as any)?.max_devices ?? 1)
      : 1

    if (existing?.status === 'active' || max === -1 || current < max) {
      return { allowed: true, current, max }
    }

    return { allowed: false, reason: 'device_limit', current, max }
  }

  /** Cek limit device berdasarkan paket user */
  static checkDeviceLimit(username: string): { allowed: boolean; current: number; max: number } {
    const user = sqlite
      .prepare(`SELECT hak_akses, subscription_plan_id FROM mediasoft_pengguna WHERE nama_pengguna = ?`)
      .get(username) as { hak_akses?: string | null; subscription_plan_id: number | null } | undefined

    if (user?.hak_akses === 'developer' || user?.hak_akses === 'super_admin') {
      const current = (sqlite
        .prepare(`SELECT COUNT(*) AS c FROM mediasoft_user_devices WHERE username = ? AND status = 'active'`)
        .get(username) as { c: number }).c
      return { allowed: true, current, max: -1 }
    }

    const planId = user?.subscription_plan_id
    const max = planId
      ? ((sqlite.prepare(`SELECT max_devices FROM mediasoft_subscription_plans WHERE id = ?`).get(planId) as any)?.max_devices ?? 1)
      : 1

    const current = (sqlite
      .prepare(`SELECT COUNT(*) AS c FROM mediasoft_user_devices WHERE username = ? AND status = 'active'`)
      .get(username) as { c: number }).c

    return { allowed: max === -1 || current < max, current, max }
  }

  /** List device aktif per user */
  static getByUser(username: string) {
    return sqlite
      .prepare(`SELECT * FROM mediasoft_user_devices WHERE username = ? ORDER BY last_seen_at DESC`)
      .all(username)
  }

  /** List semua device untuk dashboard Pengguna. */
  static getAllDevices() {
    return sqlite.prepare(`
      SELECT
        d.*,
        u.nama_lengkap,
        u.status_user,
        p.name AS plan_name,
        COALESCE(p.max_devices, 1) AS max_devices
      FROM mediasoft_user_devices d
      LEFT JOIN mediasoft_pengguna u ON u.nama_pengguna = d.username
      LEFT JOIN mediasoft_subscription_plans p ON p.id = u.subscription_plan_id
      ORDER BY d.last_seen_at DESC, d.first_seen_at DESC
    `).all()
  }

  /** Revoke device (remote logout) */
  static revoke(id: number, revokedBy: string) {
    const dev = sqlite.prepare(`SELECT username, device_id, device_name FROM mediasoft_user_devices WHERE id = ?`).get(id) as any
    sqlite.prepare(
      `UPDATE mediasoft_user_devices SET status = 'revoked', revoked_at = datetime('now'), revoked_by = ? WHERE id = ?`
    ).run(revokedBy, id)

    // Revoke semua auth_sessions untuk device ini
    if (dev) {
      sqlite.prepare(
        `UPDATE mediasoft_auth_sessions SET revoked_at = datetime('now'), is_revoked = 1 WHERE username = ? AND device_id = ?`
      ).run(dev.username, dev.device_id)
      ActivityLogModel.log(
        revokedBy,
        `Revoke device user: ${dev.username}`,
        'SECURITY',
        `device_id=${dev.device_id}; device_name=${dev.device_name ?? '-'}`
      )
    }
    return { success: true }
  }

  /** Revoke semua device user */
  static revokeAll(username: string, revokedBy: string) {
    sqlite.prepare(
      `UPDATE mediasoft_user_devices SET status = 'revoked', revoked_at = datetime('now'), revoked_by = ? WHERE username = ?`
    ).run(revokedBy, username)
    sqlite.prepare(
      `UPDATE mediasoft_auth_sessions SET revoked_at = datetime('now'), is_revoked = 1 WHERE username = ?`
    ).run(username)
    ActivityLogModel.log(revokedBy, `Revoke semua device user: ${username}`, 'SECURITY')
    return { success: true }
  }

  /** List semua session aktif (untuk halaman Security) */
  static getAllActiveSessions() {
    return sqlite.prepare(`
      SELECT s.*, d.platform, d.os_name, d.app_version
      FROM mediasoft_auth_sessions s
      LEFT JOIN mediasoft_user_devices d ON d.username = s.username AND d.device_id = s.device_id
      WHERE s.revoked_at IS NULL AND COALESCE(s.is_revoked, 0) = 0
        AND datetime(s.expires_at) > datetime('now')
      ORDER BY s.last_seen_at DESC
    `).all()
  }

  /** Revoke session by id */
  static revokeSession(id: number, revokedBy = 'system') {
    const session = sqlite
      .prepare(`SELECT username, device_id, device_name FROM mediasoft_auth_sessions WHERE id = ?`)
      .get(id) as any
    sqlite.prepare(
      `UPDATE mediasoft_auth_sessions SET revoked_at = datetime('now'), is_revoked = 1 WHERE id = ?`
    ).run(id)
    if (session?.username && session.device_id) {
      sqlite.prepare(
        `UPDATE mediasoft_user_devices SET status = 'revoked', revoked_at = datetime('now'), revoked_by = ? WHERE username = ? AND device_id = ?`
      ).run(revokedBy, session.username, session.device_id)
      ActivityLogModel.log(
        revokedBy,
        `Remote logout session user: ${session.username}`,
        'SECURITY',
        `device_id=${session.device_id}; device_name=${session.device_name ?? '-'}`
      )
    }
    return { success: true }
  }
}
