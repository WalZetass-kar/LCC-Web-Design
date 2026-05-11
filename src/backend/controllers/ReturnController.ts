import { sqlite } from '../../database/connection.js'

export class ReturnController {
  static create(data: any) {
    const returnNumber = `RET${Date.now()}`
    const result = sqlite.prepare('INSERT INTO mediasoft_returns (return_number, penjualan_id, customer_id, total_amount, refund_method, reason, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(returnNumber, data.penjualan_id, data.customer_id, data.total_amount, data.refund_method, data.reason, data.created_by)
    
    const returnId = result.lastInsertRowid
    for (const item of data.items) {
      sqlite.prepare('INSERT INTO mediasoft_return_details (return_id, barang_id, quantity, price, subtotal, reason) VALUES (?, ?, ?, ?, ?, ?)').run(returnId, item.kd_barang ?? item.barang_id, item.quantity, item.price, item.subtotal, item.reason)
      // Update stok menggunakan kd_barang
      const kd = item.kd_barang ?? item.barang_id
      sqlite.prepare('UPDATE mediasoft_barang SET stok = stok + ? WHERE kd_barang = ?').run(item.quantity, kd)
    }
    
    return { success: true, data: { id: returnId, return_number: returnNumber } }
  }

  static getAll() {
    const data = sqlite.prepare('SELECT r.*, p.kd_tansaksi_jual as nomor_transaksi, c.nama_customer as customer_name FROM mediasoft_returns r LEFT JOIN mediasoft_penjualan p ON r.penjualan_id = p.kd_tansaksi_jual LEFT JOIN mediasoft_customer c ON r.customer_id = c.kd_customer ORDER BY r.created_at DESC').all()
    return { success: true, data }
  }

  static approve(id: number, userId: number) {
    sqlite.prepare('UPDATE mediasoft_returns SET status = ?, approved_by = ? WHERE id = ?').run('APPROVED', userId, id)
    return { success: true }
  }
  
  static reject(id: number, userId: number) {
    sqlite.prepare('UPDATE mediasoft_returns SET status = ?, approved_by = ? WHERE id = ?').run('REJECTED', userId, id)
    return { success: true }
  }
  
  static delete(id: number) {
    sqlite.prepare('DELETE FROM mediasoft_return_details WHERE return_id = ?').run(id)
    sqlite.prepare('DELETE FROM mediasoft_returns WHERE id = ?').run(id)
    return { success: true }
  }
}
