import { db, sqlite } from '../../database/connection.js'
import { penjualan, penjualanDetail, barang, customer, kasDrawer, pembelian, pembelianDetail, supplier } from '../../database/schema.js'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'

function salesStartDate(date: string) {
  return date.includes(' ') || date.includes('T') ? date : `${date} 00:00:00`
}

function salesEndDate(date: string) {
  return date.includes(' ') || date.includes('T') ? date : `${date} 23:59:59`
}

export class LaporanController {
  // Laporan Penjualan
  static getLaporanPenjualan(startDate: string, endDate: string) {
    try {
      const start = salesStartDate(startDate)
      const end = salesEndDate(endDate)
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
        .where(and(gte(penjualan.tgl_wkt_transaksi, start), lte(penjualan.tgl_wkt_transaksi, end)))
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
      const start = salesStartDate(startDate)
      const end = salesEndDate(endDate)
      const transaksi = db
        .select({
          kd_tansaksi_jual: penjualan.kd_tansaksi_jual,
          tgl_wkt_transaksi: penjualan.tgl_wkt_transaksi,
        })
        .from(penjualan)
        .where(and(gte(penjualan.tgl_wkt_transaksi, start), lte(penjualan.tgl_wkt_transaksi, end)))
        .all()

      let total_penjualan = 0
      let total_modal = 0

      for (const t of transaksi) {
        const details = db
          .select({
            qty: penjualanDetail.qty,
            harga_jual: penjualanDetail.harga_jual,
            harga_modal: penjualanDetail.harga_modal,
            disc: penjualanDetail.disc,
          })
          .from(penjualanDetail)
          .where(eq(penjualanDetail.kd_tansaksi_jual, t.kd_tansaksi_jual))
          .all()

        for (const d of details) {
          const disc_amount = ((d.harga_jual || 0) * (d.disc || 0)) / 100
          total_penjualan += (d.qty || 0) * ((d.harga_jual || 0) - disc_amount)
          total_modal += (d.qty || 0) * (d.harga_modal || 0)
        }

        // Kurangi diskon promo level transaksi
        const row = sqlite.prepare('SELECT discount_amount FROM mediasoft_penjualan WHERE kd_tansaksi_jual = ?').get(t.kd_tansaksi_jual) as any
        if (row?.discount_amount) total_penjualan -= row.discount_amount
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
      const start = salesStartDate(startDate)
      const end = salesEndDate(endDate)
      const transaksi = db
        .select({ kd_tansaksi_jual: penjualan.kd_tansaksi_jual })
        .from(penjualan)
        .where(and(gte(penjualan.tgl_wkt_transaksi, start), lte(penjualan.tgl_wkt_transaksi, end)))
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

  // Laporan Pembelian
  static getLaporanPembelian(startDate: string, endDate: string) {
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
        })
        .from(pembelian)
        .leftJoin(supplier, eq(pembelian.kd_suplier, supplier.kd_suplier))
        .where(and(gte(pembelian.tgl_pembelian, startDate), lte(pembelian.tgl_pembelian, endDate)))
        .orderBy(desc(pembelian.tgl_pembelian))
        .all()

      const summary = {
        total_po: result.length,
        total_qty: result.reduce((sum, r) => sum + (r.total_qty || 0), 0),
        total_pembelian: result.reduce((sum, r) => sum + (r.sub_total || 0), 0),
        total_dibayar: result.reduce((sum, r) => sum + (r.yang_dibayar || 0), 0),
        total_hutang: result.reduce((sum, r) => sum + (r.sisa_hutang || 0), 0),
        lunas: result.filter(r => r.status === 'LUNAS').length,
        belum_lunas: result.filter(r => r.status !== 'LUNAS').length,
      }

      return { success: true, data: { pembelian: result, summary } }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil laporan pembelian: ' + (error as Error).message }
    }
  }
}
