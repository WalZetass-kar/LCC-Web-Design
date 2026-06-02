import { sqlite } from '../../database/connection.js'

function initInventoryTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mediasoft_barang_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL,
      batch_no TEXT NOT NULL,
      stok INTEGER DEFAULT 0,
      expired_date TEXT,
      warehouse_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mediasoft_barang_serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL,
      serial_no TEXT NOT NULL,
      status TEXT DEFAULT 'AVAILABLE',
      warehouse_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mediasoft_warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      kd_barang TEXT NOT NULL,
      qty INTEGER DEFAULT 0,
      updated_at TEXT,
      UNIQUE(warehouse_id, kd_barang)
    )
  `)
}
initInventoryTables()

function n(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function nowIso() {
  return new Date().toISOString()
}

function adjustProductStock(kdBarang: string, delta: number) {
  if (!kdBarang || !delta) return
  sqlite.prepare('UPDATE mediasoft_barang SET stok = MAX(COALESCE(stok, 0) + ?, 0) WHERE kd_barang = ?')
    .run(Math.round(delta), kdBarang)
}

function adjustWarehouseStock(warehouseId: number, kdBarang: string, delta: number, updatedAt = nowIso()) {
  if (!warehouseId || !kdBarang || !delta) return
  const rounded = Math.round(delta)
  const existing = sqlite.prepare('SELECT id FROM mediasoft_warehouse_stock WHERE warehouse_id = ? AND kd_barang = ?')
    .get(warehouseId, kdBarang) as { id?: number } | undefined
  if (existing?.id) {
    sqlite.prepare(`
      UPDATE mediasoft_warehouse_stock
      SET qty = MAX(COALESCE(qty, 0) + ?, 0), updated_at = ?
      WHERE warehouse_id = ? AND kd_barang = ?
    `).run(rounded, updatedAt, warehouseId, kdBarang)
    return
  }
  if (rounded > 0) {
    sqlite.prepare(`
      INSERT INTO mediasoft_warehouse_stock (warehouse_id, kd_barang, qty, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(warehouseId, kdBarang, rounded, updatedAt)
  }
}

