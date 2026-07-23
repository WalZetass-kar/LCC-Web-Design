import { sqlite } from '../../database/connection.js'
import { requireAuth } from '../utils/authGuard.js'
import { BackupController } from './BackupController.js'
import { demoSession } from '../services/demoSessionManager.js'

const ADMIN_ROLES = ['developer', 'super_admin', 'admin']

export class SystemController {
  /**
   * Reset all data (transactions, products, customers, etc.)
   * Keeps users and identitas
   */
  static async resetData(username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    const role = demoSession.getRole()
    if (!role || !ADMIN_ROLES.includes(role)) {
      return { success: false, message: 'Akses ditolak. Hanya admin yang dapat mereset data.' }
    }

    try {
      // Auto backup before reset
      const backupFile = BackupController.autoBackup('reset_data')
      if (!backupFile) {
        return { success: false, message: 'Gagal membuat backup sebelum reset. Operasi dibatalkan untuk keamanan data.' }
      }

      // Start transaction
      sqlite.exec('BEGIN TRANSACTION')

      // Delete all transactional data
      const tables = [
        'mediasoft_penjualan_detail',
        'mediasoft_penjualan',
        'mediasoft_pembelian_detail',
        'mediasoft_pembelian',
        'mediasoft_harga',
        'mediasoft_barang',
        'mediasoft_kategori_barang',
        'mediasoft_satuan',
        'mediasoft_customer',
        'mediasoft_supplier',
        'mediasoft_kas_transaksi',
        'mediasoft_kas_drawer',
        'mediasoft_notifikasi',
        'mediasoft_backup',
        'mediasoft_activity_log',
        'mediasoft_product_images',
        'mediasoft_daily_notes',
        'mediasoft_petty_cash',
        'mediasoft_notification_settings',
        'mediasoft_stock_history',
      ]

      for (const table of tables) {
        sqlite.prepare(`DELETE FROM ${table}`).run()
      }

      // Reset auto-increment counters
      sqlite.prepare('DELETE FROM sqlite_sequence WHERE name LIKE "mediasoft_%"').run()

      // Commit transaction
      sqlite.exec('COMMIT')

      return { success: true, message: 'Semua data berhasil direset' }
    } catch (error) {
      sqlite.exec('ROLLBACK')
      return { success: false, message: String(error) }
    }
  }

  /**
   * Check database connection
   */
  static checkDb() {
    try {
      const result = sqlite.prepare('SELECT 1 as test').get()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
