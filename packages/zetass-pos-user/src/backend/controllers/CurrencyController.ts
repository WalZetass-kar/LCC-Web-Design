import { sqlite } from '../../database/connection.js'

export interface Currency {
  id: number
  code: string
  name: string
  symbol: string
  exchange_rate: number
  is_default: number
  is_active: number
  created_at: string
}

export class CurrencyController {
  static getAll() {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_currencies ORDER BY is_default DESC, code ASC').all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getActive() {
    try {
      const data = sqlite.prepare('SELECT * FROM mediasoft_currencies WHERE is_active = 1 ORDER BY is_default DESC').all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: Omit<Currency, 'id' | 'created_at'>) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare(`
        INSERT INTO mediasoft_currencies (code, name, symbol, exchange_rate, is_default, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.code, data.name, data.symbol, data.exchange_rate, data.is_default, data.is_active, now)
      return { success: true, message: 'Mata uang berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(id: number, data: Partial<Currency>) {
    try {
      const fields: string[] = []
      const values: any[] = []
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at') {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      })
      values.push(id)
      sqlite.prepare(`UPDATE mediasoft_currencies SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      return { success: true, message: 'Mata uang berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(id: number) {
    try {
      sqlite.prepare('DELETE FROM mediasoft_currencies WHERE id = ?').run(id)
      return { success: true, message: 'Mata uang berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static setDefault(id: number) {
    try {
      sqlite.prepare('UPDATE mediasoft_currencies SET is_default = 0').run()
      sqlite.prepare('UPDATE mediasoft_currencies SET is_default = 1 WHERE id = ?').run(id)
      return { success: true, message: 'Mata uang utama berhasil diatur' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
