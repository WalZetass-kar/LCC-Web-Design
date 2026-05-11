import { sqlite } from '../../database/connection.js'

const TABLE = 'mediasoft_security_settings'

function initTable() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY DEFAULT 1,
        login_attempts INTEGER DEFAULT 5,
        lock_duration INTEGER DEFAULT 15,
        session_timeout INTEGER DEFAULT 30,
        require_strong_password INTEGER DEFAULT 1,
        two_factor_enabled INTEGER DEFAULT 0,
        ip_whitelist TEXT DEFAULT '[]',
        updated_at TEXT
      )
    `)
    sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
  } catch (e) {
    console.error('Security table init failed:', e)
  }
}
initTable()

export class SecurityController {
  static get() {
    try {
      const row = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as any
      if (!row) return { success: false, message: 'Not found' }
      return {
        success: true,
        data: {
          loginAttempts: row.login_attempts,
          lockDuration: row.lock_duration,
          sessionTimeout: row.session_timeout,
          requireStrongPassword: !!row.require_strong_password,
          twoFactorEnabled: !!row.two_factor_enabled,
          ipWhitelist: JSON.parse(row.ip_whitelist || '[]'),
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static save(data: any) {
    try {
      sqlite.prepare(`
        UPDATE ${TABLE} SET
          login_attempts = ?,
          lock_duration = ?,
          session_timeout = ?,
          require_strong_password = ?,
          two_factor_enabled = ?,
          ip_whitelist = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        data.loginAttempts ?? 5,
        data.lockDuration ?? 15,
        data.sessionTimeout ?? 30,
        data.requireStrongPassword ? 1 : 0,
        data.twoFactorEnabled ? 1 : 0,
        JSON.stringify(data.ipWhitelist ?? []),
        new Date().toISOString()
      )
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