export class InventoryController {
  // --- WAREHOUSES ---
  static getWarehouses() {
    try {
      initInventoryTables()
      const data = sqlite.prepare('SELECT * FROM mediasoft_warehouses WHERE COALESCE(is_active, 1) = 1 ORDER BY name ASC').all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static createWarehouse(data: any) {
    try {
      initInventoryTables()
      const name = String(data?.name ?? '').trim()
      if (!name) return { success: false, message: 'Nama gudang wajib diisi' }
      const now = nowIso()
      sqlite.prepare('INSERT INTO mediasoft_warehouses (name, location, is_active, created_at) VALUES (?, ?, 1, ?)')
        .run(name, String(data?.location ?? '').trim(), now)
      return { success: true, message: 'Gudang berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static updateWarehouse(id: number, data: any) {
    try {
      initInventoryTables()
      const name = data?.name === undefined ? undefined : String(data.name ?? '').trim()
      if (name !== undefined && !name) return { success: false, message: 'Nama gudang wajib diisi' }

      const fields: string[] = []
      const values: any[] = []
      if (name !== undefined) { fields.push('name = ?'); values.push(name) }
      if (data?.location !== undefined) { fields.push('location = ?'); values.push(String(data.location ?? '').trim()) }
      if (data?.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0) }
      if (!fields.length) return { success: false, message: 'Tidak ada data gudang yang diubah' }

      values.push(Number(id))
      const result = sqlite.prepare(`UPDATE mediasoft_warehouses SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      if (!result.changes) return { success: false, message: 'Gudang tidak ditemukan' }
      return { success: true, message: 'Gudang berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static deleteWarehouse(id: number) {
    try {
      initInventoryTables()
      const warehouseId = Number(id)
      const used = sqlite.prepare(`
        SELECT
          (SELECT COUNT(*) FROM mediasoft_warehouse_stock WHERE warehouse_id = ? AND COALESCE(qty, 0) > 0) AS stock_count,
          (SELECT COUNT(*) FROM mediasoft_barang_batches WHERE warehouse_id = ? AND COALESCE(stok, 0) > 0) AS batch_count,
          (SELECT COUNT(*) FROM mediasoft_barang_serials WHERE warehouse_id = ? AND COALESCE(status, 'AVAILABLE') != 'SOLD') AS serial_count
      `).get(warehouseId, warehouseId, warehouseId) as { stock_count: number; batch_count: number; serial_count: number }

      if ((used.stock_count ?? 0) + (used.batch_count ?? 0) + (used.serial_count ?? 0) > 0) {
        return { success: false, message: 'Gudang masih memiliki stok, batch, atau serial. Pindahkan/kosongkan dulu sebelum dihapus.' }
      }

      const result = sqlite.prepare('DELETE FROM mediasoft_warehouses WHERE id = ?').run(warehouseId)
      if (!result.changes) return { success: false, message: 'Gudang tidak ditemukan' }
      return { success: true, message: 'Gudang berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // --- BATCHES ---
  static getBatches(kd_barang?: string) {
    try {
      initInventoryTables()
      const where = kd_barang ? 'WHERE b.kd_barang = ?' : ''
      const params = kd_barang ? [kd_barang] : []
      const data = sqlite.prepare(`
        SELECT b.*, w.name as warehouse_name 
        FROM mediasoft_barang_batches b
        LEFT JOIN mediasoft_warehouses w ON b.warehouse_id = w.id
        ${where}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT 200
      `).all(...params)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static addBatch(data: any) {
    try {
      initInventoryTables()
      const now = nowIso()
      const qty = Math.max(0, Math.round(n(data.stok)))
      const warehouseId = Number(data.warehouse_id || 1)
      const insert = sqlite.transaction(() => {
        sqlite.prepare(`
          INSERT INTO mediasoft_barang_batches (kd_barang, batch_no, stok, expired_date, warehouse_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(data.kd_barang, data.batch_no, qty, data.expired_date, warehouseId, now)

        sqlite.prepare('UPDATE mediasoft_barang SET stok = COALESCE(stok, 0) + ? WHERE kd_barang = ?')
          .run(qty, data.kd_barang)

        sqlite.prepare(`
          INSERT INTO mediasoft_warehouse_stock (warehouse_id, kd_barang, qty, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(warehouse_id, kd_barang) DO UPDATE SET
            qty = qty + excluded.qty,
            updated_at = excluded.updated_at
        `).run(warehouseId, data.kd_barang, qty, now)
      })
      insert()

      return { success: true, message: 'Batch berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static updateBatch(id: number, data: any) {
    try {
      initInventoryTables()
      const batchId = Number(id)
      const current = sqlite.prepare('SELECT * FROM mediasoft_barang_batches WHERE id = ?').get(batchId) as any
      if (!current) return { success: false, message: 'Batch tidak ditemukan' }

      const nextKd = String(data?.kd_barang ?? current.kd_barang).trim()
      const nextBatchNo = String(data?.batch_no ?? current.batch_no).trim()
      const nextQty = Math.max(0, Math.round(n(data?.stok ?? current.stok)))
      const nextWarehouseId = Number(data?.warehouse_id ?? current.warehouse_id ?? 1)
      if (!nextKd || !nextBatchNo) return { success: false, message: 'Kode produk dan nomor batch wajib diisi' }

      const update = sqlite.transaction(() => {
        adjustProductStock(current.kd_barang, -n(current.stok))
        adjustWarehouseStock(Number(current.warehouse_id || 1), current.kd_barang, -n(current.stok))
        adjustProductStock(nextKd, nextQty)
        adjustWarehouseStock(nextWarehouseId, nextKd, nextQty)
        sqlite.prepare(`
          UPDATE mediasoft_barang_batches
          SET kd_barang = ?, batch_no = ?, stok = ?, expired_date = ?, warehouse_id = ?
          WHERE id = ?
        `).run(nextKd, nextBatchNo, nextQty, data?.expired_date ?? current.expired_date ?? null, nextWarehouseId, batchId)
      })
      update()
      return { success: true, message: 'Batch berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static deleteBatch(id: number) {
    try {
      initInventoryTables()
      const batch = sqlite.prepare('SELECT * FROM mediasoft_barang_batches WHERE id = ?').get(Number(id)) as any
      if (!batch) return { success: false, message: 'Batch tidak ditemukan' }

      const remove = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM mediasoft_barang_batches WHERE id = ?').run(Number(id))
        adjustProductStock(batch.kd_barang, -n(batch.stok))
        adjustWarehouseStock(Number(batch.warehouse_id || 1), batch.kd_barang, -n(batch.stok))
      })
      remove()
      return { success: true, message: 'Batch berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // --- SERIAL NUMBERS ---
  static getSerials(kd_barang?: string) {
    try {
      initInventoryTables()
      const where = kd_barang ? 'WHERE s.kd_barang = ?' : ''
      const params = kd_barang ? [kd_barang] : []
      const data = sqlite.prepare(`
        SELECT s.*, w.name AS warehouse_name
        FROM mediasoft_barang_serials s
        LEFT JOIN mediasoft_warehouses w ON w.id = s.warehouse_id
        ${where}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT 200
      `).all(...params)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static addSerial(data: any) {
    try {
      initInventoryTables()
      const now = nowIso()
      const warehouseId = Number(data.warehouse_id || 1)
      const insert = sqlite.transaction(() => {
        sqlite.prepare(`
          INSERT INTO mediasoft_barang_serials (kd_barang, serial_no, warehouse_id, created_at)
          VALUES (?, ?, ?, ?)
        `).run(data.kd_barang, data.serial_no, warehouseId, now)

        sqlite.prepare('UPDATE mediasoft_barang SET stok = COALESCE(stok, 0) + 1 WHERE kd_barang = ?')
          .run(data.kd_barang)

        sqlite.prepare(`
          INSERT INTO mediasoft_warehouse_stock (warehouse_id, kd_barang, qty, updated_at)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(warehouse_id, kd_barang) DO UPDATE SET
            qty = qty + 1,
            updated_at = excluded.updated_at
        `).run(warehouseId, data.kd_barang, now)
      })
      insert()

      return { success: true, message: 'Serial number berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static updateSerial(id: number, data: any) {
    try {
      initInventoryTables()
      const serialId = Number(id)
      const current = sqlite.prepare('SELECT * FROM mediasoft_barang_serials WHERE id = ?').get(serialId) as any
      if (!current) return { success: false, message: 'Serial tidak ditemukan' }

      const nextKd = String(data?.kd_barang ?? current.kd_barang).trim()
      const nextSerialNo = String(data?.serial_no ?? current.serial_no).trim()
      const nextStatus = String(data?.status ?? current.status ?? 'AVAILABLE').trim() || 'AVAILABLE'
      const nextWarehouseId = Number(data?.warehouse_id ?? current.warehouse_id ?? 1)
      if (!nextKd || !nextSerialNo) return { success: false, message: 'Kode produk dan nomor serial wajib diisi' }

      const update = sqlite.transaction(() => {
        if (current.status !== 'SOLD') {
          adjustProductStock(current.kd_barang, -1)
          adjustWarehouseStock(Number(current.warehouse_id || 1), current.kd_barang, -1)
        }
        if (nextStatus !== 'SOLD') {
          adjustProductStock(nextKd, 1)
          adjustWarehouseStock(nextWarehouseId, nextKd, 1)
        }
        sqlite.prepare(`
          UPDATE mediasoft_barang_serials
          SET kd_barang = ?, serial_no = ?, status = ?, warehouse_id = ?
          WHERE id = ?
        `).run(nextKd, nextSerialNo, nextStatus, nextWarehouseId, serialId)
      })
      update()
      return { success: true, message: 'Serial berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static deleteSerial(id: number) {
    try {
      initInventoryTables()
      const serial = sqlite.prepare('SELECT * FROM mediasoft_barang_serials WHERE id = ?').get(Number(id)) as any
      if (!serial) return { success: false, message: 'Serial tidak ditemukan' }

      const remove = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM mediasoft_barang_serials WHERE id = ?').run(Number(id))
        if (serial.status !== 'SOLD') {
          adjustProductStock(serial.kd_barang, -1)
          adjustWarehouseStock(Number(serial.warehouse_id || 1), serial.kd_barang, -1)
        }
      })
      remove()
      return { success: true, message: 'Serial berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // --- TRANSFERS ---
  static transfer(data: any) {
    try {
      initInventoryTables()
      const now = nowIso()
      const qty = Math.max(1, Math.round(n(data.qty)))
      const fromId = Number(data.from_warehouse_id)
      const toId = Number(data.to_warehouse_id)
      if (!data.kd_barang || !fromId || !toId) return { success: false, message: 'Data transfer belum lengkap' }
      if (fromId === toId) return { success: false, message: 'Gudang asal dan tujuan tidak boleh sama' }

      const transfer = sqlite.transaction(() => {
        const source = sqlite.prepare(`
          SELECT qty FROM mediasoft_warehouse_stock WHERE warehouse_id = ? AND kd_barang = ?
        `).get(fromId, data.kd_barang) as { qty?: number } | undefined
        if (!source || n(source.qty) < qty) {
          throw new Error('Stok gudang asal tidak cukup')
        }

        sqlite.prepare(`
          UPDATE mediasoft_warehouse_stock
          SET qty = qty - ?, updated_at = ?
          WHERE warehouse_id = ? AND kd_barang = ?
        `).run(qty, now, fromId, data.kd_barang)

        sqlite.prepare(`
          INSERT INTO mediasoft_warehouse_stock (warehouse_id, kd_barang, qty, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(warehouse_id, kd_barang) DO UPDATE SET
            qty = qty + excluded.qty,
            updated_at = excluded.updated_at
        `).run(toId, data.kd_barang, qty, now)

        sqlite.prepare(`
          INSERT INTO mediasoft_stock_transfers (kd_barang, from_warehouse_id, to_warehouse_id, qty, username, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(data.kd_barang, fromId, toId, qty, data.username || 'system', now)
      })
      transfer()

      return { success: true, message: 'Transfer stok berhasil dicatat' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getWarehouseStock(warehouseId?: number) {
    try {
      initInventoryTables()
      const where = warehouseId ? 'WHERE ws.warehouse_id = ?' : ''
      const params = warehouseId ? [warehouseId] : []
      const data = sqlite.prepare(`
        SELECT
          ws.*,
          w.name AS warehouse_name,
          b.nama_barang,
          b.barcode,
          b.stok AS global_stock
        FROM mediasoft_warehouse_stock ws
        LEFT JOIN mediasoft_warehouses w ON w.id = ws.warehouse_id
        LEFT JOIN mediasoft_barang b ON b.kd_barang = ws.kd_barang
        ${where}
        ORDER BY w.name ASC, b.nama_barang ASC
      `).all(...params)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getTransfers(limit = 50) {
    try {
      initInventoryTables()
      const data = sqlite.prepare(`
        SELECT
          st.*,
          b.nama_barang,
          fw.name AS from_warehouse,
          tw.name AS to_warehouse
        FROM mediasoft_stock_transfers st
        LEFT JOIN mediasoft_barang b ON b.kd_barang = st.kd_barang
        LEFT JOIN mediasoft_warehouses fw ON fw.id = st.from_warehouse_id
        LEFT JOIN mediasoft_warehouses tw ON tw.id = st.to_warehouse_id
        ORDER BY st.created_at DESC
        LIMIT ?
      `).all(Math.max(1, Math.min(Number(limit) || 50, 200)))
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
