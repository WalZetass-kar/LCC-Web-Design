import { sqlite } from '../../database/connection.js'

export class ShiftController {
  static open(data: any) {
    const shiftNumber = `SHIFT${Date.now()}`
    const result = sqlite.prepare('INSERT INTO mediasoft_shifts (shift_number, user_id, start_time, opening_balance) VALUES (?, ?, CURRENT_TIMESTAMP, ?)').run(shiftNumber, data.user_id, data.opening_balance)
    return { success: true, data: { id: result.lastInsertRowid, shift_number: shiftNumber } }
  }

  static close(id: number, data: any) {
    const sales = sqlite.prepare('SELECT COUNT(*) as count, COALESCE(SUM(yang_dibayar), 0) as total FROM mediasoft_penjualan WHERE shift_id = ?').get(id) as any
    const expected = data.opening_balance + sales.total
    const difference = data.closing_balance - expected
    
    sqlite.prepare('UPDATE mediasoft_shifts SET end_time = CURRENT_TIMESTAMP, closing_balance = ?, expected_balance = ?, difference = ?, total_sales = ?, total_transactions = ?, notes = ?, status = ? WHERE id = ?').run(data.closing_balance, expected, difference, sales.total, sales.count, data.notes, 'CLOSED', id)
    return { success: true, data: { difference } }
  }

  static getCurrent(userId: number) {
    const data = sqlite.prepare('SELECT * FROM mediasoft_shifts WHERE user_id = ? AND status = ? ORDER BY start_time DESC LIMIT 1').get(userId, 'OPEN')
    return { success: true, data }
  }

  static getAll() {
    const data = sqlite.prepare('SELECT s.*, u.nama_lengkap FROM mediasoft_shifts s LEFT JOIN mediasoft_pengguna u ON s.user_id = u.nama_pengguna ORDER BY s.start_time DESC').all()
    return { success: true, data }
  }
  
  static delete(id: number) {
    const shift = sqlite.prepare('SELECT status FROM mediasoft_shifts WHERE id = ?').get(id) as any
    if (!shift) {
      return { success: false, error: 'Shift tidak ditemukan' }
    }
    if (shift.status === 'OPEN') {
      return { success: false, error: 'Tidak dapat menghapus shift yang masih terbuka' }
    }
    
    sqlite.prepare('DELETE FROM mediasoft_shifts WHERE id = ?').run(id)
    return { success: true }
  }
}
