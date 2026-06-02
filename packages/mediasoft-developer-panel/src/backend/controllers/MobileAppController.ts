import { sqlite } from '../../database/connection.js'
import { timingSafeEqual } from 'crypto'

function safeTokenCompare(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export class MobileAppController {
  private static isValidToken(token: string) {
    if (!token?.trim()) return false

    try {
      const row = sqlite.prepare('SELECT api_key, enabled FROM mediasoft_ecommerce_api WHERE id = 1').get() as
        | { api_key?: string; enabled?: number }
        | undefined

      return !!row?.enabled && !!row.api_key && safeTokenCompare(row.api_key, token.trim())
    } catch {
      return false
    }
  }

  /**
   * Remote monitoring for owner
   */
  static getRemoteSummary(token: string) {
    if (!this.isValidToken(token)) {
      return { success: false, message: 'Token tidak valid atau API belum aktif' }
    }

    try {
      const now = new Date().toISOString().slice(0, 10)
      const sales = sqlite.prepare('SELECT SUM(sub_total) as total FROM mediasoft_penjualan WHERE tgl_wkt_transaksi LIKE ?')
        .get(`${now}%`) as { total: number }
      
      const stockAlerts = sqlite.prepare('SELECT COUNT(*) as count FROM mediasoft_barang WHERE stok <= stok_minimum').get() as { count: number }

      return {
        success: true,
        data: {
          todaySales: sales.total || 0,
          lowStockCount: stockAlerts.count,
          lastUpdated: new Date().toISOString()
        }
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Scan barcode from mobile (Placeholder)
   */
  static async processMobileScan(barcode: string, username: string) {
    // Logic for handling remote scan from mobile app
    return { success: true, message: `Barcode ${barcode} received from mobile` }
  }
}
