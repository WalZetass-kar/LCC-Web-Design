import { sqlite } from '../../database/connection.js'
import { demoSession } from '../services/demoSessionManager.js'

const HPP_DEMO_LIMIT = 10

interface HppRow {
  id: number
  user_id: string
  nama_produk: string
  modal: number
  biaya_lain: number
  total_hpp: number
  created_at: string
}

export class HppController {
  /**
   * Get hpp_usage_count for a user by counting rows in hpp_calculations.
   */
  static getUsageCount(username: string) {
    try {
      const row = sqlite
        .prepare('SELECT COUNT(*) as cnt FROM mediasoft_hpp_calculations WHERE user_id = ?')
        .get(username) as { cnt: number }
      const count = row?.cnt ?? 0
      const isDemo = demoSession.isDemoMode()
      return {
        success: true,
        data: {
          count,
          limit: isDemo ? HPP_DEMO_LIMIT : null,
          remaining: isDemo ? Math.max(0, HPP_DEMO_LIMIT - count) : null,
          is_demo: isDemo,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Calculate HPP. Enforces max 10 uses for demo users.
   */
  static calculate(data: {
    username: string
    nama_produk: string
    modal: number
    biaya_lain: number
  }) {
    try {
      // Validate inputs
      const modal = Number(data.modal) || 0
      const biayaLain = Number(data.biaya_lain) || 0
      
      if (modal < 0 || biayaLain < 0) {
        return { success: false, message: 'Modal dan biaya lain tidak boleh negatif' }
      }
      
      if (modal === 0 && biayaLain === 0) {
        return { success: false, message: 'Modal atau biaya lain harus diisi' }
      }

      const isDemo = demoSession.isDemoMode()

      // Demo limit check
      if (isDemo) {
        const row = sqlite
          .prepare('SELECT COUNT(*) as cnt FROM mediasoft_hpp_calculations WHERE user_id = ?')
          .get(data.username) as { cnt: number }
        const count = row?.cnt ?? 0
        if (count >= HPP_DEMO_LIMIT) {
          return {
            success: false,
            hpp_limit_reached: true,
            message: `Batas kalkulasi HPP demo tercapai (${HPP_DEMO_LIMIT}x). Upgrade untuk akses tidak terbatas!`,
            data: { count, limit: HPP_DEMO_LIMIT, remaining: 0 },
          }
        }
      }

      const total_hpp = modal + biayaLain
      const now = new Date().toISOString()

      const result = sqlite
        .prepare(`
          INSERT INTO mediasoft_hpp_calculations (user_id, nama_produk, modal, biaya_lain, total_hpp, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(data.username, data.nama_produk, modal, biayaLain, total_hpp, now)

      // Get updated count
      const countRow = sqlite
        .prepare('SELECT COUNT(*) as cnt FROM mediasoft_hpp_calculations WHERE user_id = ?')
        .get(data.username) as { cnt: number }
      const newCount = countRow?.cnt ?? 0

      return {
        success: true,
        message: 'HPP berhasil dihitung',
        data: {
          id: Number(result.lastInsertRowid),
          user_id: data.username,
          nama_produk: data.nama_produk,
          modal: data.modal,
          biaya_lain: data.biaya_lain,
          total_hpp,
          created_at: now,
          count: newCount,
          limit: isDemo ? HPP_DEMO_LIMIT : null,
          remaining: isDemo ? Math.max(0, HPP_DEMO_LIMIT - newCount) : null,
          is_demo: isDemo,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Get calculation history for a user (latest first).
   */
  static getHistory(username: string) {
    try {
      const rows = sqlite
        .prepare(`
          SELECT * FROM mediasoft_hpp_calculations
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 50
        `)
        .all(username) as HppRow[]
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Delete a specific HPP calculation (owner only).
   */
  static delete(id: number, username: string) {
    try {
      const row = sqlite
        .prepare('SELECT id, user_id FROM mediasoft_hpp_calculations WHERE id = ?')
        .get(id) as { id: number; user_id: string } | undefined
      if (!row) return { success: false, message: 'Data tidak ditemukan' }
      if (row.user_id !== username) return { success: false, message: 'Tidak memiliki akses' }
      sqlite.prepare('DELETE FROM mediasoft_hpp_calculations WHERE id = ?').run(id)
      return { success: true, message: 'Riwayat HPP dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
