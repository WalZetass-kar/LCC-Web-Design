import { sqlite } from '../../database/connection.js'
import { WhatsAppService, type WhatsAppSendResult } from '../services/whatsappService.js'

const TABLE = 'mediasoft_whatsapp_settings'
const DEFAULT_TEMPLATE = 'Terima kasih {customer}! Pesanan Anda sebesar {total} telah diterima. No. Transaksi: {invoice}'

type WhatsAppSettingsRow = {
  id: number
  api_key: string | null
  enabled: number | null
  notify_on_sale: number | null
  notify_on_return: number | null
  notify_on_low_stock: number | null
  notify_on_payment: number | null
  message_template: string | null
  updated_at: string | null
}

type WhatsAppNotificationResult = WhatsAppSendResult & {
  attempted: boolean
}

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

  ensureColumn('api_key', "TEXT DEFAULT ''")
  ensureColumn('enabled', 'INTEGER DEFAULT 0')
  ensureColumn('notify_on_sale', 'INTEGER DEFAULT 1')
  ensureColumn('notify_on_return', 'INTEGER DEFAULT 1')
  ensureColumn('notify_on_low_stock', 'INTEGER DEFAULT 0')
  ensureColumn('notify_on_payment', 'INTEGER DEFAULT 1')
  ensureColumn('message_template', `TEXT DEFAULT '${DEFAULT_TEMPLATE.replace(/'/g, "''")}'`)
  ensureColumn('updated_at', 'TEXT')

  sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
}

try { initTable() } catch (e) { console.error('WhatsApp table init failed:', e) }

function ensureColumn(name: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${TABLE})`).all() as Array<{ name: string }>
  if (!columns.some(column => column.name === name)) {
    sqlite.exec(`ALTER TABLE ${TABLE} ADD COLUMN ${name} ${definition}`)
  }
}

function ensureRow(): WhatsAppSettingsRow {
  initTable()
  sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
  return sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as WhatsAppSettingsRow
}

function boolToDb(value: unknown, fallback = false): number {
  if (value === undefined || value === null) return fallback ? 1 : 0
  return value ? 1 : 0
}

function normalizeTemplate(template: unknown): string {
  const value = String(template ?? '').trim()
  return value || DEFAULT_TEMPLATE
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.split(`{${key}}`).join(value),
    template
  )
}

export class WhatsAppController {
  static get() {
    try {
      const data = ensureRow()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static save(data: any) {
    try {
      ensureRow()
      const apiKey = String(data.apiKey ?? '').trim()
      if (data.enabled && !apiKey) {
        return { success: false, message: 'API key Fonnte wajib diisi sebelum WhatsApp diaktifkan' }
      }

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
        apiKey,
        boolToDb(data.enabled),
        boolToDb(data.notifyOnSale, true),
        boolToDb(data.notifyOnReturn, true),
        boolToDb(data.notifyOnLowStock),
        boolToDb(data.notifyOnPayment, true),
        normalizeTemplate(data.messageTemplate),
        new Date().toISOString()
      )
      return { success: true, data: ensureRow() }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async test(input: string | { phone?: string; apiKey?: string; message?: string }) {
    try {
      const row = ensureRow()
      const payload = typeof input === 'string' ? { phone: input } : input
      const phone = String(payload?.phone ?? '').trim()
      const apiKey = String(payload?.apiKey ?? row?.api_key ?? '').trim()

      if (!apiKey) return { success: false, message: 'API key Fonnte belum dikonfigurasi' }
      if (!phone) return { success: false, message: 'Nomor HP wajib diisi' }

      WhatsAppService.init(apiKey)
      const result = await WhatsAppService.sendMessage({
        to: phone,
        message: payload?.message || 'Test notifikasi dari MediaSoft POS berhasil.',
        typing: true,
      })
      return result
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /** Get settings row (used internally by other controllers) */
  static getSettings() {
    return ensureRow()
  }

  static async sendSaleNotification(data: {
    phone?: string | null
    customerName?: string | null
    invoice: string
    total: number
  }): Promise<WhatsAppNotificationResult> {
    const row = ensureRow()
    if (!row.enabled || (!row.notify_on_sale && !row.notify_on_payment)) {
      return { attempted: false, success: true, message: 'Notifikasi WhatsApp transaksi nonaktif' }
    }
    if (!row.api_key) return { attempted: false, success: false, message: 'API key Fonnte belum dikonfigurasi' }
    if (!data.phone) return { attempted: false, success: false, message: 'Customer belum memiliki nomor WhatsApp' }

    const message = renderTemplate(normalizeTemplate(row.message_template), {
      customer: data.customerName || 'Customer',
      total: `Rp ${data.total.toLocaleString('id-ID')}`,
      invoice: data.invoice,
    })

    WhatsAppService.init(row.api_key)
    const result = await WhatsAppService.sendMessage({ to: data.phone, message, typing: true })
    return { attempted: true, ...result }
  }

  static async sendReturnNotification(data: {
    phone?: string | null
    customerName?: string | null
    returnNumber: string
    total: number
    refundMethod?: string | null
  }): Promise<WhatsAppNotificationResult> {
    const row = ensureRow()
    if (!row.enabled || !row.notify_on_return) {
      return { attempted: false, success: true, message: 'Notifikasi WhatsApp return nonaktif' }
    }
    if (!row.api_key) return { attempted: false, success: false, message: 'API key Fonnte belum dikonfigurasi' }
    if (!data.phone) return { attempted: false, success: false, message: 'Customer belum memiliki nomor WhatsApp' }

    const message = [
      `Halo ${data.customerName || 'Customer'},`,
      '',
      `Return ${data.returnNumber} sebesar Rp ${data.total.toLocaleString('id-ID')} sudah dicatat.`,
      data.refundMethod ? `Metode refund: ${data.refundMethod}.` : '',
      '',
      'Terima kasih.',
    ].filter(Boolean).join('\n')

    WhatsAppService.init(row.api_key)
    const result = await WhatsAppService.sendMessage({ to: data.phone, message, typing: true })
    return { attempted: true, ...result }
  }

  static async sendLowStockNotification(ownerPhone: string | null | undefined, products: Array<{ name: string; stock: number }>): Promise<WhatsAppNotificationResult> {
    const row = ensureRow()
    if (!row.enabled || !row.notify_on_low_stock) {
      return { attempted: false, success: true, message: 'Notifikasi WhatsApp stok menipis nonaktif' }
    }
    if (!row.api_key) return { attempted: false, success: false, message: 'API key Fonnte belum dikonfigurasi' }
    if (!ownerPhone) return { attempted: false, success: false, message: 'Nomor WhatsApp owner belum diisi' }
    if (!products.length) return { attempted: false, success: true, message: 'Tidak ada stok menipis' }

    WhatsAppService.init(row.api_key)
    const result = await WhatsAppService.sendLowStockAlert(ownerPhone, products)
    return { attempted: true, ...result }
  }
}
