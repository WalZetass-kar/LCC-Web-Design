import { sqlite } from '../../database/connection.js'
import { WhatsAppService } from '../services/whatsappService.js'

const TABLE = 'mediasoft_whatsapp_settings'

function initTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY DEFAULT 1,
      api_key TEXT DEFAULT '',
      enabled INTEGER DEFAULT 0,
      notify_on_sale INTEGER DEFAULT 1,
      notify_on_return INTEGER DEFAULT 1,
      notify_on_low_stock INTEGER DEFAULT 0,
      notify_on_payment INTEGER DEFAULT 1,
      message_template TEXT DEFAULT 'Terima kasih {customer}! Pesanan Anda sebesar {total} telah diterima. No. Transaksi: {invoice}',
      updated_at TEXT
    )
  `)
  // Ensure default row exists
  sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
}

try { initTable() } catch (e) { console.error('WhatsApp table init failed:', e) }

export class WhatsAppController {
  static get() {
    try {
      const data = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static save(data: any) {
    try {
      sqlite.prepare(`
        UPDATE ${TABLE} SET
          api_key = ?,
          enabled = ?,
          notify_on_sale = ?,
          notify_on_return = ?,
          notify_on_low_stock = ?,
          notify_on_payment = ?,
          message_template = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        data.apiKey ?? '',
        data.enabled ? 1 : 0,
        data.notifyOnSale ? 1 : 0,
        data.notifyOnReturn ? 1 : 0,
        data.notifyOnLowStock ? 1 : 0,
        data.notifyOnPayment ? 1 : 0,
        data.messageTemplate ?? '',
        new Date().toISOString()
      )
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async test(phone: string) {
    try {
      const row = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as any
      if (!row?.api_key) return { success: false, message: 'API key belum dikonfigurasi' }
      WhatsAppService.init(row.api_key)
      const result = await WhatsAppService.sendMessage({
        to: phone,
        message: '✅ Test notifikasi dari MediaSoft POS berhasil!',
      })
      return result
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /** Get settings row (used internally by other controllers) */
  static getSettings() {
    return sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as any
  }
}
