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
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const random = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, '0')
      const code = `PO${year}${month}${day}${time}${random}`
      const existing = sqlite
        .prepare('SELECT 1 FROM mediasoft_pembelian WHERE kd_tansaksi_beli = ? LIMIT 1')
        .get(code)
      if (!existing) return code
    }
    throw new Error('Gagal membuat kode pembelian unik')
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

      const yang_dibayar = Number(data.yang_dibayar || 0)
      if (!Number.isFinite(yang_dibayar) || yang_dibayar < 0) {
        return { success: false, message: 'Pembayaran pembelian tidak valid' }
      }
      if (yang_dibayar > sub_total) {
        return { success: false, message: 'Pembayaran pembelian tidak boleh melebihi subtotal' }
      }
      const sisa_hutang = sub_total - yang_dibayar
      const status = sisa_hutang > 0 ? 'HUTANG' : 'LUNAS'

      const save = sqlite.transaction(() => {
        sqlite.prepare(`
          INSERT INTO mediasoft_pembelian 
          (kd_tansaksi_beli, tgl_wkt_transaksi, kd_suplier, total_qty, sub_total, yang_dibayar, sisa_hutang, status, username_transaksi, catatan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(kd_pembelian, tgl_pembelian, data.kd_suplier, total_qty, sub_total, yang_dibayar, sisa_hutang, status, data.username, data.catatan || null)

        for (const item of data.items) {
          const product = sqlite
            .prepare('SELECT kd_barang FROM mediasoft_barang WHERE kd_barang = ? LIMIT 1')
            .get(item.kd_barang)
          if (!product) throw new Error(`Barang ${item.kd_barang} tidak ditemukan`)

          const total = item.qty * item.harga_beli
          sqlite.prepare(`
            INSERT INTO mediasoft_pembelian_detail
              (kd_tansaksi_beli, kd_barang, qty, harga_beli, total_harga_beli, nama_pengguna, tgl_waktu_input)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(kd_pembelian, item.kd_barang, item.qty, item.harga_beli, total, data.username, tgl_pembelian)

          const updated = sqlite.prepare(`
            UPDATE mediasoft_barang
            SET stok = COALESCE(stok, 0) + ?
            WHERE kd_barang = ?
          `).run(item.qty, item.kd_barang)
          if (updated.changes === 0) throw new Error(`Gagal update stok ${item.kd_barang}`)
        }
      })

      save()

      return { success: true, message: 'Pembelian berhasil disimpan', data: { kd_pembelian } }
    } catch (error) {
      return { success: false, message: 'Gagal menyimpan pembelian: ' + (error as Error).message }
    }
  }

  static updateStatus(kd_pembelian: string, yang_dibayar: number) {
    try {
      const tambahanBayar = Number(yang_dibayar)
      if (!Number.isFinite(tambahanBayar) || tambahanBayar <= 0) {
        return { success: false, message: 'Nominal pembayaran harus lebih dari 0' }
      }
      const existing = db.select().from(pembelian).where(eq(pembelian.kd_pembelian, kd_pembelian)).get()

      if (!existing) {
        return { success: false, message: 'Pembelian tidak ditemukan' }
      }

      const total_dibayar = (existing.yang_dibayar || 0) + tambahanBayar
      if (total_dibayar > (existing.sub_total || 0)) {
        return { success: false, message: 'Total pembayaran tidak boleh melebihi subtotal pembelian' }
      }
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
      const existing = db.select().from(pembelian).where(eq(pembelian.kd_pembelian, kd_pembelian)).get()
      if (!existing) {
        return { success: false, message: 'Pembelian tidak ditemukan' }
      }

      // Get details first to restore stock
      const details = db
        .select()
        .from(pembelianDetail)
        .where(eq(pembelianDetail.kd_pembelian, kd_pembelian))
        .all()

      const remove = sqlite.transaction(() => {
        for (const detail of details) {
          const qty = Number(detail.qty || 0)
          const productId = String(detail.kd_barang || '')
          if (!productId || qty <= 0) throw new Error('Detail pembelian tidak valid')

          const result = sqlite.prepare(`
            UPDATE mediasoft_barang
            SET stok = COALESCE(stok, 0) - ?
            WHERE kd_barang = ? AND COALESCE(stok, 0) >= ?
          `).run(qty, productId, qty)
          if (result.changes === 0) {
            throw new Error(`Stok ${productId} tidak cukup untuk menghapus pembelian`)
          }
        }

        sqlite.prepare('DELETE FROM mediasoft_pembelian_detail WHERE kd_tansaksi_beli = ?').run(kd_pembelian)
        sqlite.prepare('DELETE FROM mediasoft_pembelian WHERE kd_tansaksi_beli = ?').run(kd_pembelian)
      })

      remove()

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
