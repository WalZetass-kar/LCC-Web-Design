import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { jsPDF } = require('jspdf')
const autoTable = require('jspdf-autotable').default
import ExcelJS from 'exceljs'

export class ExportService {
  // Export to Excel
  static exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1', customPath?: string) {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data)

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      let filepath: string
      if (customPath) {
        // Use custom path from dialog
        filepath = customPath
      } else {
        // Default: save to exports folder
        const exportDir = path.join(process.cwd(), 'exports')
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fullFilename = `${filename}_${timestamp}.xlsx`
        filepath = path.join(exportDir, fullFilename)
      }

      // Write file
      XLSX.writeFile(wb, filepath)

      return {
        success: true,
        message: 'Export berhasil disimpan',
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

  // Export Laporan Penjualan to Excel with Chart
  static async exportLaporanPenjualanExcel(data: any[], customPath?: string) {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Penjualan')

      // Add headers with styling
      worksheet.columns = [
        { header: 'Kode Transaksi', key: 'kode', width: 15 },
        { header: 'Tanggal', key: 'tanggal', width: 20 },
        { header: 'Kasir', key: 'kasir', width: 15 },
        { header: 'Total Qty', key: 'qty', width: 12 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'Pajak', key: 'pajak', width: 12 },
        { header: 'Total Bayar', key: 'total', width: 15 },
        { header: 'Pembayaran', key: 'pembayaran', width: 15 },
      ]

      // Style header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      }

      // Add data
      data.forEach((item) => {
        worksheet.addRow({
          kode: item.kd_tansaksi_jual,
          tanggal: new Date(item.tgl_wkt_transaksi).toLocaleString('id-ID'),
          kasir: item.username_transaksi,
          qty: item.total_qty,
          subtotal: item.sub_total,
          pajak: item.pajak,
          total: item.yang_dibayar,
          pembayaran: item.jenis_pembayaran,
        })
      })

      // Add summary chart sheet
      const chartSheet = workbook.addWorksheet('Grafik')
      
      // Group by date for chart
      const dailySales: { [key: string]: number } = {}
      data.forEach(item => {
        const date = new Date(item.tgl_wkt_transaksi).toLocaleDateString('id-ID')
        dailySales[date] = (dailySales[date] || 0) + (item.yang_dibayar || 0)
      })

      // Add chart data
      chartSheet.addRow(['Tanggal', 'Total Penjualan'])
      Object.entries(dailySales).forEach(([date, total]) => {
        chartSheet.addRow([date, total])
      })

      // Style chart sheet
      chartSheet.getRow(1).font = { bold: true }
      chartSheet.columns = [
        { width: 20 },
        { width: 20 }
      ]

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
        filepath = path.join(exportDir, `laporan_penjualan_${timestamp}.xlsx`)
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

  // Export Laporan Penjualan to PDF
  static exportLaporanPenjualanPDF(data: any[], customPath?: string) {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Header background gradient effect
      doc.setFillColor(79, 70, 229)
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setFillColor(99, 102, 241)
      doc.rect(0, 30, pageWidth, 10, 'F')

      // Logo circle
      doc.setFillColor(255, 255, 255)
      doc.circle(20, 20, 10, 'F')
      doc.setFontSize(14)
      doc.setTextColor(79, 70, 229)
      doc.text('💰', 16, 23)

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('LAPORAN PENJUALAN', 38, 18)

      // Subtitle
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('MediaSoft POS by Zetass', 38, 25)

      // Date info box
      const now = new Date()
      doc.setFontSize(9)
      doc.text(`Dicetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`, 38, 32)

      // Summary box
      const totalPenjualan = data.reduce((sum, item) => sum + (item.yang_dibayar || 0), 0)
      const totalTransaksi = data.length
      
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(pageWidth - 80, 8, 70, 24, 3, 3, 'F')
      doc.setTextColor(79, 70, 229)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('RINGKASAN', pageWidth - 75, 14)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(`Total Transaksi: ${totalTransaksi}`, pageWidth - 75, 19)
      doc.text(`Total Penjualan: Rp ${totalPenjualan.toLocaleString('id-ID')}`, pageWidth - 75, 24)
      doc.text(`Rata-rata: Rp ${Math.round(totalPenjualan/totalTransaksi).toLocaleString('id-ID')}`, pageWidth - 75, 29)

      doc.setTextColor(0, 0, 0)

      // Table
      const headers = ['No', 'Kode', 'Tanggal', 'Kasir', 'Qty', 'Subtotal', 'Pajak', 'Total', 'Pembayaran']
      const body = data.map((item, idx) => [
        idx + 1,
        item.kd_tansaksi_jual,
        new Date(item.tgl_wkt_transaksi).toLocaleDateString('id-ID'),
        item.username_transaksi,
        item.total_qty,
        `Rp ${(item.sub_total || 0).toLocaleString('id-ID')}`,
        `Rp ${(item.pajak || 0).toLocaleString('id-ID')}`,
        `Rp ${(item.yang_dibayar || 0).toLocaleString('id-ID')}`,
        item.jenis_pembayaran,
      ])

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 45,
        styles: { 
          fontSize: 7,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 10, right: 10 },
      })

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || 45
      doc.setDrawColor(79, 70, 229)
      doc.setLineWidth(0.5)
      doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15)
      
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Developer by Zetass', 10, pageHeight - 8)
      doc.text('www.zetass.com', pageWidth / 2, pageHeight - 8, { align: 'center' })
      doc.text(`Halaman 1`, pageWidth - 10, pageHeight - 8, { align: 'right' })

      let filepath: string
      if (customPath) {
        filepath = customPath
      } else {
        const exportDir = path.join(process.cwd(), 'exports')
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        filepath = path.join(exportDir, `laporan_penjualan_${timestamp}.pdf`)
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
