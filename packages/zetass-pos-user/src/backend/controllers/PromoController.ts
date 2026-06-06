import { PromoService } from '../services/promoService.js'
import { sqlite } from '../../database/connection.js'

function initTable() {
  try {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_promos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        max_discount REAL,
        start_date TEXT,
        end_date TEXT,
        start_time TEXT,
        end_time TEXT,
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        conditions TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
  } catch (e) {
    console.error('Failed to init promos table:', e)
  }
}
initTable()

export class PromoController {
  static getAll() {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_promos ORDER BY created_at DESC').all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getActive() {
    return PromoService.getActivePromos()
  }

  static create(data: any) {
    return PromoService.createPromo(data)
  }

  static update(id: number, data: any) {
    return PromoService.updatePromo(id, data)
  }

  static delete(id: number) {
    return PromoService.deletePromo(id)
  }

  static validate(code: string, subtotal: number, items: any[]) {
    return { success: true, data: PromoService.validatePromo(code, subtotal, items) }
  }
}
