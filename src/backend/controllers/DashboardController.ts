import { DashboardModel } from '../models/DashboardModel.js'
import { db } from '../../database/connection.js'
import { penjualan } from '../../database/schema.js'
import { gte, sql } from 'drizzle-orm'

export class DashboardController {
  static getSummary() {
    return { success: true, data: DashboardModel.getSummary() }
  }

  // Perbandingan penjualan 6 bulan terakhir
  static getMonthlyComparison() {
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      const startDate = sixMonthsAgo.toISOString().split('T')[0]

      const rows = db
        .select({
          month: sql<string>`strftime('%Y-%m', ${penjualan.tgl_wkt_transaksi})`,
          total: sql<number>`SUM(${penjualan.sub_total} - COALESCE(discount_amount, 0))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(penjualan)
        .where(gte(penjualan.tgl_wkt_transaksi, startDate))
        .groupBy(sql`strftime('%Y-%m', ${penjualan.tgl_wkt_transaksi})`)
        .orderBy(sql`strftime('%Y-%m', ${penjualan.tgl_wkt_transaksi})`)
        .all()

      const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
      const data = rows.map(r => ({
        label: MONTHS[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0],
        total: r.total ?? 0,
        count: r.count ?? 0,
      }))

      return { success: true, data }
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  }
}
