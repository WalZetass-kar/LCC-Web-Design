import { db } from '../../database/connection.js'
import { barang, harga, kategoriBarang } from '../../database/schema.js'
import { eq, like, or } from 'drizzle-orm'

export class BarangModel {
  /** Get all products joined with price and category */
  static getAll() {
    return db
      .select({
        kd_barang: barang.kd_barang,
        nama_barang: barang.nama_barang,
        stok: barang.stok,
        stok_minimum: barang.stok_minimum,
        foto_barang: barang.foto_barang,
        deskripsi_barang: barang.deskripsi_barang,
        kd_kategori_barang: barang.kd_kategori_barang,
        kd_satuan: barang.kd_satuan,
        jenis_transaksi: barang.jenis_transaksi,
        harga_barang: harga.harga_barang,
        potongan: harga.potongan,
        harga_modal: harga.harga_modal,
        kategori_barang: kategoriBarang.kategori_barang,
        barcode: barang.barcode,
        expired_date: barang.expired_date,
      })
      .from(barang)
      .leftJoin(harga, eq(barang.kd_barang, harga.kd_barang))
      .leftJoin(kategoriBarang, eq(barang.kd_kategori_barang, kategoriBarang.kd_kategori_barang))
      .all()
  }

  static search(q: string) {
    const term = `%${q}%`
    return db
      .select({
        kd_barang: barang.kd_barang,
        nama_barang: barang.nama_barang,
        stok: barang.stok,
        harga_barang: harga.harga_barang,
        potongan: harga.potongan,
        kd_kategori_barang: barang.kd_kategori_barang,
      })
      .from(barang)
      .leftJoin(harga, eq(barang.kd_barang, harga.kd_barang))
      .where(or(like(barang.kd_barang, term), like(barang.nama_barang, term)))
      .all()
  }

  static getById(kd: string) {
    return db.select().from(barang).where(eq(barang.kd_barang, kd)).get()
  }

  static create(data: typeof barang.$inferInsert) {
    db.insert(barang).values(data).run()
    // Insert default harga row
    db.insert(harga).values({ kd_barang: data.kd_barang, harga_barang: 0, potongan: 0, harga_modal: 0 }).run()
  }

  static update(kd: string, data: Partial<typeof barang.$inferInsert & typeof harga.$inferInsert>) {
    const { harga_barang, potongan, harga_modal, ...barangData } = data
    if (Object.keys(barangData).length) {
      db.update(barang).set(barangData).where(eq(barang.kd_barang, kd)).run()
    }
    if (harga_barang !== undefined || potongan !== undefined || harga_modal !== undefined) {
      db.update(harga).set({ harga_barang, potongan, harga_modal }).where(eq(harga.kd_barang, kd)).run()
    }
  }

  static delete(kd: string) {
    db.delete(harga).where(eq(harga.kd_barang, kd)).run()
    db.delete(barang).where(eq(barang.kd_barang, kd)).run()
  }
}
