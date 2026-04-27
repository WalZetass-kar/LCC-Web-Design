import { db } from '../../database/connection.js'
import { pengguna } from '../../database/schema.js'
import { eq, and } from 'drizzle-orm'

export class PenggunaModel {
  static getAll() {
    return db.select().from(pengguna).all()
  }

  static findByUsername(nama_pengguna: string) {
    return db.select().from(pengguna)
      .where(eq(pengguna.nama_pengguna, nama_pengguna))
      .get()
  }

  static findActive(nama_pengguna: string, kata_sandi: string) {
    return db
      .select()
      .from(pengguna)
      .where(
        and(
          eq(pengguna.nama_pengguna, nama_pengguna),
          eq(pengguna.kata_sandi, kata_sandi),
          eq(pengguna.status_user, 'Aktif')
        )
      )
      .get()
  }

  static create(data: {
    nama_pengguna: string
    kata_sandi: string
    nama_lengkap: string
    email?: string
    no_telp?: string
    role?: string
  }) {
    return db.insert(pengguna).values({
      ...data,
      tgl_wkt_simpan: new Date().toISOString(),
      status_user: 'Aktif',
      role: data.role || 'KASIR',
    }).run()
  }

  static update(nama_pengguna: string, data: Partial<typeof pengguna.$inferInsert>) {
    return db.update(pengguna).set({
      ...data,
      tgl_wkt_edit: new Date().toISOString(),
    }).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  static delete(nama_pengguna: string) {
    return db.delete(pengguna).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  static updateLastLogin(nama_pengguna: string) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    db.update(pengguna)
      .set({ terakhir_login: now })
      .where(eq(pengguna.nama_pengguna, nama_pengguna))
      .run()
  }
}
