import { sqlite } from '../../database/connection.js'

function initTable() {
  try {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_tax_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rate REAL NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Insert default tax if none exists
    const existing = sqlite.prepare('SELECT COUNT(*) as count FROM mediasoft_tax_settings').get() as any
    if (existing?.count === 0) {
      sqlite.prepare('INSERT INTO mediasoft_tax_settings (name, rate, is_active) VALUES (?, ?, ?)').run('PPN 10%', 10, 1)
    }
  } catch (e) {
    console.error('Failed to init tax table:', e)
  }
}
initTable()

export class TaxController {
  static getActive() {
    return sqlite.prepare('SELECT * FROM mediasoft_tax_settings WHERE is_active = 1').get()
  }

  static getAll() {
    const data = sqlite.prepare('SELECT * FROM mediasoft_tax_settings ORDER BY name').all()
    return { success: true, data }
  }

  static setActive(id: number) {
    sqlite.prepare('UPDATE mediasoft_tax_settings SET is_active = 0').run()
    sqlite.prepare('UPDATE mediasoft_tax_settings SET is_active = 1 WHERE id = ?').run(id)
    return { success: true }
  }

  static create(data: any) {
    const result = sqlite.prepare('INSERT INTO mediasoft_tax_settings (name, rate) VALUES (?, ?)').run(data.name, data.rate)
    return { success: true, data: { id: result.lastInsertRowid } }
  }

  static update(id: number, data: any) {
    sqlite.prepare('UPDATE mediasoft_tax_settings SET name = ?, rate = ? WHERE id = ?').run(data.name, data.rate, id)
    return { success: true }
  }

  static delete(id: number) {
    const tax = sqlite.prepare('SELECT is_active FROM mediasoft_tax_settings WHERE id = ?').get(id) as any
    if (!tax) return { success: false, message: 'Pajak tidak ditemukan' }
    
    sqlite.prepare('DELETE FROM mediasoft_tax_settings WHERE id = ?').run(id)
    
    // If deleted tax was active, activate another one if available
    if (tax.is_active === 1) {
      const next = sqlite.prepare('SELECT id FROM mediasoft_tax_settings LIMIT 1').get() as any
      if (next) sqlite.prepare('UPDATE mediasoft_tax_settings SET is_active = 1 WHERE id = ?').run(next.id)
    }
    
    return { success: true }
  }
}
