import { db } from '../../database/connection.js'
import { kategoriBarang, barang } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export class KategoriModel {
  static getAll() {
    const categories = db.select().from(kategoriBarang).all()
    return categories.map(cat => {
      const count = db.select().from(barang).where(eq(barang.kd_kategori_barang, cat.kd_kategori_barang)).all().length
      return { ...cat, jumlah_produk: count }
    })
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
