import { db } from '../../database/connection.js'
import { penjualan, barang, penjualanDetail } from '../../database/schema.js'
import { sql, gte, lte } from 'drizzle-orm'

export class DashboardModel {
  static getSummary() {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    const monthStr = now.toISOString().slice(0, 7)

    const allSales = db.select().from(penjualan).all()

    const todaySales = allSales.filter(s => s.tgl_wkt_transaksi?.startsWith(todayStr))
    const weekSales = allSales.filter(s => (s.tgl_wkt_transaksi ?? '') >= weekAgo)
    const monthSales = allSales.filter(s => s.tgl_wkt_transaksi?.startsWith(monthStr))

    const sum = (arr: typeof allSales) => arr.reduce((a, b) => a + (b.sub_total ?? 0), 0)

    const totalBarang = db.select({ count: sql<number>`count(*)` }).from(barang).get()
    const lowStock = db.select().from(barang).where(lte(barang.stok, 5)).all()

    // Last 7 days chart data
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      const total = allSales.filter(s => s.tgl_wkt_transaksi?.startsWith(dateStr)).reduce((a, b) => a + (b.sub_total ?? 0), 0)
      return { label, total }
    })

    // Top 5 produk terlaris (minggu ini)
    let topProducts: any[] = []
    
    try {
      topProducts = db.all(sql`
        SELECT 
          pd.kd_barang,
          b.nama_barang,
          SUM(pd.qty) as total_qty,
          SUM(pd.harga_jual * pd.qty) as total_revenue
        FROM mediasoft_penjualan_detail pd
        LEFT JOIN mediasoft_barang b ON pd.kd_barang = b.kd_barang
        WHERE pd.kd_tansaksi_jual IN (
          SELECT kd_tansaksi_jual FROM mediasoft_penjualan 
          WHERE tgl_wkt_transaksi >= ${weekAgo}
        )
        GROUP BY pd.kd_barang, b.nama_barang
        ORDER BY total_qty DESC
        LIMIT 5
      `)
    } catch (e) {
      console.error('Error fetching top products:', e)
    }

    // Prediction Logic: Simple 3-day moving average for tomorrow's sales
    const last3Days = chartData.slice(-3)
    const predictedTomorrow = Math.round(last3Days.reduce((a, b) => a + b.total, 0) / 3)

    return {
      today: { count: todaySales.length, total: sum(todaySales) },
      week: { count: weekSales.length, total: sum(weekSales) },
      month: { count: monthSales.length, total: sum(monthSales) },
      totalBarang: totalBarang?.count ?? 0,
      lowStockCount: lowStock.length,
      chartData,
      predictedTomorrow,
      topProducts: topProducts.map(p => ({
        kd_barang: p.kd_barang,
        nama_barang: p.nama_barang,
        total_qty: p.total_qty,
        total_revenue: p.total_revenue,
      })),
      lowStockProducts: lowStock.slice(0, 5).map(b => ({
        kd_barang: b.kd_barang,
        nama_barang: b.nama_barang,
        stok: b.stok,
        stok_minimum: b.stok_minimum,
      })),
    }
  }
}
