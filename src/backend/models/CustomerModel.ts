import { db } from '../../database/connection.js'
import { customer } from '../../database/schema.js'
import { eq, like, or } from 'drizzle-orm'

export class CustomerModel {
  static generateKode(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    return `CUST${year}${month}${day}${random}`
  }

  static getAll() {
    return db.select().from(customer).all()
  }

  static getById(kd: string) {
    return db.select().from(customer).where(eq(customer.kd_customer, kd)).get()
  }

  static search(query: string) {
    return db
      .select()
      .from(customer)
      .where(
        or(
          like(customer.nama_customer, `%${query}%`),
          like(customer.no_telp, `%${query}%`),
          like(customer.email, `%${query}%`)
        )
      )
      .all()
  }

  static create(data: {
    kd_customer: string
    nama_customer: string
    no_telp?: string
    email?: string
    alamat?: string
    tgl_lahir?: string
  }) {
    return db.insert(customer).values({
      ...data,
      tgl_daftar: new Date().toISOString(),
      poin: 0,
      total_belanja: 0,
      status: 'Aktif',
    }).run()
  }

  static update(kd: string, data: Partial<typeof customer.$inferInsert>) {
    return db.update(customer).set(data).where(eq(customer.kd_customer, kd)).run()
  }

  static delete(kd: string) {
    return db.delete(customer).where(eq(customer.kd_customer, kd)).run()
  }

  static addPoin(kd: string, poin: number) {
    const cust = this.getById(kd)
    if (!cust) return
    return db.update(customer).set({
      poin: (cust.poin ?? 0) + poin,
    }).where(eq(customer.kd_customer, kd)).run()
  }

  static addTotalBelanja(kd: string, jumlah: number) {
    const cust = this.getById(kd)
    if (!cust) return
    return db.update(customer).set({
      total_belanja: (cust.total_belanja ?? 0) + jumlah,
    }).where(eq(customer.kd_customer, kd)).run()
  }

  static updateTotalBelanja(kd: string, jumlah: number) {
    return this.addTotalBelanja(kd, jumlah)
  }

  static getBirthdayToday() {
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const pattern = `%-${month}-${day}`
    
    return db
      .select()
      .from(customer)
      .where(like(customer.tgl_lahir, pattern))
      .all()
  }
}
