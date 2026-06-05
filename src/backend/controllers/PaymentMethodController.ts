import { sqlite } from '../../database/connection.js'
import { MidtransService } from '../services/midtransService.js'

interface QrisItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface QrisRequest {
  amount: number
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  items: QrisItem[]
}

interface StaticQrisSettings {
  qris_image?: string | null
}

interface GatewaySettings {
  provider?: string
  server_key?: string
  client_key?: string
  is_production?: number
  enabled?: number
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export class PaymentMethodController {
  private static ensureGatewayTable() {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_payment_gateway_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        provider TEXT DEFAULT 'midtrans',
        server_key TEXT DEFAULT '',
        client_key TEXT DEFAULT '',
        is_production INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 0,
        updated_at TEXT
      )
    `)
    sqlite.prepare('INSERT OR IGNORE INTO mediasoft_payment_gateway_settings (id) VALUES (1)').run()
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_payment_qris_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        transaction_status TEXT DEFAULT '',
        qr_image_url TEXT DEFAULT '',
        transaction_id TEXT DEFAULT '',
        paid_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `)
  }

  private static getMidtransConfig() {
    this.ensureGatewayTable()
    const row = sqlite
      .prepare('SELECT server_key, client_key, is_production, enabled FROM mediasoft_payment_gateway_settings WHERE id = 1')
      .get() as GatewaySettings | undefined

    const serverKey = row?.enabled && row.server_key
      ? row.server_key
      : process.env.MIDTRANS_SERVER_KEY
    const clientKey = row?.enabled && row.client_key
      ? row.client_key
      : process.env.MIDTRANS_CLIENT_KEY || ''
    const isProduction = row?.enabled
      ? !!row.is_production
      : normalizeBoolean(process.env.MIDTRANS_IS_PRODUCTION)

    if (!serverKey) {
      return {
        success: false as const,
        message: 'Konfigurasi Midtrans belum tersedia. Isi MIDTRANS_SERVER_KEY di .env atau aktifkan payment gateway di database.',
      }
    }

    return {
      success: true as const,
      data: { serverKey, clientKey, isProduction },
    }
  }

  private static initMidtrans() {
    const config = this.getMidtransConfig()
    if (!config.success) return config

    MidtransService.init(config.data.serverKey, config.data.clientKey, config.data.isProduction)
    return { success: true as const }
  }

  private static getUploadedQrisImage() {
    const row = sqlite
      .prepare('SELECT qris_image FROM mediasoft_struk_settings WHERE id = 1')
      .get() as StaticQrisSettings | undefined

    return row?.qris_image?.trim() || null
  }

  private static saveQrisSession(data: {
    orderId: string
    provider: string
    amount: number
    status?: string
    transactionStatus?: string
    qrImageUrl?: string
    transactionId?: string
    paidAt?: string | null
  }) {
    this.ensureGatewayTable()
    const now = new Date().toISOString()
    sqlite.prepare(`
      INSERT INTO mediasoft_payment_qris_sessions
        (order_id, provider, amount, status, transaction_status, qr_image_url, transaction_id, paid_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        status = excluded.status,
        transaction_status = excluded.transaction_status,
        qr_image_url = COALESCE(NULLIF(excluded.qr_image_url, ''), mediasoft_payment_qris_sessions.qr_image_url),
        transaction_id = COALESCE(NULLIF(excluded.transaction_id, ''), mediasoft_payment_qris_sessions.transaction_id),
        paid_at = excluded.paid_at,
        updated_at = excluded.updated_at
    `).run(
      data.orderId,
      data.provider,
      Math.round(data.amount),
      data.status || 'pending',
      data.transactionStatus || '',
      data.qrImageUrl || '',
      data.transactionId || '',
      data.paidAt || null,
      now,
      now
    )
  }

  static getAll() {
    const data = sqlite.prepare('SELECT * FROM mediasoft_payment_methods WHERE is_active = 1 ORDER BY name').all()
    return { success: true, data }
  }

  static getGatewaySettings() {
    try {
      this.ensureGatewayTable()
      const row = sqlite
        .prepare('SELECT provider, server_key, client_key, is_production, enabled, updated_at FROM mediasoft_payment_gateway_settings WHERE id = 1')
        .get() as GatewaySettings & { updated_at?: string } | undefined
      return {
        success: true,
        data: {
          provider: row?.provider || 'midtrans',
          serverKey: '',
          clientKey: '',
          isProduction: !!row?.is_production,
          enabled: !!row?.enabled,
          updatedAt: row?.updated_at || null,
          hasEnvServerKey: !!process.env.MIDTRANS_SERVER_KEY,
          hasStoredServerKey: !!row?.server_key,
          hasStoredClientKey: !!row?.client_key,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static saveGatewaySettings(data: any) {
    try {
      this.ensureGatewayTable()
      const current = sqlite
        .prepare('SELECT server_key, client_key FROM mediasoft_payment_gateway_settings WHERE id = 1')
        .get() as GatewaySettings | undefined
      const nextServerKey = typeof data.serverKey === 'string' && data.serverKey.trim()
        ? data.serverKey.trim()
        : current?.server_key || ''
      const nextClientKey = typeof data.clientKey === 'string' && data.clientKey.trim()
        ? data.clientKey.trim()
        : current?.client_key || ''
      sqlite.prepare(`
        UPDATE mediasoft_payment_gateway_settings
        SET provider = ?, server_key = ?, client_key = ?, is_production = ?, enabled = ?, updated_at = ?
        WHERE id = 1
      `).run(
        data.provider || 'midtrans',
        nextServerKey,
        nextClientKey,
        data.isProduction ? 1 : 0,
        data.enabled ? 1 : 0,
        new Date().toISOString()
      )
      return { success: true, message: 'Gateway pembayaran disimpan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getQrisSessions(limit = 30) {
    try {
      this.ensureGatewayTable()
      const data = sqlite.prepare(`
        SELECT * FROM mediasoft_payment_qris_sessions
        ORDER BY created_at DESC
        LIMIT ?
      `).all(Math.max(1, Math.min(Number(limit) || 30, 100)))
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: any) {
    const result = sqlite.prepare('INSERT INTO mediasoft_payment_methods (name, type, account_number, account_name) VALUES (?, ?, ?, ?)').run(data.name, data.type, data.account_number, data.account_name)
    return { success: true, data: { id: result.lastInsertRowid } }
  }

  static update(id: number, data: any) {
    sqlite.prepare('UPDATE mediasoft_payment_methods SET name = ?, type = ?, account_number = ?, account_name = ? WHERE id = ?').run(data.name, data.type, data.account_number, data.account_name, id)
    return { success: true }
  }

  static delete(id: number) {
    sqlite.prepare('UPDATE mediasoft_payment_methods SET is_active = 0 WHERE id = ?').run(id)
    return { success: true }
  }

  static async createQris(data: QrisRequest) {
    try {
      this.ensureGatewayTable()
      if (!data.amount || data.amount <= 0) {
        return { success: false, message: 'Nominal QRIS tidak valid' }
      }
      if (!data.items?.length) {
        return { success: false, message: 'Item transaksi QRIS kosong' }
      }

      const orderId = `POS-QRIS-${Date.now()}`
      const init = this.initMidtrans()
      if (init.success) {
        const result = await MidtransService.generateQRIS({
          orderId,
          amount: Math.round(data.amount),
          customerName: data.customerName || 'Customer POS',
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          items: data.items,
        })

        if (result.success && result.data) {
          this.saveQrisSession({
            orderId,
            provider: 'midtrans',
            amount: data.amount,
            status: 'pending',
            transactionStatus: result.data.transactionStatus || 'pending',
            qrImageUrl: result.data.qrImageUrl || '',
            transactionId: result.data.transactionId || '',
          })
          return {
            success: true,
            data: {
              provider: 'midtrans',
              orderId,
              qrImageUrl: result.data.qrImageUrl,
              qrString: result.data.qrString,
              transactionId: result.data.transactionId,
              transactionStatus: result.data.transactionStatus,
              amount: Math.round(data.amount),
            },
          }
        }

        const uploadedQris = this.getUploadedQrisImage()
        if (!uploadedQris) {
          return {
            success: false,
            message: `Gateway Midtrans gagal membuat QRIS: ${result.message || 'tidak ada respons'}`,
          }
        }
      }

      const uploadedQris = this.getUploadedQrisImage()
      if (!uploadedQris) {
        return {
          success: false,
          message: init.success
            ? 'Gateway pembayaran gagal dan QRIS statis belum diupload.'
            : 'Konfigurasi Midtrans belum tersedia. Upload QRIS statis atau isi gateway pembayaran otomatis.',
        }
      }

      this.saveQrisSession({
        orderId,
        provider: 'static',
        amount: data.amount,
        status: 'manual_confirmation',
        transactionStatus: 'manual_confirmation',
        qrImageUrl: uploadedQris,
      })
      return {
        success: true,
        data: {
          provider: 'static',
          orderId,
          qrImageUrl: uploadedQris,
          transactionStatus: 'manual_confirmation',
          amount: Math.round(data.amount),
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async checkStatus(orderId: string) {
    try {
      if (!orderId?.trim()) {
        return { success: false, message: 'Order ID tidak valid' }
      }

      const localSession = sqlite.prepare('SELECT * FROM mediasoft_payment_qris_sessions WHERE order_id = ?').get(orderId) as any
      if (localSession?.provider === 'static') {
        const paid = localSession?.status === 'paid'
        return {
          success: true,
          data: {
            orderId,
            paid,
            failed: false,
            pending: !paid,
            transactionStatus: localSession?.transaction_status || localSession?.status || 'manual_confirmation',
          },
        }
      }

      const init = this.initMidtrans()
      if (!init.success) return init

      const result = await MidtransService.checkStatus(orderId)
      if (!result.success) return result

      const transactionStatus = result.data?.transactionStatus
      const fraudStatus = result.data?.fraudStatus
      const paid = transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus !== 'deny')
      const failed = ['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus ?? '')
      this.saveQrisSession({
        orderId,
        provider: 'midtrans',
        amount: Number(result.data?.grossAmount || 0),
        status: paid ? 'paid' : failed ? 'failed' : 'pending',
        transactionStatus: transactionStatus || '',
        paidAt: paid ? new Date().toISOString() : null,
      })

      return {
        success: true,
        data: {
          ...result.data,
          paid,
          failed,
          pending: !paid && !failed,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async cancelQris(orderId: string) {
    try {
      if (!orderId?.trim()) {
        return { success: false, message: 'Order ID tidak valid' }
      }

      const localSession = sqlite.prepare('SELECT * FROM mediasoft_payment_qris_sessions WHERE order_id = ?').get(orderId) as any
      if (localSession?.provider === 'static') {
        sqlite.prepare(`
          UPDATE mediasoft_payment_qris_sessions
          SET status = 'cancelled', transaction_status = 'cancelled', updated_at = ?
          WHERE order_id = ?
        `).run(new Date().toISOString(), orderId)
        return { success: true, message: 'Pembayaran QRIS dibatalkan' }
      }

      const init = this.initMidtrans()
      if (!init.success) return init

      return await MidtransService.cancelTransaction(orderId)
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static markQrisPaid(orderId: string) {
    try {
      if (!orderId?.trim()) {
        return { success: false, message: 'Order ID tidak valid' }
      }
      this.ensureGatewayTable()
      const result = sqlite.prepare(`
        UPDATE mediasoft_payment_qris_sessions
        SET status = 'paid', transaction_status = 'manual_paid', paid_at = ?, updated_at = ?
        WHERE order_id = ?
      `).run(new Date().toISOString(), new Date().toISOString(), orderId)
      if (result.changes === 0) {
        return { success: false, message: 'Sesi QRIS tidak ditemukan' }
      }
      return { success: true, message: 'QRIS ditandai lunas' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
