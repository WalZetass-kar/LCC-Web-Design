import { db } from '../../database/connection.js'
import { supplier } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export class SupplierModel {
  static getAll() {
    return db.select().from(supplier).all()
  }

  static getById(kd: string) {
    return db.select().from(supplier).where(eq(supplier.kd_suplier, kd)).get()
  }

  static create(data: {
    kd_suplier: string
    nama_suplier: string
    alamat_suplier?: string
    no_telp_hp?: string
    email?: string
    nama_pengguna: string
  }) {
    return db.insert(supplier).values({
      ...data,
      tgl_wkt_simpan: new Date().toISOString(),
      status: 'Aktif',
    }).run()
  }

  static update(kd: string, data: Partial<typeof supplier.$inferInsert>) {
    return db.update(supplier).set({
      ...data,
      tgl_wkt_edit: new Date().toISOString(),
    }).where(eq(supplier.kd_suplier, kd)).run()
  }

  static delete(kd: string) {
    return db.delete(supplier).where(eq(supplier.kd_suplier, kd)).run()
  }
}
