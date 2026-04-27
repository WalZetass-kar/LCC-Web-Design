import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export class ExportService {
  // Export to Excel
  static exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
    try {
      const exportDir = path.join(process.cwd(), 'exports')
      
      // Create exports directory if not exists
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
      }

      // Create workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data)

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fullFilename = `${filename}_${timestamp}.xlsx`
      const filepath = path.join(exportDir, fullFilename)

      // Write file
      XLSX.writeFile(wb, filepath)

      return {
        success: true,
        message: 'Export berhasil',
        data: { filepath, filename: fullFilename },
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
    orientation: 'portrait' | 'landscape' = 'portrait'
  ) {
    try {
      const exportDir = path.join(process.cwd(), 'exports')
      
      // Create exports directory if not exists
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
      }

      // Create PDF
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      })

      // Add title
      doc.setFontSize(16)
      doc.text(title, 14, 15)

      // Add date
      doc.setFontSize(10)
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22)

      // Add table
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
      })

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fullFilename = `${filename}_${timestamp}.pdf`
      const filepath = path.join(exportDir, fullFilename)

      // Save file
      doc.save(filepath)

      return {
        success: true,
        message: 'Export berhasil',
        data: { filepath, filename: fullFilename },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gagal export ke PDF: ' + (error as Error).message,
      }
    }
  }

  // Export Laporan Penjualan to Excel
  static exportLaporanPenjualanExcel(data: any[]) {
    const formatted = data.map((item) => ({
      'Kode Transaksi': item.kd_tansaksi_jual,
      'Tanggal': new Date(item.tgl_wkt_transaksi).toLocaleString('id-ID'),
      'Kasir': item.username_transaksi,
      'Total Qty': item.total_qty,
      'Subtotal': item.sub_total,
      'Pajak': item.pajak,
      'Total Bayar': item.yang_dibayar,
      'Pembayaran': item.jenis_pembayaran,
    }))

    return this.exportToExcel(formatted, 'laporan_penjualan', 'Penjualan')
  }

  // Export Laporan Penjualan to PDF
  static exportLaporanPenjualanPDF(data: any[]) {
    const headers = ['Kode', 'Tanggal', 'Kasir', 'Qty', 'Subtotal', 'Pajak', 'Total', 'Pembayaran']
    
    const body = data.map((item) => [
      item.kd_tansaksi_jual,
      new Date(item.tgl_wkt_transaksi).toLocaleDateString('id-ID'),
      item.username_transaksi,
      item.total_qty,
      item.sub_total?.toLocaleString('id-ID'),
      item.pajak?.toLocaleString('id-ID'),
      item.yang_dibayar?.toLocaleString('id-ID'),
      item.jenis_pembayaran,
    ])

    return this.exportToPDF('Laporan Penjualan', headers, body, 'laporan_penjualan', 'landscape')
  }

  // Export Laporan Stok to Excel
  static exportLaporanStokExcel(data: any[]) {
    const formatted = data.map((item) => ({
      'Kode Barang': item.kd_barang,
      'Nama Barang': item.nama_barang,
      'Stok': item.stok,
      'Stok Minimum': item.stok_minimum,
      'Status': (item.stok || 0) <= (item.stok_minimum || 0) ? 'MENIPIS' : 'AMAN',
    }))

    return this.exportToExcel(formatted, 'laporan_stok', 'Stok')
  }

  // Export Laporan Stok to PDF
  static exportLaporanStokPDF(data: any[]) {
    const headers = ['Kode', 'Nama Barang', 'Stok', 'Stok Min', 'Status']
    
    const body = data.map((item) => [
      item.kd_barang,
      item.nama_barang,
      item.stok,
      item.stok_minimum,
      (item.stok || 0) <= (item.stok_minimum || 0) ? 'MENIPIS' : 'AMAN',
    ])

    return this.exportToPDF('Laporan Stok Barang', headers, body, 'laporan_stok')
  }
}
