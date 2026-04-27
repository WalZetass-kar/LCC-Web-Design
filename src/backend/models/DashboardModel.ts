import { db } from '../../database/connection.js'
import { penjualan, barang } from '../../database/schema.js'
import { sql, gte } from 'drizzle-orm'

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
    const lowStock = db.select().from(barang).where(gte(barang.stok, 0)).all().filter(b => (b.stok ?? 0) <= 5)

    // Last 7 days chart data
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      const total = allSales.filter(s => s.tgl_wkt_transaksi?.startsWith(dateStr)).reduce((a, b) => a + (b.sub_total ?? 0), 0)
      return { label, total }
    })

    return {
      today: { count: todaySales.length, total: sum(todaySales) },
      week: { count: weekSales.length, total: sum(weekSales) },
      month: { count: monthSales.length, total: sum(monthSales) },
      totalBarang: totalBarang?.count ?? 0,
      lowStockCount: lowStock.length,
      chartData,
    }
  }
}
