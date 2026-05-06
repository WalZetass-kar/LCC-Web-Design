import { sqlite } from '../../database/connection.js'

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
}
