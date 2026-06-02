import { sqlite } from '../../database/connection.js'

// Create tables if not exist
function initTables() {
  try {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        is_warehouse INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_stock_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_branch_id INTEGER,
        to_branch_id INTEGER,
        kd_barang TEXT,
        qty INTEGER,
        notes TEXT,
        transferred_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_stok (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kd_barang TEXT NOT NULL,
        jumlah INTEGER DEFAULT 0,
        branch_id INTEGER DEFAULT 1,
        UNIQUE(kd_barang, branch_id)
      )
    `).run()
  } catch (e) {
    console.error('Failed to init branch tables:', e)
  }
}
initTables()

export interface Branch {
  id: number
  code: string
  name: string
  address: string
  phone: string
  is_warehouse: number
  is_active: number
  created_at: string
}

export class BranchController {
  static getAll() {
    try {
      const data = sqlite.prepare(`
        SELECT * FROM mediasoft_branches 
        ORDER BY is_warehouse DESC, name ASC
      `).all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getActive() {
    try {
      const data = sqlite.prepare(`
        SELECT * FROM mediasoft_branches 
        WHERE is_active = 1 
        ORDER BY is_warehouse DESC, name ASC
      `).all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getWarehouses() {
    try {
      const data = sqlite.prepare(`
        SELECT * FROM mediasoft_branches 
        WHERE is_warehouse = 1 AND is_active = 1
        ORDER BY name ASC
      `).all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getById(id: number) {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_branches WHERE id = ?').get(id)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: Omit<Branch, 'id' | 'created_at'>) {
    try {
      const result = sqlite.prepare(`
        INSERT INTO mediasoft_branches (code, name, address, phone, is_warehouse, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.code, data.name, data.address || '', data.phone || '', data.is_warehouse || 0, data.is_active || 1)
      
      return { success: true, data: { id: result.lastInsertRowid } }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(id: number, data: Partial<Branch>) {
    try {
      const fields: string[] = []
      const values: any[] = []

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && value !== undefined) {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      })

      if (fields.length === 0) {
        return { success: false, message: 'Tidak ada data untuk diupdate' }
      }

      values.push(id)
      sqlite.prepare(`UPDATE mediasoft_branches SET ${fields.join(', ')} WHERE id = ?`).run(...values)

      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(id: number) {
    try {
      sqlite.prepare('DELETE FROM mediasoft_branches WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getStockSummary(branchId?: number) {
    try {
      const where = branchId ? 'WHERE s.branch_id = ?' : ''
      const params = branchId ? [branchId] : []
      const data = sqlite.prepare(`
        SELECT
          s.*,
          b.nama_barang,
          b.barcode,
          br.name AS branch_name,
          br.is_warehouse
        FROM mediasoft_stok s
        LEFT JOIN mediasoft_barang b ON b.kd_barang = s.kd_barang
        LEFT JOIN mediasoft_branches br ON br.id = s.branch_id
        ${where}
        ORDER BY br.name ASC, b.nama_barang ASC
      `).all(...params)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getTransferHistory(limit = 50) {
    try {
      const data = sqlite.prepare(`
        SELECT
          st.*,
          b.nama_barang,
          fb.name AS from_branch,
          tb.name AS to_branch
        FROM mediasoft_stock_transfers st
        LEFT JOIN mediasoft_barang b ON b.kd_barang = st.kd_barang
        LEFT JOIN mediasoft_branches fb ON fb.id = st.from_branch_id
        LEFT JOIN mediasoft_branches tb ON tb.id = st.to_branch_id
        WHERE st.from_branch_id IS NOT NULL OR st.to_branch_id IS NOT NULL
        ORDER BY st.created_at DESC
        LIMIT ?
      `).all(Math.max(1, Math.min(Number(limit) || 50, 200)))
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static transferStock(fromBranchId: number, toBranchId: number, productId: string, qty: number, notes: string, userId: string) {
    try {
      let fromStock = sqlite.prepare(`
        SELECT * FROM mediasoft_stok WHERE kd_barang = ? AND branch_id = ?
      `).get(productId, fromBranchId) as any

      if (!fromStock && fromBranchId === 1) {
        const product = sqlite.prepare('SELECT stok FROM mediasoft_barang WHERE kd_barang = ?').get(productId) as any
        if (product) {
          sqlite.prepare(`
            INSERT OR IGNORE INTO mediasoft_stok (kd_barang, jumlah, branch_id)
            VALUES (?, ?, 1)
          `).run(productId, Number(product.stok || 0))
          fromStock = sqlite.prepare(`
            SELECT * FROM mediasoft_stok WHERE kd_barang = ? AND branch_id = ?
          `).get(productId, fromBranchId) as any
        }
      }

      if (!fromStock || fromStock.jumlah < qty) {
        return { success: false, message: 'Stok tidak cukup di cabang asal' }
      }

      const doTransfer = sqlite.transaction(() => {
        // Reduce stock from source
        sqlite.prepare(`
          UPDATE mediasoft_stok SET jumlah = jumlah - ? WHERE kd_barang = ? AND branch_id = ?
        `).run(qty, productId, fromBranchId)

        // Add stock to destination
        const toStock = sqlite.prepare(`
          SELECT * FROM mediasoft_stok WHERE kd_barang = ? AND branch_id = ?
        `).get(productId, toBranchId)

        if (toStock) {
          sqlite.prepare(`
            UPDATE mediasoft_stok SET jumlah = jumlah + ? WHERE kd_barang = ? AND branch_id = ?
          `).run(qty, productId, toBranchId)
        } else {
          sqlite.prepare(`
            INSERT INTO mediasoft_stok (kd_barang, jumlah, branch_id) VALUES (?, ?, ?)
          `).run(productId, qty, toBranchId)
        }

        // Log the transfer — use from_branch_id/to_branch_id columns
        sqlite.prepare(`
          INSERT INTO mediasoft_stock_transfers (from_branch_id, to_branch_id, kd_barang, qty, notes, transferred_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(fromBranchId, toBranchId, productId, qty, notes || '', userId)
      })

      doTransfer()
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
