import { sqlite } from '../../database/connection.js'

const TABLE = 'mediasoft_ecommerce_api'

function initTable() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY DEFAULT 1,
        api_key TEXT DEFAULT '',
        api_secret TEXT DEFAULT '',
        webhook_url TEXT DEFAULT '',
        enabled INTEGER DEFAULT 0,
        updated_at TEXT
      )
    `)
    sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
  } catch (e) {
    console.error('EcommerceApi table init failed:', e)
  }
}
initTable()

export class EcommerceApiController {
  static get() {
    try {
      const row = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as any
      return {
        success: true,
        data: {
          apiKey: row?.api_key ?? '',
          apiSecret: row?.api_secret ?? '',
          webhookUrl: row?.webhook_url ?? '',
          enabled: !!row?.enabled,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static save(data: any) {
    try {
      sqlite.prepare(`
        UPDATE ${TABLE} SET api_key = ?, api_secret = ?, webhook_url = ?, enabled = ?, updated_at = ?
        WHERE id = 1
      `).run(
        data.apiKey ?? '',
        data.apiSecret ?? '',
        data.webhookUrl ?? '',
        data.enabled ? 1 : 0,
        new Date().toISOString()
      )
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
