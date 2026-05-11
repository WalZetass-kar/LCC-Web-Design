import { sqlite } from '../../database/connection.js'

export class AuditController {
  static async log(data: {
    username: string
    action: string
    table_name?: string
    record_id?: string
    old_values?: any
    new_values?: any
    ip_address?: string
  }) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare(`
        INSERT INTO mediasoft_audit_trail (username, action, table_name, record_id, old_values, new_values, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.username,
        data.action,
        data.table_name || null,
        data.record_id || null,
        data.old_values ? JSON.stringify(data.old_values) : null,
        data.new_values ? JSON.stringify(data.new_values) : null,
        data.ip_address || null,
        now
      )
      return { success: true }
    } catch (error) {
      console.error('Audit Log Error:', error)
      return { success: false, message: String(error) }
    }
  }

  static getAll() {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_audit_trail ORDER BY created_at DESC LIMIT 1000').all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static clear() {
    try {
      sqlite.prepare('DELETE FROM mediasoft_audit_trail').run()
      return { success: true, message: 'Audit trail berhasil dikosongkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
