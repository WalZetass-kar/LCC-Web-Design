import { sqlite } from '../../database/connection.js'

export class InventoryController {
  // --- WAREHOUSES ---
  static getWarehouses() {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_warehouses WHERE is_active = 1').all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static createWarehouse(data: any) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare('INSERT INTO mediasoft_warehouses (name, location, created_at) VALUES (?, ?, ?)')
        .run(data.name, data.location, now)
      return { success: true, message: 'Gudang berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // --- BATCHES ---
  static getBatches(kd_barang: string) {
    try {
      const data = sqlite.prepare(`
        SELECT b.*, w.name as warehouse_name 
        FROM mediasoft_barang_batches b
        LEFT JOIN mediasoft_warehouses w ON b.warehouse_id = w.id
        WHERE b.kd_barang = ?
      `).all(kd_barang)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static addBatch(data: any) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare(`
        INSERT INTO mediasoft_barang_batches (kd_barang, batch_no, stok, expired_date, warehouse_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.kd_barang, data.batch_no, data.stok, data.expired_date, data.warehouse_id, now)
      
      // Update global stock
      sqlite.prepare('UPDATE mediasoft_barang SET stok = stok + ? WHERE kd_barang = ?')
        .run(data.stok, data.kd_barang)

      return { success: true, message: 'Batch berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // --- SERIAL NUMBERS ---
  static getSerials(kd_barang: string) {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_barang_serials WHERE kd_barang = ?').all(kd_barang)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static addSerial(data: any) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare(`
        INSERT INTO mediasoft_barang_serials (kd_barang, serial_no, warehouse_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(data.kd_barang, data.serial_no, data.warehouse_id, now)
      
      // Update global stock
      sqlite.prepare('UPDATE mediasoft_barang SET stok = stok + 1 WHERE kd_barang = ?')
        .run(data.kd_barang)

      return { success: true, message: 'Serial number berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // --- TRANSFERS ---
  static transfer(data: any) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare(`
        INSERT INTO mediasoft_stock_transfers (kd_barang, from_warehouse_id, to_warehouse_id, qty, username, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.kd_barang, data.from_warehouse_id, data.to_warehouse_id, data.qty, data.username, now)
      
      // Logic for updating batch/warehouse specific stock would go here
      // For simplicity, we just log the transfer in this POC

      return { success: true, message: 'Transfer stok berhasil dicatat' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
