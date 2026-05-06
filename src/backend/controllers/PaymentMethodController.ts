import { sqlite } from '../../database/connection.js'

export class PaymentMethodController {
  static getAll() {
    const data = sqlite.prepare('SELECT * FROM mediasoft_payment_methods WHERE is_active = 1 ORDER BY name').all()
    return { success: true, data }
  }

  static create(data: any) {
    const result = sqlite.prepare('INSERT INTO mediasoft_payment_methods (name, type, account_number, account_name) VALUES (?, ?, ?, ?)').run(data.name, data.type, data.account_number, data.account_name)
    return { success: true, data: { id: result.lastInsertRowid } }
  }

  static update(id: number, data: any) {
    sqlite.prepare('UPDATE mediasoft_payment_methods SET name = ?, type = ?, account_number = ?, account_name = ? WHERE id = ?').run(data.name, data.type, data.account_number, data.account_name, id)
    return { success: true }
  }

  static delete(id: number) {
    sqlite.prepare('UPDATE mediasoft_payment_methods SET is_active = 0 WHERE id = ?').run(id)
    return { success: true }
  }
}
