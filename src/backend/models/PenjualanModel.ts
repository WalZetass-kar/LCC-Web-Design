import { db, sqlite } from '../../database/connection.js'
import { penjualan, penjualanDetail, barang } from '../../database/schema.js'
import { eq, desc } from 'drizzle-orm'

export class PenjualanModel {
  static getAll() {
    return db.select().from(penjualan).orderBy(desc(penjualan.tgl_wkt_transaksi)).all()
  }

  static getDetail(kd: string) {
    const header = db.select().from(penjualan).where(eq(penjualan.kd_tansaksi_jual, kd)).get()
    const details = db
      .select({
        kd_trans_jual_detail: penjualanDetail.kd_trans_jual_detail,
        kd_barang: penjualanDetail.kd_barang,
        nama_barang: barang.nama_barang,
        harga_jual: penjualanDetail.harga_jual,
        qty: penjualanDetail.qty,
        disc: penjualanDetail.disc,
        total_harga_jual: penjualanDetail.total_harga_jual,
      })
      .from(penjualanDetail)
      .leftJoin(barang, eq(penjualanDetail.kd_barang, barang.kd_barang))
      .where(eq(penjualanDetail.kd_tansaksi_jual, kd))
      .all()
    return { header, details }
  }

  static create(
    header: typeof penjualan.$inferInsert & { discount_amount?: number },
    details: (typeof penjualanDetail.$inferInsert)[]
  ) {
    try {
      db.insert(penjualan).values(header).run()
      // Save discount_amount and shift_id (not in Drizzle schema but exist in DB)
      if (header.discount_amount || header.shift_id) {
        sqlite.prepare('UPDATE mediasoft_penjualan SET discount_amount = ?, shift_id = ? WHERE kd_tansaksi_jual = ?')
          .run(header.discount_amount ?? 0, header.shift_id ?? null, header.kd_tansaksi_jual)
      }
      for (const d of details) {
        db.insert(penjualanDetail).values(d).run()
        if (d.kd_barang && d.qty) {
          const item = db.select({ stok: barang.stok }).from(barang).where(eq(barang.kd_barang, d.kd_barang)).get()
          if (item) {
            const newStok = (item.stok ?? 0) - d.qty
            if (newStok < 0) {
              throw new Error(`Stok tidak mencukupi untuk barang ${d.kd_barang}`)
            }
            db.update(barang).set({ stok: newStok }).where(eq(barang.kd_barang, d.kd_barang)).run()
          }
        }
      }
    } catch (error) {
      throw error
    }
  }
}
