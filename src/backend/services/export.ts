import * as fs from 'fs'
import * as path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { jsPDF } = require('jspdf')
const autoTable = require('jspdf-autotable').default
import ExcelJS from 'exceljs'

interface SalesExportContext {
  startDate?: string
  endDate?: string
}

interface DailySalesRow {
  key: string
  label: string
  total: number
  transaksi: number
  qty: number
  pajak: number
}

interface PaymentSalesRow {
  method: string
  total: number
  transaksi: number
}

const BRAND = {
  primary: 'FFDB2777',
  primaryDark: 'FFBE185D',
  pinkSoft: 'FFFCE7F3',
  slateText: 'FF334155',
  slateMuted: 'FF64748B',
  slateSoft: 'FFF8FAFC',
  border: 'FFE2E8F0',
  green: 'FF059669',
  greenSoft: 'FFD1FAE5',
  amber: 'FFD97706',
  amberSoft: 'FFFEF3C7',
  red: 'FFDC2626',
  redSoft: 'FFFEE2E2',
  blue: 'FF2563EB',
  blueSoft: 'FFDBEAFE',
}

function asNumber(value: unknown) {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function formatIdr(value: unknown) {
  return `Rp ${Math.round(asNumber(value)).toLocaleString('id-ID')}`
}

function safeDate(value: unknown) {
  const date = new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? null : date
}

function salesDateKey(value: unknown) {
  const raw = String(value ?? '')
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const date = safeDate(value)
  return date ? date.toISOString().slice(0, 10) : '-'
}

function formatShortDate(value: unknown) {
  const key = salesDateKey(value)
  if (key === '-') return '-'
  const date = new Date(`${key}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? key
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function formatLongDate(value: unknown) {
  const key = salesDateKey(value)
  if (key === '-') return '-'
  const date = new Date(`${key}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? key
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDateTime(value: unknown) {
  const date = safeDate(value)
  return date
    ? date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-'
}

function salesPeriodLabel(data: any[], context?: SalesExportContext) {
  if (context?.startDate && context?.endDate) {
    return `${formatLongDate(context.startDate)} - ${formatLongDate(context.endDate)}`
  }
  const keys = data.map(item => salesDateKey(item.tgl_wkt_transaksi)).filter(key => key !== '-').sort()
  if (!keys.length) return 'Semua periode'
  return `${formatLongDate(keys[0])} - ${formatLongDate(keys[keys.length - 1])}`
}

function salesAnalytics(data: any[]) {
  const dailyMap = new Map<string, DailySalesRow>()
  const paymentMap = new Map<string, PaymentSalesRow>()

  for (const item of data) {
    const key = salesDateKey(item.tgl_wkt_transaksi)
    const total = asNumber(item.yang_dibayar)
    const qty = asNumber(item.total_qty)
    const pajak = asNumber(item.pajak)
    const daily = dailyMap.get(key) ?? {
      key,
      label: formatShortDate(key),
      total: 0,
      transaksi: 0,
      qty: 0,
      pajak: 0,
    }
    daily.total += total
    daily.transaksi += 1
    daily.qty += qty
    daily.pajak += pajak
    dailyMap.set(key, daily)

    const method = String(item.jenis_pembayaran || 'LAINNYA').toUpperCase()
    const payment = paymentMap.get(method) ?? { method, total: 0, transaksi: 0 }
    payment.total += total
    payment.transaksi += 1
    paymentMap.set(method, payment)
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.key.localeCompare(b.key))
  const payments = Array.from(paymentMap.values()).sort((a, b) => b.total - a.total)
  const totalSales = data.reduce((sum, item) => sum + asNumber(item.yang_dibayar), 0)
  const totalSubtotal = data.reduce((sum, item) => sum + asNumber(item.sub_total), 0)
  const totalTax = data.reduce((sum, item) => sum + asNumber(item.pajak), 0)
  const totalQty = data.reduce((sum, item) => sum + asNumber(item.total_qty), 0)
  const avgTransaction = data.length ? totalSales / data.length : 0
  const bestDay = daily.length ? daily.reduce((best, row) => row.total > best.total ? row : best, daily[0]) : null
  const quietDay = daily.length ? daily.reduce((low, row) => row.total < low.total ? row : low, daily[0]) : null
  const maxDaily = daily.reduce((max, row) => Math.max(max, row.total), 0)
  const maxPayment = payments.reduce((max, row) => Math.max(max, row.total), 0)

  return {
    daily,
    payments,
    totalSales,
    totalSubtotal,
    totalTax,
    totalQty,
    avgTransaction,
    bestDay,
    quietDay,
    maxDaily,
    maxPayment,
  }
}

function exportPath(defaultName: string, customPath?: string) {
  if (customPath) return customPath
  const exportDir = path.join(process.cwd(), 'exports')
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })
  return path.join(exportDir, defaultName)
}

function thinBorder(color = BRAND.border) {
  return {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  } as Partial<ExcelJS.Borders>
}

function fillCell(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function styleHeaderRow(row: ExcelJS.Row, fill = BRAND.primary) {
  row.height = 24
  row.eachCell(cell => {
    fillCell(cell, fill)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = thinBorder(BRAND.primaryDark)
  })
}

function addExcelTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: string) {
  sheet.mergeCells(`A1:${lastColumn}1`)
  sheet.mergeCells(`A2:${lastColumn}2`)
  const titleCell = sheet.getCell('A1')
  titleCell.value = title
  titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  fillCell(titleCell, BRAND.primary)
  sheet.getRow(1).height = 30

  const subtitleCell = sheet.getCell('A2')
  subtitleCell.value = subtitle
  subtitleCell.font = { size: 10, color: { argb: 'FFFFFFFF' } }
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  fillCell(subtitleCell, BRAND.primaryDark)
  sheet.getRow(2).height = 22
}

function addKpi(sheet: ExcelJS.Worksheet, row: number, col: number, label: string, value: string | number, color: string) {
  sheet.mergeCells(row, col, row, col + 1)
  sheet.mergeCells(row + 1, col, row + 1, col + 1)
  const labelCell = sheet.getCell(row, col)
  const valueCell = sheet.getCell(row + 1, col)
  labelCell.value = label
  valueCell.value = value
  labelCell.font = { size: 9, bold: true, color: { argb: BRAND.slateMuted } }
  valueCell.font = { size: 14, bold: true, color: { argb: color } }
  labelCell.alignment = { vertical: 'bottom', horizontal: 'center' }
  valueCell.alignment = { vertical: 'top', horizontal: 'center' }
  ;[labelCell, valueCell].forEach(cell => {
    fillCell(cell, BRAND.slateSoft)
    cell.border = thinBorder()
  })
}

function asciiBar(value: number, max: number, width = 38) {
  if (max <= 0 || value <= 0) return ''
  return '#'.repeat(Math.max(1, Math.round((value / max) * width)))
}

function excelDataBarRule(priority: number) {
  return {
    type: 'dataBar',
    priority,
    showValue: false,
    minLength: 0,
    maxLength: 100,
    gradient: false,
    cfvo: [{ type: 'min' }, { type: 'max' }],
  } as ExcelJS.ConditionalFormattingRule
}

export class ExportService {
  // Export to Excel
  static async exportToExcel(data: any[], filename: string, sheetName: string = 'Data', customPath?: string) {
    try {
      const rows = Array.isArray(data) ? data : []
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'MediaSoft POS Zetass'
      workbook.created = new Date()

      const safeSheetName = String(sheetName || 'Data').slice(0, 31)
      const worksheet = workbook.addWorksheet(safeSheetName, {
        views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
        properties: { tabColor: { argb: BRAND.primary } },
      })
      const keys = rows.length > 0
        ? (Array.isArray(rows[0]) ? rows[0].map((_: unknown, index: number) => `Kolom ${index + 1}`) : Object.keys(rows[0]))
        : ['Keterangan', 'Nilai']

      worksheet.columns = keys.map(key => ({ width: Math.min(Math.max(String(key).length + 6, 14), 32) }))
      addExcelTitle(worksheet, filename.replace(/_/g, ' ').toUpperCase(), `Dicetak ${new Date().toLocaleString('id-ID')}`, String.fromCharCode(64 + Math.min(keys.length, 26)))

      worksheet.getRow(4).values = keys.map(key => String(key).replace(/_/g, ' ').toUpperCase())
      styleHeaderRow(worksheet.getRow(4), BRAND.primary)

      rows.forEach((item, index) => {
        const values = Array.isArray(item) ? item : keys.map(key => item[key])
        const row = worksheet.addRow(values)
        row.eachCell((cell, colNumber) => {
          const key = String(keys[colNumber - 1] ?? '').toLowerCase()
          if (typeof cell.value === 'number' && /(total|penjualan|belanja|nilai|modal|laba|amount|harga|bayar)/i.test(key)) {
            cell.numFmt = '"Rp" #,##0'
          }
          cell.border = thinBorder()
          cell.alignment = { vertical: 'middle' }
        })
        if (index % 2 === 1) row.eachCell(cell => fillCell(cell, BRAND.slateSoft))
      })
      if (rows.length > 0 && keys.length > 0) {
        worksheet.autoFilter = { from: 'A4', to: `${String.fromCharCode(64 + Math.min(keys.length, 26))}${rows.length + 4}` }
      }

      const labelKey = keys.find(key => /(nama|keterangan|produk|customer|status)/i.test(String(key))) ?? keys[0]
      const numericKey = keys.find(key => rows.some(row => !Array.isArray(row) && typeof row[key] === 'number') && /(total|penjualan|belanja|nilai|modal|laba|amount|harga|qty|poin)/i.test(String(key)))
        ?? keys.find(key => rows.some(row => !Array.isArray(row) && typeof row[key] === 'number'))
      if (labelKey && numericKey && rows.length > 0 && !Array.isArray(rows[0])) {
        const chartRows = rows
          .map(row => ({ label: String(row[labelKey] ?? '-'), value: asNumber(row[numericKey]) }))
          .filter(row => row.value > 0)
          .slice(0, 20)
        const maxValue = chartRows.reduce((max, row) => Math.max(max, row.value), 0)
        if (chartRows.length > 0) {
          const chartSheet = workbook.addWorksheet('Grafik', {
            views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
            properties: { tabColor: { argb: BRAND.blue } },
          })
          chartSheet.columns = [
            { header: 'Label', key: 'label', width: 32 },
            { header: 'Nilai', key: 'value', width: 18 },
            { header: 'Grafik', key: 'grafik', width: 22 },
            { header: 'Bar Visual', key: 'bar', width: 44 },
          ]
          addExcelTitle(chartSheet, 'Grafik Ringkasan', `Berdasarkan kolom ${String(numericKey).replace(/_/g, ' ')}`, 'D')
          styleHeaderRow(chartSheet.getRow(3), BRAND.blue)
          chartRows.forEach(row => {
            const added = chartSheet.addRow({
              label: row.label,
              value: row.value,
              grafik: row.value,
              bar: asciiBar(row.value, maxValue),
            })
            added.getCell('value').numFmt = /(total|penjualan|belanja|nilai|modal|laba|amount|harga|bayar)/i.test(String(numericKey)) ? '"Rp" #,##0' : '#,##0'
            added.getCell('grafik').numFmt = added.getCell('value').numFmt
            added.getCell('bar').font = { bold: true, color: { argb: BRAND.primary } }
          })
          chartSheet.addConditionalFormatting({
            ref: `C4:C${chartRows.length + 3}`,
            rules: [excelDataBarRule(1)],
          })
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filepath = exportPath(`${filename}_${timestamp}.xlsx`, customPath)
      await workbook.xlsx.writeFile(filepath)

      return {
        success: true,
        message: 'Export berhasil disimpan dengan format laporan',
        data: { filepath, filename: path.basename(filepath) },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export ke Excel: ' + (error as Error).message,
      }
    }
  }

  // Export to PDF
  static exportToPDF(
    title: string,
    headers: string[],
    data: any[][],
    filename: string,
    orientation: 'portrait' | 'landscape' = 'portrait',
    customPath?: string
  ) {
    try {
      // Create PDF
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Header background
      doc.setFillColor(79, 70, 229) // Indigo
      doc.rect(0, 0, pageWidth, 35, 'F')

      // Logo/Icon placeholder
      doc.setFillColor(255, 255, 255)
      doc.circle(20, 17, 8, 'F')
      doc.setFontSize(12)
      doc.setTextColor(79, 70, 229)
      doc.text('⚡', 17, 20)

      // Title
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(title, 35, 15)

      // Subtitle
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('MediaSoft POS by Zetass', 35, 21)

      // Date & Time
      doc.setFontSize(9)
      const now = new Date()
      doc.text(`Tanggal: ${now.toLocaleDateString('id-ID')}`, 35, 27)
      doc.text(`Waktu: ${now.toLocaleTimeString('id-ID')}`, 35, 31)

      // Reset text color
      doc.setTextColor(0, 0, 0)

      // Add table
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 40,
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || 40
      if (pageHeight - finalY > 20) {
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text('Developer by Zetass', 14, pageHeight - 10)
        doc.text(`Halaman 1`, pageWidth - 14, pageHeight - 10, { align: 'right' })
        
        // Decorative line
        doc.setDrawColor(79, 70, 229)
        doc.setLineWidth(0.5)
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
      }

      let filepath: string
      if (customPath) {
        filepath = customPath
      } else {
        const exportDir = path.join(process.cwd(), 'exports')
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fullFilename = `${filename}_${timestamp}.pdf`
        filepath = path.join(exportDir, fullFilename)
      }

      // Save to file system using buffer
      const pdfBuffer = doc.output('arraybuffer')
      fs.writeFileSync(filepath, Buffer.from(pdfBuffer))

      return {
        success: true,
        message: 'Export berhasil disimpan',
        data: { filepath, filename: path.basename(filepath) },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export ke PDF: ' + (error as Error).message,
      }
    }
  }

  // Export Laporan Penjualan to Excel with dashboard and visual chart sheets
  static async exportLaporanPenjualanExcel(data: any[], customPath?: string, context?: SalesExportContext) {
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'MediaSoft POS Zetass'
      workbook.created = new Date()

      const period = salesPeriodLabel(data, context)
      const analytics = salesAnalytics(data)
      const generatedAt = new Date().toLocaleString('id-ID')

      const dashboard = workbook.addWorksheet('Dashboard', {
        views: [{ showGridLines: false }],
        properties: { tabColor: { argb: BRAND.primary } },
      })
      dashboard.columns = [
        { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
        { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
      ]
      addExcelTitle(dashboard, 'Laporan Penjualan', `Periode ${period} | Dicetak ${generatedAt}`, 'H')
      addKpi(dashboard, 4, 1, 'Total Omzet', formatIdr(analytics.totalSales), BRAND.primary)
      addKpi(dashboard, 4, 3, 'Transaksi', analytics.daily.reduce((sum, item) => sum + item.transaksi, 0), BRAND.blue)
      addKpi(dashboard, 4, 5, 'Rata-rata/Transaksi', formatIdr(analytics.avgTransaction), BRAND.green)
      addKpi(dashboard, 4, 7, 'Total Qty', analytics.totalQty.toLocaleString('id-ID'), BRAND.amber)
      addKpi(dashboard, 7, 1, 'Subtotal', formatIdr(analytics.totalSubtotal), BRAND.slateText)
      addKpi(dashboard, 7, 3, 'Total Pajak', formatIdr(analytics.totalTax), BRAND.amber)
      addKpi(dashboard, 7, 5, 'Hari Terbaik', analytics.bestDay ? `${analytics.bestDay.label} (${formatIdr(analytics.bestDay.total)})` : '-', BRAND.green)
      addKpi(dashboard, 7, 7, 'Metode Utama', analytics.payments[0] ? `${analytics.payments[0].method} (${formatIdr(analytics.payments[0].total)})` : '-', BRAND.blue)

      dashboard.mergeCells('A11:H11')
      dashboard.getCell('A11').value = 'Insight Penjualan'
      dashboard.getCell('A11').font = { bold: true, size: 12, color: { argb: BRAND.slateText } }
      const insights = [
        analytics.bestDay ? `Hari omzet tertinggi: ${analytics.bestDay.label} dengan ${formatIdr(analytics.bestDay.total)} dari ${analytics.bestDay.transaksi} transaksi.` : 'Belum ada transaksi pada periode ini.',
        analytics.quietDay && analytics.bestDay && analytics.quietDay.key !== analytics.bestDay.key
          ? `Hari paling sepi: ${analytics.quietDay.label} dengan ${formatIdr(analytics.quietDay.total)}.`
          : 'Periode ini hanya memiliki satu hari transaksi atau omzet harian relatif merata.',
        analytics.payments[0] ? `Metode pembayaran terbesar: ${analytics.payments[0].method}.` : 'Belum ada metode pembayaran tercatat.',
      ]
      insights.forEach((text, index) => {
        dashboard.mergeCells(12 + index, 1, 12 + index, 8)
        const cell = dashboard.getCell(12 + index, 1)
        cell.value = text
        cell.font = { size: 10, color: { argb: BRAND.slateText } }
        cell.alignment = { wrapText: true, vertical: 'middle' }
        fillCell(cell, index === 0 ? BRAND.pinkSoft : BRAND.slateSoft)
        cell.border = thinBorder()
        dashboard.getRow(12 + index).height = 24
      })

      const chartSheet = workbook.addWorksheet('Grafik Penjualan', {
        views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
        properties: { tabColor: { argb: BRAND.blue } },
      })
      chartSheet.columns = [
        { header: 'Tanggal', key: 'tanggal', width: 16 },
        { header: 'Transaksi', key: 'transaksi', width: 12 },
        { header: 'Qty', key: 'qty', width: 10 },
        { header: 'Omzet', key: 'omzet', width: 18 },
        { header: 'Grafik Omzet', key: 'grafik', width: 22 },
        { header: 'Bar Visual', key: 'bar', width: 44 },
        { header: 'Rata-rata', key: 'rata', width: 18 },
      ]
      addExcelTitle(chartSheet, 'Grafik Tren Penjualan Harian', `Periode ${period}`, 'G')
      styleHeaderRow(chartSheet.getRow(3), BRAND.blue)
      analytics.daily.forEach(row => {
        const added = chartSheet.addRow({
          tanggal: row.label,
          transaksi: row.transaksi,
          qty: row.qty,
          omzet: row.total,
          grafik: row.total,
          bar: asciiBar(row.total, analytics.maxDaily),
          rata: row.transaksi ? row.total / row.transaksi : 0,
        })
        added.getCell('omzet').numFmt = '"Rp" #,##0'
        added.getCell('grafik').numFmt = '"Rp" #,##0'
        added.getCell('rata').numFmt = '"Rp" #,##0'
        added.getCell('bar').font = { color: { argb: BRAND.primary }, bold: true }
      })
      if (analytics.daily.length) {
        chartSheet.addConditionalFormatting({
          ref: `E4:E${analytics.daily.length + 3}`,
          rules: [excelDataBarRule(1)],
        })
      }
      chartSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) {
          row.eachCell(cell => {
            cell.border = thinBorder()
            cell.alignment = { vertical: 'middle' }
          })
        }
      })

      const paymentSheet = workbook.addWorksheet('Metode Pembayaran', {
        views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
        properties: { tabColor: { argb: BRAND.green } },
      })
      paymentSheet.columns = [
        { header: 'Metode', key: 'method', width: 18 },
        { header: 'Transaksi', key: 'transaksi', width: 12 },
        { header: 'Total', key: 'total', width: 18 },
        { header: 'Kontribusi', key: 'share', width: 14 },
        { header: 'Grafik', key: 'grafik', width: 44 },
      ]
      addExcelTitle(paymentSheet, 'Ringkasan Metode Pembayaran', `Total omzet ${formatIdr(analytics.totalSales)}`, 'E')
      styleHeaderRow(paymentSheet.getRow(3), BRAND.green)
      analytics.payments.forEach(row => {
        const share = analytics.totalSales ? row.total / analytics.totalSales : 0
        const added = paymentSheet.addRow({
          method: row.method,
          transaksi: row.transaksi,
          total: row.total,
          share,
          grafik: asciiBar(row.total, analytics.maxPayment),
        })
        added.getCell('total').numFmt = '"Rp" #,##0'
        added.getCell('share').numFmt = '0.0%'
        added.getCell('grafik').font = { color: { argb: BRAND.green }, bold: true }
      })

      const detail = workbook.addWorksheet('Detail Transaksi', {
        views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
        properties: { tabColor: { argb: BRAND.primaryDark } },
      })
      detail.columns = [
        { width: 6 }, { width: 20 }, { width: 22 }, { width: 16 }, { width: 10 },
        { width: 16 }, { width: 14 }, { width: 16 }, { width: 16 },
      ]
      addExcelTitle(detail, 'Detail Transaksi Penjualan', `Periode ${period}`, 'I')
      const headers = ['No', 'Kode Transaksi', 'Tanggal', 'Kasir', 'Qty', 'Subtotal', 'Pajak', 'Total Bayar', 'Pembayaran']
      detail.getRow(4).values = headers
      styleHeaderRow(detail.getRow(4), BRAND.primary)
      data.forEach((item, index) => {
        const row = detail.addRow([
          index + 1,
          item.kd_tansaksi_jual,
          formatDateTime(item.tgl_wkt_transaksi),
          item.username_transaksi || '-',
          asNumber(item.total_qty),
          asNumber(item.sub_total),
          asNumber(item.pajak),
          asNumber(item.yang_dibayar),
          item.jenis_pembayaran || '-',
        ])
        ;[6, 7, 8].forEach(col => { row.getCell(col).numFmt = '"Rp" #,##0' })
        row.eachCell(cell => {
          cell.border = thinBorder()
          cell.alignment = { vertical: 'middle' }
        })
        if (index % 2 === 1) row.eachCell(cell => fillCell(cell, BRAND.slateSoft))
      })
      const totalRow = detail.addRow(['', '', '', 'TOTAL', analytics.totalQty, analytics.totalSubtotal, analytics.totalTax, analytics.totalSales, ''])
      totalRow.font = { bold: true, color: { argb: BRAND.slateText } }
      totalRow.eachCell(cell => {
        fillCell(cell, BRAND.pinkSoft)
        cell.border = thinBorder()
      })
      ;[6, 7, 8].forEach(col => { totalRow.getCell(col).numFmt = '"Rp" #,##0' })
      detail.autoFilter = { from: 'A4', to: `I${Math.max(4, detail.rowCount - 1)}` }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filepath = exportPath(`laporan_penjualan_${timestamp}.xlsx`, customPath)
      await workbook.xlsx.writeFile(filepath)

      return {
        success: true,
        message: 'Export berhasil disimpan dengan dashboard dan grafik',
        data: { filepath, filename: path.basename(filepath) },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export: ' + (error as Error).message,
      }
    }
  }

  // Export Laporan Penjualan to PDF
  static exportLaporanPenjualanPDF(data: any[], customPath?: string, context?: SalesExportContext) {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const period = salesPeriodLabel(data, context)
      const analytics = salesAnalytics(data)
      const printedAt = new Date().toLocaleString('id-ID')

      const drawFooter = () => {
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i += 1) {
          doc.setPage(i)
          doc.setDrawColor(219, 39, 119)
          doc.setLineWidth(0.3)
          doc.line(10, pageHeight - 14, pageWidth - 10, pageHeight - 14)
          doc.setFontSize(8)
          doc.setTextColor(100, 116, 139)
          doc.text('MediaSoft POS Zetass', 10, pageHeight - 8)
          doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 10, pageHeight - 8, { align: 'right' })
        }
      }

      doc.setFillColor(219, 39, 119)
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setFillColor(190, 24, 93)
      doc.rect(0, 24, pageWidth, 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('LAPORAN PENJUALAN', 12, 13)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Periode ${period}`, 12, 20)
      doc.text(`Dicetak ${printedAt}`, pageWidth - 12, 20, { align: 'right' })

      const cardY = 36
      const cardW = 66
      const cardGap = 6
      const cards = [
        ['Total Omzet', formatIdr(analytics.totalSales), [219, 39, 119]],
        ['Transaksi', String(data.length), [37, 99, 235]],
        ['Rata-rata', formatIdr(analytics.avgTransaction), [5, 150, 105]],
        ['Total Qty', analytics.totalQty.toLocaleString('id-ID'), [217, 119, 6]],
      ] as const
      cards.forEach((card, index) => {
        const x = 10 + index * (cardW + cardGap)
        const [r, g, b] = card[2]
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(x, cardY, cardW, 18, 2, 2, 'F')
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(x, cardY, cardW, 18, 2, 2, 'S')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 116, 139)
        doc.text(card[0], x + 4, cardY + 6)
        doc.setFontSize(11)
        doc.setTextColor(r, g, b)
        doc.text(card[1], x + 4, cardY + 13)
      })

      doc.setFillColor(252, 231, 243)
      doc.roundedRect(10, 60, pageWidth - 20, 16, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(190, 24, 93)
      doc.text('Insight', 14, 66)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      const insight = analytics.bestDay
        ? `Hari terbaik ${analytics.bestDay.label} (${formatIdr(analytics.bestDay.total)}). Metode terbesar ${analytics.payments[0]?.method ?? '-'} (${analytics.payments[0] ? formatIdr(analytics.payments[0].total) : formatIdr(0)}).`
        : 'Belum ada transaksi pada periode ini.'
      doc.text(insight, 14, 72)

      const chartY = 84
      const chartH = 32
      const chartW = 132
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      doc.text('Grafik Omzet Harian', 10, chartY - 4)
      doc.setDrawColor(226, 232, 240)
      doc.rect(10, chartY, chartW, chartH)
      const shownDaily = analytics.daily.slice(-14)
      const barGap = 2
      const barW = shownDaily.length ? Math.max(3, (chartW - 12 - ((shownDaily.length - 1) * barGap)) / shownDaily.length) : 0
      shownDaily.forEach((row, index) => {
        const height = analytics.maxDaily ? Math.max(1, (row.total / analytics.maxDaily) * (chartH - 12)) : 0
        const x = 16 + index * (barW + barGap)
        const y = chartY + chartH - 6 - height
        doc.setFillColor(219, 39, 119)
        doc.rect(x, y, barW, height, 'F')
        doc.setFontSize(5.5)
        doc.setTextColor(100, 116, 139)
        doc.text(row.label.replace(' ', ''), x + (barW / 2), chartY + chartH - 2, { align: 'center' })
      })

      const paymentX = 154
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      doc.text('Metode Pembayaran', paymentX, chartY - 4)
      doc.setDrawColor(226, 232, 240)
      doc.rect(paymentX, chartY, pageWidth - paymentX - 10, chartH)
      analytics.payments.slice(0, 4).forEach((row, index) => {
        const y = chartY + 7 + (index * 7)
        const width = analytics.maxPayment ? (row.total / analytics.maxPayment) * 82 : 0
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(51, 65, 85)
        doc.text(row.method, paymentX + 4, y)
        doc.setFillColor(37, 99, 235)
        doc.rect(paymentX + 38, y - 4, width, 4, 'F')
        doc.setTextColor(100, 116, 139)
        doc.text(formatIdr(row.total), paymentX + 124, y, { align: 'right' })
      })

      const headers = ['No', 'Kode', 'Tanggal', 'Kasir', 'Qty', 'Subtotal', 'Pajak', 'Total', 'Bayar']
      const body = data.map((item, idx) => [
        idx + 1,
        item.kd_tansaksi_jual,
        formatDateTime(item.tgl_wkt_transaksi),
        item.username_transaksi || '-',
        asNumber(item.total_qty).toLocaleString('id-ID'),
        formatIdr(item.sub_total),
        formatIdr(item.pajak),
        formatIdr(item.yang_dibayar),
        item.jenis_pembayaran || '-',
      ])

      autoTable(doc, {
        head: [headers],
        body,
        startY: 124,
        styles: {
          fontSize: 7,
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [219, 39, 119],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 9 },
          1: { cellWidth: 31 },
          2: { cellWidth: 32 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'right', cellWidth: 27 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
          8: { halign: 'center', cellWidth: 20 },
        },
        margin: { left: 10, right: 10, bottom: 20 },
      })

      drawFooter()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filepath = exportPath(`laporan_penjualan_${timestamp}.pdf`, customPath)
      const pdfBuffer = doc.output('arraybuffer')
      fs.writeFileSync(filepath, Buffer.from(pdfBuffer))

      return {
        success: true,
        message: 'Export berhasil disimpan',
        data: { filepath, filename: path.basename(filepath) },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export: ' + (error as Error).message,
      }
    }
  }

  // Export Laporan Stok to Excel with Chart
  static async exportLaporanStokExcel(data: any[], customPath?: string) {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Stok Barang')

      // Add headers
      worksheet.columns = [
        { header: 'Kode Barang', key: 'kode', width: 15 },
        { header: 'Nama Barang', key: 'nama', width: 30 },
        { header: 'Stok', key: 'stok', width: 12 },
        { header: 'Stok Minimum', key: 'min', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ]

      // Style header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      }

      // Add data with conditional formatting
      data.forEach((item) => {
        const status = (item.stok || 0) <= (item.stok_minimum || 0) ? 'MENIPIS' : 'AMAN'
        const row = worksheet.addRow({
          kode: item.kd_barang,
          nama: item.nama_barang,
          stok: item.stok,
          min: item.stok_minimum,
          status: status,
        })

        // Color code status
        if (status === 'MENIPIS') {
          row.getCell('status').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFECACA' }
          }
          row.getCell('status').font = { color: { argb: 'FFDC2626' }, bold: true }
        } else {
          row.getCell('status').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' }
          }
          row.getCell('status').font = { color: { argb: 'FF059669' }, bold: true }
        }
      })

      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Ringkasan')
      const menipis = data.filter(d => (d.stok || 0) <= (d.stok_minimum || 0)).length
      const aman = data.length - menipis

      summarySheet.addRow(['Status', 'Jumlah'])
      summarySheet.addRow(['Stok Menipis', menipis])
      summarySheet.addRow(['Stok Aman', aman])
      
      summarySheet.getRow(1).font = { bold: true }
      summarySheet.columns = [{ width: 20 }, { width: 15 }]

      // Save file
      let filepath: string
      if (customPath) {
        filepath = customPath
      } else {
        const exportDir = path.join(process.cwd(), 'exports')
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        filepath = path.join(exportDir, `laporan_stok_${timestamp}.xlsx`)
      }

      await workbook.xlsx.writeFile(filepath)

      return {
        success: true,
        message: 'Export berhasil disimpan dengan grafik',
        data: { filepath, filename: path.basename(filepath) },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export: ' + (error as Error).message,
      }
    }
  }

  // Export Laporan Stok to PDF
  static exportLaporanStokPDF(data: any[], customPath?: string) {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Header background
      doc.setFillColor(16, 185, 129) // Emerald
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setFillColor(5, 150, 105)
      doc.rect(0, 30, pageWidth, 10, 'F')

      // Logo
      doc.setFillColor(255, 255, 255)
      doc.circle(20, 20, 10, 'F')
      doc.setFontSize(14)
      doc.setTextColor(16, 185, 129)
      doc.text('📦', 16, 23)

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('LAPORAN STOK BARANG', 38, 18)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('MediaSoft POS by Zetass', 38, 25)

      const now = new Date()
      doc.setFontSize(9)
      doc.text(`Dicetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`, 38, 32)

      // Summary
      const menipis = data.filter(d => (d.stok || 0) <= (d.stok_minimum || 0)).length
      const aman = data.length - menipis
      
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(pageWidth - 70, 8, 60, 24, 3, 3, 'F')
      doc.setTextColor(16, 185, 129)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('STATUS STOK', pageWidth - 65, 14)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(220, 38, 38)
      doc.text(`⚠ Menipis: ${menipis} item`, pageWidth - 65, 19)
      doc.setTextColor(16, 185, 129)
      doc.text(`✓ Aman: ${aman} item`, pageWidth - 65, 24)
      doc.setTextColor(100, 116, 139)
      doc.text(`Total: ${data.length} item`, pageWidth - 65, 29)

      doc.setTextColor(0, 0, 0)

      // Table
      const headers = ['No', 'Kode', 'Nama Barang', 'Stok', 'Min', 'Status']
      const body = data.map((item, idx) => {
        const status = (item.stok || 0) <= (item.stok_minimum || 0) ? 'MENIPIS ⚠' : 'AMAN ✓'
        return [
          idx + 1,
          item.kd_barang,
          item.nama_barang,
          item.stok || 0,
          item.stok_minimum || 0,
          status,
        ]
      })

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 45,
        styles: { 
          fontSize: 8,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: { 
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: function(data: any) {
          if (data.section === 'body' && data.column.index === 5) {
            const cellValue = data.cell.raw as string
            if (cellValue.includes('MENIPIS')) {
              data.cell.styles.textColor = [220, 38, 38]
              data.cell.styles.fillColor = [254, 226, 226]
            } else {
              data.cell.styles.textColor = [16, 185, 129]
              data.cell.styles.fillColor = [209, 250, 229]
            }
          }
        },
        margin: { left: 14, right: 14 },
      })

      // Footer
      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.5)
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
      
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Developer by Zetass', 14, pageHeight - 8)
      doc.text('Inventory Management System', pageWidth / 2, pageHeight - 8, { align: 'center' })
      doc.text(`Halaman 1`, pageWidth - 14, pageHeight - 8, { align: 'right' })

      let filepath: string
      if (customPath) {
        filepath = customPath
      } else {
        const exportDir = path.join(process.cwd(), 'exports')
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        filepath = path.join(exportDir, `laporan_stok_${timestamp}.pdf`)
      }

      const pdfBuffer = doc.output('arraybuffer')
      fs.writeFileSync(filepath, Buffer.from(pdfBuffer))

      return {
        success: true,
        message: 'Export berhasil disimpan',
        data: { filepath, filename: path.basename(filepath) },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export: ' + (error as Error).message,
      }
    }
  }
}
