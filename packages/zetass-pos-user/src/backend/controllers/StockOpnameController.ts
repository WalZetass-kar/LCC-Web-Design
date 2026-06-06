import { sqlite } from '../../database/connection.js'

export class StockOpnameController {
  static create(data: any) {
    const opnameNumber = `OPN${Date.now()}`
    const result = sqlite.prepare('INSERT INTO mediasoft_stock_opname (opname_number, opname_date, notes, created_by) VALUES (?, ?, ?, ?)').run(opnameNumber, data.opname_date, data.notes, data.created_by)
    
    const opnameId = result.lastInsertRowid
    let totalDiff = 0
    
    for (const item of data.items) {
      const diff = item.physical_stock - item.system_stock
      totalDiff += Math.abs(diff)
      sqlite.prepare('INSERT INTO mediasoft_stock_opname_details (opname_id, barang_id, system_stock, physical_stock, difference, notes) VALUES (?, ?, ?, ?, ?, ?)').run(opnameId, item.barang_id, item.system_stock, item.physical_stock, diff, item.notes)
    }
    
    sqlite.prepare('UPDATE mediasoft_stock_opname SET total_items = ?, total_difference = ? WHERE id = ?').run(data.items.length, totalDiff, opnameId)
    
    return { success: true, data: { id: opnameId, opname_number: opnameNumber } }
  }

  static approve(id: number, userId: number) {
    const details = sqlite.prepare('SELECT * FROM mediasoft_stock_opname_details WHERE opname_id = ?').all(id) as any[]
    
    for (const detail of details) {
      sqlite.prepare('UPDATE mediasoft_barang SET stok = ? WHERE kd_barang = ?').run(detail.physical_stock, detail.barang_id)
    }
    
    sqlite.prepare('UPDATE mediasoft_stock_opname SET status = ?, approved_by = ? WHERE id = ?').run('APPROVED', userId, id)
    return { success: true }
  }

  static getAll() {
    const data = sqlite.prepare('SELECT so.*, u.nama_lengkap as created_by_name FROM mediasoft_stock_opname so LEFT JOIN mediasoft_pengguna u ON so.created_by = u.nama_pengguna ORDER BY so.opname_date DESC').all()
    return { success: true, data }
  }

  static getDetails(id: number) {
    return sqlite.prepare('SELECT sod.*, b.nama_barang FROM mediasoft_stock_opname_details sod LEFT JOIN mediasoft_barang b ON sod.barang_id = b.kd_barang WHERE sod.opname_id = ?').all(id)
  }
  
  static delete(id: number) {
    const opname = sqlite.prepare('SELECT status FROM mediasoft_stock_opname WHERE id = ?').get(id) as any
    if (!opname) {
      return { success: false, error: 'Opname tidak ditemukan' }
    }
    if (opname.status === 'APPROVED') {
      return { success: false, error: 'Tidak dapat menghapus opname yang sudah diapprove' }
    }
    
    sqlite.prepare('DELETE FROM mediasoft_stock_opname_details WHERE opname_id = ?').run(id)
    sqlite.prepare('DELETE FROM mediasoft_stock_opname WHERE id = ?').run(id)
    
    return { success: true }
  }
  
  static addItem(data: any) {
    const diff = data.stok_fisik - data.stok_sistem
    sqlite.prepare('INSERT INTO mediasoft_stock_opname_details (opname_id, barang_id, system_stock, physical_stock, difference) VALUES (?, ?, ?, ?, ?)').run(data.opname_id, data.kd_barang, data.stok_sistem, data.stok_fisik, diff)
    
    // Update total items dan total difference
    const totals = sqlite.prepare('SELECT COUNT(*) as total_items, SUM(ABS(difference)) as total_diff FROM mediasoft_stock_opname_details WHERE opname_id = ?').get(data.opname_id) as any
    sqlite.prepare('UPDATE mediasoft_stock_opname SET total_items = ?, total_difference = ? WHERE id = ?').run(totals.total_items, totals.total_diff || 0, data.opname_id)
    
    return { success: true }
  }
  
  static getItems(opnameId: number) {
    const items = sqlite.prepare('SELECT sod.*, b.nama_barang FROM mediasoft_stock_opname_details sod LEFT JOIN mediasoft_barang b ON sod.barang_id = b.kd_barang WHERE sod.opname_id = ?').all(opnameId)
    return { success: true, data: items }
  }
}
