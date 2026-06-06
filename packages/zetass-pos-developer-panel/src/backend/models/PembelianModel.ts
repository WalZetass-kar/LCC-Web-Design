import { db } from '../../database/connection.js'
import { pembelian, pembelianDetail } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export class PembelianModel {
  static generateKode(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    return `PO${year}${month}${day}${time}${random}`
  }

  static getAll() {
    return db.select().from(pembelian).all()
  }

  static getById(kd_pembelian: string) {
    return db.select().from(pembelian).where(eq(pembelian.kd_pembelian, kd_pembelian)).get()
  }

  static create(data: typeof pembelian.$inferInsert) {
    return db.insert(pembelian).values(data).run()
  }

  static update(kd_pembelian: string, data: Partial<typeof pembelian.$inferInsert>) {
    return db.update(pembelian).set(data).where(eq(pembelian.kd_pembelian, kd_pembelian)).run()
  }

  static delete(kd_pembelian: string) {
    return db.delete(pembelian).where(eq(pembelian.kd_pembelian, kd_pembelian)).run()
  }

  // Detail methods
  static getDetailsByPembelian(kd_pembelian: string) {
    return db.select().from(pembelianDetail).where(eq(pembelianDetail.kd_pembelian, kd_pembelian)).all()
  }

  static addDetail(data: typeof pembelianDetail.$inferInsert) {
    return db.insert(pembelianDetail).values(data).run()
  }

  static deleteDetails(kd_pembelian: string) {
    return db.delete(pembelianDetail).where(eq(pembelianDetail.kd_pembelian, kd_pembelian)).run()
  }
}
