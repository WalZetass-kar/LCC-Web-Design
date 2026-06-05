import { sqlite } from '../../database/connection.js'

function n(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function q(sql: string, params: unknown[] = []) {
  const row = sqlite.prepare(sql).get(...params) as { value?: number } | undefined
  return n(row?.value)
}

function dateKey(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export class OwnerDashboardController {
  static getInsights() {
    try {
      const now = new Date()
      const today = dateKey(now)
      const monthStart = dateKey(new Date(now.getFullYear(), now.getMonth(), 1))
      const thirtyDaysAgo = dateKey(new Date(now.getTime() - 30 * 86400000))
      const sevenDaysAgo = dateKey(new Date(now.getTime() - 6 * 86400000))

      const salesMonth = q(`
        SELECT COALESCE(SUM(COALESCE(sub_total, 0) - COALESCE(discount_amount, 0) + COALESCE(pajak, 0)), 0) AS value
        FROM mediasoft_penjualan
        WHERE substr(tgl_wkt_transaksi, 1, 10) >= ?
      `, [monthStart])
      const salesToday = q(`
        SELECT COALESCE(SUM(COALESCE(sub_total, 0) - COALESCE(discount_amount, 0) + COALESCE(pajak, 0)), 0) AS value
        FROM mediasoft_penjualan
        WHERE substr(tgl_wkt_transaksi, 1, 10) = ?
      `, [today])
      const cogsMonth = q(`
        SELECT COALESCE(SUM(COALESCE(pd.harga_modal, 0) * COALESCE(pd.qty, 0)), 0) AS value
        FROM mediasoft_penjualan_detail pd
        JOIN mediasoft_penjualan p ON p.kd_tansaksi_jual = pd.kd_tansaksi_jual
        WHERE substr(p.tgl_wkt_transaksi, 1, 10) >= ?
      `, [monthStart])
      const avgDaily = q(`
        SELECT COALESCE(AVG(total), 0) AS value FROM (
          SELECT substr(tgl_wkt_transaksi, 1, 10) AS d, SUM(COALESCE(sub_total, 0) - COALESCE(discount_amount, 0) + COALESCE(pajak, 0)) AS total
          FROM mediasoft_penjualan
          WHERE substr(tgl_wkt_transaksi, 1, 10) >= ?
          GROUP BY substr(tgl_wkt_transaksi, 1, 10)
        )
      `, [sevenDaysAgo])

      const peakHours = sqlite.prepare(`
        SELECT strftime('%H:00', tgl_wkt_transaksi) AS hour, COUNT(*) AS count,
          COALESCE(SUM(COALESCE(sub_total, 0) - COALESCE(discount_amount, 0) + COALESCE(pajak, 0)), 0) AS total
        FROM mediasoft_penjualan
        WHERE substr(tgl_wkt_transaksi, 1, 10) >= ?
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 5
      `).all(thirtyDaysAgo)

      const cashierPerformance = sqlite.prepare(`
        SELECT username_transaksi AS username, COUNT(*) AS count,
          COALESCE(SUM(COALESCE(sub_total, 0) - COALESCE(discount_amount, 0) + COALESCE(pajak, 0)), 0) AS total
        FROM mediasoft_penjualan
        WHERE substr(tgl_wkt_transaksi, 1, 10) >= ?
        GROUP BY username_transaksi
        ORDER BY total DESC
        LIMIT 5
      `).all(thirtyDaysAgo)

      const slowMoving = sqlite.prepare(`
        SELECT b.kd_barang, b.nama_barang, COALESCE(b.stok, 0) AS stok, COALESCE(MAX(p.tgl_wkt_transaksi), '') AS last_sold_at
        FROM mediasoft_barang b
        LEFT JOIN mediasoft_penjualan_detail pd ON pd.kd_barang = b.kd_barang
        LEFT JOIN mediasoft_penjualan p ON p.kd_tansaksi_jual = pd.kd_tansaksi_jual
        GROUP BY b.kd_barang
        HAVING last_sold_at = '' OR substr(last_sold_at, 1, 10) < ?
        ORDER BY b.stok DESC
        LIMIT 8
      `).all(thirtyDaysAgo)

      const reorder = sqlite.prepare(`
        SELECT kd_barang, nama_barang, COALESCE(stok, 0) AS stok, COALESCE(stok_minimum, 5) AS stok_minimum
        FROM mediasoft_barang
        WHERE COALESCE(stok, 0) <= COALESCE(stok_minimum, 5)
        ORDER BY stok ASC, nama_barang ASC
        LIMIT 10
      `).all()

      const marginByCategory = sqlite.prepare(`
        SELECT COALESCE(k.kategori_barang, 'Tanpa Kategori') AS category,
          COALESCE(SUM((COALESCE(pd.harga_jual, 0) - COALESCE(pd.harga_modal, 0)) * COALESCE(pd.qty, 0)), 0) AS margin,
          COALESCE(SUM(COALESCE(pd.harga_jual, 0) * COALESCE(pd.qty, 0)), 0) AS revenue
        FROM mediasoft_penjualan_detail pd
        JOIN mediasoft_penjualan p ON p.kd_tansaksi_jual = pd.kd_tansaksi_jual
        LEFT JOIN mediasoft_barang b ON b.kd_barang = pd.kd_barang
        LEFT JOIN mediasoft_kategori_barang k ON k.kd_kategori_barang = b.kd_kategori_barang
        WHERE substr(p.tgl_wkt_transaksi, 1, 10) >= ?
        GROUP BY category
        ORDER BY margin DESC
        LIMIT 6
      `).all(monthStart)

      const customerSegments = sqlite.prepare(`
        SELECT
          SUM(CASE WHEN COALESCE(total_belanja, 0) >= 1000000 THEN 1 ELSE 0 END) AS vip,
          SUM(CASE WHEN COALESCE(total_belanja, 0) BETWEEN 1 AND 999999 THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN COALESCE(total_belanja, 0) = 0 THEN 1 ELSE 0 END) AS inactive
        FROM mediasoft_customer
      `).get() as any

      return {
        success: true,
        data: {
          kpis: {
            salesToday,
            salesMonth,
            grossProfitMonth: salesMonth - cogsMonth,
            avgDailySales: avgDaily,
            projectedMonth: Math.round(avgDaily * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()),
          },
          peakHours,
          cashierPerformance,
          slowMoving,
          reorder,
          marginByCategory,
          customerSegments: {
            vip: n(customerSegments?.vip),
            active: n(customerSegments?.active),
            inactive: n(customerSegments?.inactive),
          },
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
