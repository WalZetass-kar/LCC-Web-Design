import { db, sqlite } from '../../database/connection.js'
import { pembelian, pembelianDetail, barang, supplier } from '../../database/schema.js'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import type { Pembelian, PembelianDetail } from '../../shared/types'

export class PembelianController {
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
    try {
      const result = db
        .select({
          kd_pembelian: pembelian.kd_pembelian,
          tgl_pembelian: pembelian.tgl_pembelian,
          kd_suplier: pembelian.kd_suplier,
          nama_suplier: supplier.nama_suplier,
          total_qty: pembelian.total_qty,
          sub_total: pembelian.sub_total,
          yang_dibayar: pembelian.yang_dibayar,
          sisa_hutang: pembelian.sisa_hutang,
          status: pembelian.status,
          username: pembelian.username,
          catatan: pembelian.catatan,
        })
        .from(pembelian)
        .leftJoin(supplier, eq(pembelian.kd_suplier, supplier.kd_suplier))
        .orderBy(desc(pembelian.tgl_pembelian))
        .all()

      return { success: true, data: result }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data pembelian: ' + (error as Error).message }
    }
  }

  static getById(kd_pembelian: string) {
    try {
      const header = db
        .select({
          kd_pembelian: pembelian.kd_pembelian,
          tgl_pembelian: pembelian.tgl_pembelian,
          kd_suplier: pembelian.kd_suplier,
          nama_suplier: supplier.nama_suplier,
          total_qty: pembelian.total_qty,
          sub_total: pembelian.sub_total,
          yang_dibayar: pembelian.yang_dibayar,
          sisa_hutang: pembelian.sisa_hutang,
          status: pembelian.status,
          username: pembelian.username,
          catatan: pembelian.catatan,
        })
        .from(pembelian)
        .leftJoin(supplier, eq(pembelian.kd_suplier, supplier.kd_suplier))
        .where(eq(pembelian.kd_pembelian, kd_pembelian))
        .get()

      if (!header) {
        return { success: false, message: 'Pembelian tidak ditemukan' }
      }

      const details = db
        .select({
          kd_pembelian_detail: pembelianDetail.kd_pembelian_detail,
          kd_pembelian: pembelianDetail.kd_pembelian,
          kd_barang: pembelianDetail.kd_barang,
          nama_barang: barang.nama_barang,
          qty: pembelianDetail.qty,
          harga_beli: pembelianDetail.harga_beli,
          total: pembelianDetail.total,
        })
        .from(pembelianDetail)
        .leftJoin(barang, eq(pembelianDetail.kd_barang, barang.kd_barang))
        .where(eq(pembelianDetail.kd_pembelian, kd_pembelian))
        .all()

      return { success: true, data: { header, details } }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil detail pembelian: ' + (error as Error).message }
    }
  }

  static create(data: {
    kd_suplier: string
    username: string
    catatan?: string
    items: Array<{ kd_barang: string; qty: number; harga_beli: number }>
    yang_dibayar: number
  }) {
    try {
      if (!data.items || data.items.length === 0) {
        return { success: false, message: 'Item pembelian tidak boleh kosong' }
      }

      const kd_pembelian = this.generateKode()
      const tgl_pembelian = new Date().toISOString()

      // Calculate totals
      let total_qty = 0
      let sub_total = 0

      for (const item of data.items) {
        if (item.qty <= 0 || item.harga_beli < 0) {
          return { success: false, message: 'Qty dan harga beli harus valid' }
        }
        total_qty += item.qty
        sub_total += item.qty * item.harga_beli
      }

      const yang_dibayar = data.yang_dibayar || 0
      const sisa_hutang = sub_total - yang_dibayar
      const status = sisa_hutang > 0 ? 'HUTANG' : 'LUNAS'

      // Insert header - gunakan mapping kolom yang benar
      const stmt = sqlite.prepare(`
        INSERT INTO mediasoft_pembelian 
        (kd_tansaksi_beli, tgl_wkt_transaksi, kd_suplier, total_qty, sub_total, yang_dibayar, sisa_hutang, status, username_transaksi, catatan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(kd_pembelian, tgl_pembelian, data.kd_suplier, total_qty, sub_total, yang_dibayar, sisa_hutang, status, data.username, data.catatan || null)

      // Insert details and update stock
      for (const item of data.items) {
        const total = item.qty * item.harga_beli

        db.insert(pembelianDetail).values({
          kd_pembelian,
          kd_barang: item.kd_barang,
          qty: item.qty,
          harga_beli: item.harga_beli,
          total,
        }).run()

        // Update stock
        db.update(barang)
          .set({
            stok: sql`${barang.stok} + ${item.qty}`,
          })
          .where(eq(barang.kd_barang, item.kd_barang))
          .run()
      }

      return { success: true, message: 'Pembelian berhasil disimpan', data: { kd_pembelian } }
    } catch (error) {
      return { success: false, message: 'Gagal menyimpan pembelian: ' + (error as Error).message }
    }
  }

  static updateStatus(kd_pembelian: string, yang_dibayar: number) {
    try {
      const existing = db.select().from(pembelian).where(eq(pembelian.kd_pembelian, kd_pembelian)).get()

      if (!existing) {
        return { success: false, message: 'Pembelian tidak ditemukan' }
      }

      const total_dibayar = (existing.yang_dibayar || 0) + yang_dibayar
      const sisa_hutang = (existing.sub_total || 0) - total_dibayar
      const status = sisa_hutang > 0 ? 'HUTANG' : 'LUNAS'

      db.update(pembelian)
        .set({
          yang_dibayar: total_dibayar,
          sisa_hutang,
          status,
        })
        .where(eq(pembelian.kd_pembelian, kd_pembelian))
        .run()

      return { success: true, message: 'Status pembelian berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal update status: ' + (error as Error).message }
    }
  }

  static delete(kd_pembelian: string) {
    try {
      // Get details first to restore stock
      const details = db
        .select()
        .from(pembelianDetail)
        .where(eq(pembelianDetail.kd_pembelian, kd_pembelian))
        .all()

      // Restore stock
      for (const detail of details) {
        db.update(barang)
          .set({
            stok: sql`${barang.stok} - ${detail.qty}`,
          })
          .where(eq(barang.kd_barang, detail.kd_barang!))
          .run()
      }

      // Delete details
      db.delete(pembelianDetail).where(eq(pembelianDetail.kd_pembelian, kd_pembelian)).run()

      // Delete header
      db.delete(pembelian).where(eq(pembelian.kd_pembelian, kd_pembelian)).run()

      return { success: true, message: 'Pembelian berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus pembelian: ' + (error as Error).message }
    }
  }

  static getLaporanPembelian(startDate: string, endDate: string) {
    try {
      const result = db
        .select({
          kd_pembelian: pembelian.kd_pembelian,
          tgl_pembelian: pembelian.tgl_pembelian,
          nama_suplier: supplier.nama_suplier,
          total_qty: pembelian.total_qty,
          sub_total: pembelian.sub_total,
          yang_dibayar: pembelian.yang_dibayar,
          sisa_hutang: pembelian.sisa_hutang,
          status: pembelian.status,
        })
        .from(pembelian)
        .leftJoin(supplier, eq(pembelian.kd_suplier, supplier.kd_suplier))
        .where(and(gte(pembelian.tgl_pembelian, startDate), lte(pembelian.tgl_pembelian, endDate)))
        .orderBy(desc(pembelian.tgl_pembelian))
        .all()

      return { success: true, data: result }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }
}
