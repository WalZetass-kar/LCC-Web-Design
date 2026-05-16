import { describe, expect, it } from 'vitest'
import { buildLocalAssistantResponse } from '../src/shared/dashboardAssistant'
import { dashboardSummaryToSheetsPayload, dashboardSummaryToTsv } from '../src/shared/googleSheetsExport'
import { normalizeIndustrySettings } from '../src/shared/industrySettings'
import type { DashboardSummary } from '../src/shared/types'

const summary: DashboardSummary = {
  today: { count: 3, total: 150000 },
  week: { count: 14, total: 700000 },
  month: { count: 44, total: 2200000 },
  totalBarang: 8,
  lowStockCount: 1,
  chartData: [
    { label: 'Sen', total: 100000 },
    { label: 'Sel', total: 120000 },
  ],
  predictedTomorrow: 110000,
  topProducts: [
    { kd_barang: 'BRG001', nama_barang: 'Kopi', total_qty: 12, total_revenue: 240000 },
  ],
  lowStockProducts: [
    { kd_barang: 'BRG002', nama_barang: 'Teh', stok: 2, stok_minimum: 5 },
  ],
}

describe('industry features', () => {
  it('answers dashboard income questions locally', () => {
    const answer = buildLocalAssistantResponse('pemasukan minggu ini', summary)
    expect(answer).toContain('Pemasukan minggu ini')
    expect(answer).toContain('Rp')
    expect(answer).toContain('14')
  })

  it('builds Google Sheets payload and TSV from dashboard summary', () => {
    const payload = dashboardSummaryToSheetsPayload(summary)
    expect(payload.action).toBe('append_dashboard')
    expect(payload.sheets.map(sheet => sheet.name)).toEqual([
      'Ringkasan',
      'Penjualan 7 Hari',
      'Produk Terlaris',
      'Stok Menipis',
    ])

    const tsv = dashboardSummaryToTsv(summary)
    expect(tsv).toContain('Ringkasan')
    expect(tsv).toContain('Kopi')
    expect(tsv).toContain('Teh')
  })

  it('normalizes production integration settings safely', () => {
    const settings = normalizeIndustrySettings({
      aiProvider: 'openrouter',
      aiEnabled: 'true',
      backupRetentionDays: 999,
      googleSheetsEnabled: 1,
    })
    expect(settings.aiProvider).toBe('openrouter')
    expect(settings.aiEnabled).toBe(true)
    expect(settings.googleSheetsEnabled).toBe(true)
    expect(settings.backupRetentionDays).toBe(365)
  })
})
