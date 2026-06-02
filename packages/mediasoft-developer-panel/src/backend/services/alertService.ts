import { sqlite } from '../../database/connection.js'

export interface AlertSettings {
  lowStockThreshold: number
  expiryWarningDays: number
  reorderPoint: number
  reorderQuantity: number
}

export class AlertService {
  /**
   * Check low stock and create alerts
   */
  static checkLowStock(settings: AlertSettings = { lowStockThreshold: 5, expiryWarningDays: 30, reorderPoint: 10, reorderQuantity: 50 }) {
    try {
      const products = sqlite.prepare(`
        SELECT kd_barang, nama_barang, stok, stok_minimum 
        FROM mediasoft_barang 
        WHERE stok <= stok_minimum OR stok <= ?
      `).all(settings.lowStockThreshold) as any[]

      const alerts: any[] = []
      const now = new Date().toISOString()

      for (const product of products) {
        // Check if alert already exists (not read)
        const existing = sqlite.prepare(`
          SELECT id FROM mediasoft_notifikasi 
          WHERE jenis = 'STOK' 
          AND pesan LIKE ? 
          AND dibaca = 0
        `).get(`%${product.nama_barang}%`)

        if (!existing) {
          const needsReorder = product.stok <= settings.reorderPoint
          const message = needsReorder
            ? `Stok ${product.nama_barang} sangat rendah (${product.stok}). Perlu reorder ${settings.reorderQuantity} unit.`
            : `Stok ${product.nama_barang} menipis (${product.stok}/${product.stok_minimum})`

          sqlite.prepare(`
            INSERT INTO mediasoft_notifikasi (judul, pesan, jenis, tgl_dibuat, dibaca, link)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            'Stok Menipis',
            message,
            'STOK',
            now,
            0,
            `/produk?highlight=${product.kd_barang}`
          )

          alerts.push({ product: product.nama_barang, stok: product.stok, needsReorder })
        }
      }

      return { success: true, alerts, count: alerts.length }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Check expiring products
   */
  static checkExpiringProducts(warningDays: number = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() + warningDays)
      const cutoffStr = cutoffDate.toISOString().split('T')[0]

      const products = sqlite.prepare(`
        SELECT kd_barang, nama_barang, expired_date, stok
        FROM mediasoft_barang 
        WHERE expired_date IS NOT NULL 
        AND expired_date != ''
        AND expired_date <= ?
        AND stok > 0
      `).all(cutoffStr) as any[]

      const alerts: any[] = []
      const now = new Date().toISOString()

      for (const product of products) {
        const expDate = new Date(product.expired_date)
        const today = new Date()
        const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Check if alert already exists
        const existing = sqlite.prepare(`
          SELECT id FROM mediasoft_notifikasi 
          WHERE jenis = 'EXPIRED' 
          AND pesan LIKE ? 
          AND dibaca = 0
        `).get(`%${product.nama_barang}%`)

        if (!existing) {
          const severity = daysUntilExpiry <= 0 ? 'KADALUARSA' : daysUntilExpiry <= 7 ? 'URGENT' : 'WARNING'
          const message = daysUntilExpiry <= 0
            ? `${product.nama_barang} sudah KADALUARSA! Stok: ${product.stok}`
            : `${product.nama_barang} akan kadaluarsa dalam ${daysUntilExpiry} hari (${product.expired_date})`

          sqlite.prepare(`
            INSERT INTO mediasoft_notifikasi (judul, pesan, jenis, tgl_dibuat, dibaca, link)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            severity === 'KADALUARSA' ? '⚠️ Produk Kadaluarsa' : 'Produk Akan Kadaluarsa',
            message,
            'EXPIRED',
            now,
            0,
            `/produk?highlight=${product.kd_barang}`
          )

          alerts.push({ product: product.nama_barang, daysUntilExpiry, severity })
        }
      }

      return { success: true, alerts, count: alerts.length }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get reorder suggestions
   */
  static getReorderSuggestions() {
    try {
      const products = sqlite.prepare(`
        SELECT 
          b.kd_barang,
          b.nama_barang,
          b.stok,
          b.stok_minimum,
          h.harga_modal,
          COALESCE(
            (SELECT AVG(qty) FROM mediasoft_penjualan_detail WHERE kd_barang = b.kd_barang),
            0
          ) as avg_sales
        FROM mediasoft_barang b
        LEFT JOIN mediasoft_harga h ON b.kd_barang = h.kd_barang
        WHERE b.stok <= b.stok_minimum * 2
        ORDER BY b.stok ASC
      `).all() as any[]

      const suggestions = products.map(p => ({
        ...p,
        suggested_order: Math.max(p.stok_minimum * 3, Math.ceil(p.avg_sales * 7)), // 1 week supply
        estimated_cost: Math.max(p.stok_minimum * 3, Math.ceil(p.avg_sales * 7)) * (p.harga_modal || 0),
      }))

      return { success: true, data: suggestions }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}
