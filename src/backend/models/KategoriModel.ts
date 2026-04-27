import { db } from '../../database/connection.js'
import { kategoriBarang } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export class KategoriModel {
  static getAll() {
    return db.select().from(kategoriBarang).all()
  }

  static create(data: { kategori_barang: string }) {
    db.insert(kategoriBarang).values(data).run()
  }

  static update(id: number, data: { kategori_barang: string }) {
    db.update(kategoriBarang).set(data).where(eq(kategoriBarang.kd_kategori_barang, id)).run()
  }

  static delete(id: number) {
    db.delete(kategoriBarang).where(eq(kategoriBarang.kd_kategori_barang, id)).run()
  }
}
