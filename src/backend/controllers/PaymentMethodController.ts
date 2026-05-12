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
  }

  private static getMidtransConfig() {
    this.ensureGatewayTable()
    const row = sqlite
      .prepare('SELECT server_key, client_key, is_production, enabled FROM mediasoft_payment_gateway_settings WHERE id = 1')
      .get() as { server_key?: string; client_key?: string; is_production?: number; enabled?: number } | undefined

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

  static getAll() {
    const data = sqlite.prepare('SELECT * FROM mediasoft_payment_methods WHERE is_active = 1 ORDER BY name').all()
    return { success: true, data }
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
      if (!data.amount || data.amount <= 0) {
        return { success: false, message: 'Nominal QRIS tidak valid' }
      }
      if (!data.items?.length) {
        return { success: false, message: 'Item transaksi QRIS kosong' }
      }

      const uploadedQris = this.getUploadedQrisImage()
      if (!uploadedQris) {
        return {
          success: false,
          message: 'QRIS belum diupload. Buka Pengaturan Struk lalu upload gambar QRIS terlebih dahulu.',
        }
      }

      const orderId = `POS-QRIS-${Date.now()}`
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

      if (orderId.startsWith('POS-QRIS-')) {
        return {
          success: true,
          data: {
            orderId,
            paid: false,
            failed: false,
            pending: true,
            transactionStatus: 'manual_confirmation',
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

      if (orderId.startsWith('POS-QRIS-')) {
        return { success: true, message: 'Pembayaran QRIS dibatalkan' }
      }

      const init = this.initMidtrans()
      if (!init.success) return init

      return await MidtransService.cancelTransaction(orderId)
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
