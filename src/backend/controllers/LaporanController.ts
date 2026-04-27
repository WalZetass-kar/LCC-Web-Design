import { db } from '../../database/connection.js'
import { penjualan, penjualanDetail, barang, customer, kasDrawer } from '../../database/schema.js'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'

export class LaporanController {
  // Laporan Penjualan
  static getLaporanPenjualan(startDate: string, endDate: string) {
    try {
      const result = db
        .select({
          kd_tansaksi_jual: penjualan.kd_tansaksi_jual,
          tgl_wkt_transaksi: penjualan.tgl_wkt_transaksi,
          username_transaksi: penjualan.username_transaksi,
          total_qty: penjualan.total_qty,
          sub_total: penjualan.sub_total,
          pajak: penjualan.pajak,
          yang_dibayar: penjualan.yang_dibayar,
          jenis_pembayaran: penjualan.jenis_pembayaran,
        })
        .from(penjualan)
        .where(and(gte(penjualan.tgl_wkt_transaksi, startDate), lte(penjualan.tgl_wkt_transaksi, endDate)))
        .orderBy(desc(penjualan.tgl_wkt_transaksi))
        .all()

      const summary = {
        total_transaksi: result.length,
        total_qty: result.reduce((sum, r) => sum + (r.total_qty || 0), 0),
        total_penjualan: result.reduce((sum, r) => sum + (r.yang_dibayar || 0), 0),
        total_pajak: result.reduce((sum, r) => sum + (r.pajak || 0), 0),
      }

      return { success: true, data: { transaksi: result, summary } }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }

  // Laporan Laba Rugi
  static getLaporanLabaRugi(startDate: string, endDate: string) {
    try {
      const transaksi = db
        .select({
          kd_tansaksi_jual: penjualan.kd_tansaksi_jual,
          tgl_wkt_transaksi: penjualan.tgl_wkt_transaksi,
        })
        .from(penjualan)
        .where(and(gte(penjualan.tgl_wkt_transaksi, startDate), lte(penjualan.tgl_wkt_transaksi, endDate)))
        .all()

      let total_penjualan = 0
      let total_modal = 0

      for (const t of transaksi) {
        const details = db
          .select({
            qty: penjualanDetail.qty,
            harga_jual: penjualanDetail.harga_jual,
            harga_modal: penjualanDetail.harga_modal,
          })
          .from(penjualanDetail)
          .where(eq(penjualanDetail.kd_tansaksi_jual, t.kd_tansaksi_jual))
          .all()

        for (const d of details) {
          total_penjualan += (d.qty || 0) * (d.harga_jual || 0)
          total_modal += (d.qty || 0) * (d.harga_modal || 0)
        }
      }

      const laba_kotor = total_penjualan - total_modal
      const margin_persen = total_penjualan > 0 ? (laba_kotor / total_penjualan) * 100 : 0

      return {
        success: true,
        data: {
          total_transaksi: transaksi.length,
          total_penjualan,
          total_modal,
          laba_kotor,
          margin_persen: Math.round(margin_persen * 100) / 100,
        },
      }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }

  // Laporan Produk Terlaris
  static getLaporanProdukTerlaris(startDate: string, endDate: string, limit: number = 10) {
    try {
      const transaksi = db
        .select({ kd_tansaksi_jual: penjualan.kd_tansaksi_jual })
        .from(penjualan)
        .where(and(gte(penjualan.tgl_wkt_transaksi, startDate), lte(penjualan.tgl_wkt_transaksi, endDate)))
        .all()

      const kdTransaksiList = transaksi.map((t) => t.kd_tansaksi_jual)

      if (kdTransaksiList.length === 0) {
        return { success: true, data: [] }
      }

      // Aggregate by product
      const productSales: Record<
        string,
        { kd_barang: string; nama_barang: string; total_qty: number; total_penjualan: number }
      > = {}

      for (const kd of kdTransaksiList) {
        const details = db
          .select({
            kd_barang: penjualanDetail.kd_barang,
            nama_barang: barang.nama_barang,
            qty: penjualanDetail.qty,
            total_harga_jual: penjualanDetail.total_harga_jual,
          })
          .from(penjualanDetail)
          .leftJoin(barang, eq(penjualanDetail.kd_barang, barang.kd_barang))
          .where(eq(penjualanDetail.kd_tansaksi_jual, kd))
          .all()

        for (const d of details) {
          const key = d.kd_barang || ''
          if (!productSales[key]) {
            productSales[key] = {
              kd_barang: d.kd_barang || '',
              nama_barang: d.nama_barang || '',
              total_qty: 0,
              total_penjualan: 0,
            }
          }
          productSales[key].total_qty += d.qty || 0
          productSales[key].total_penjualan += d.total_harga_jual || 0
        }
      }

      const result = Object.values(productSales)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, limit)

      return { success: true, data: result }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }

  // Laporan Stok Barang
  static getLaporanStok() {
    try {
      const result = db
        .select({
          kd_barang: barang.kd_barang,
          nama_barang: barang.nama_barang,
          stok: barang.stok,
          stok_minimum: barang.stok_minimum,
        })
        .from(barang)
        .orderBy(barang.stok)
        .all()

      const stokMenipis = result.filter((b) => (b.stok || 0) <= (b.stok_minimum || 0))
      const stokAman = result.filter((b) => (b.stok || 0) > (b.stok_minimum || 0))

      return {
        success: true,
        data: {
          all: result,
          stok_menipis: stokMenipis,
          stok_aman: stokAman,
        },
      }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }

  // Laporan Kas
  static getLaporanKas(startDate: string, endDate: string) {
    try {
      const result = db
        .select()
        .from(kasDrawer)
        .where(and(gte(kasDrawer.tgl_buka, startDate), lte(kasDrawer.tgl_buka, endDate)))
        .orderBy(desc(kasDrawer.tgl_buka))
        .all()

      const summary = {
        total_kas: result.length,
        total_modal_awal: result.reduce((sum, k) => sum + (k.modal_awal || 0), 0),
        total_penjualan: result.reduce((sum, k) => sum + (k.total_penjualan || 0), 0),
        total_pengeluaran: result.reduce((sum, k) => sum + (k.total_pengeluaran || 0), 0),
        total_selisih: result.reduce((sum, k) => sum + (k.selisih || 0), 0),
      }

      return { success: true, data: { kas: result, summary } }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }

  // Laporan Customer
  static getLaporanCustomer() {
    try {
      const result = db
        .select()
        .from(customer)
        .orderBy(desc(customer.total_belanja))
        .all()

      const summary = {
        total_customer: result.length,
        customer_aktif: result.filter((c) => c.status === 'Aktif').length,
        total_poin: result.reduce((sum, c) => sum + (c.poin || 0), 0),
        total_belanja: result.reduce((sum, c) => sum + (c.total_belanja || 0), 0),
      }

      return { success: true, data: { customers: result, summary } }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan: ' + (error as Error).message }
    }
  }
}
