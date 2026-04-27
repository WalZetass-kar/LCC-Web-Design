import { ExportService } from '../services/export.js'
import { LaporanController } from './LaporanController.js'

export class ExportController {
  // Export Laporan Penjualan
  static async exportPenjualanExcel(startDate: string, endDate: string) {
    try {
      const laporan = LaporanController.getLaporanPenjualan(startDate, endDate)
      if (!laporan.success || !laporan.data) {
        return { success: false, message: 'Gagal mengambil data laporan' }
      }

      return ExportService.exportLaporanPenjualanExcel(laporan.data.transaksi)
    } catch (error) {
      return { success: false, message: 'Gagal export: ' + (error as Error).message }
    }
  }

  static async exportPenjualanPDF(startDate: string, endDate: string) {
    try {
      const laporan = LaporanController.getLaporanPenjualan(startDate, endDate)
      if (!laporan.success || !laporan.data) {
        return { success: false, message: 'Gagal mengambil data laporan' }
      }

      return ExportService.exportLaporanPenjualanPDF(laporan.data.transaksi)
    } catch (error) {
      return { success: false, message: 'Gagal export: ' + (error as Error).message }
    }
  }

  // Export Laporan Stok
  static async exportStokExcel() {
    try {
      const laporan = LaporanController.getLaporanStok()
      if (!laporan.success || !laporan.data) {
        return { success: false, message: 'Gagal mengambil data laporan' }
      }

      return ExportService.exportLaporanStokExcel(laporan.data.all)
    } catch (error) {
      return { success: false, message: 'Gagal export: ' + (error as Error).message }
    }
  }

  static async exportStokPDF() {
    try {
      const laporan = LaporanController.getLaporanStok()
      if (!laporan.success || !laporan.data) {
        return { success: false, message: 'Gagal mengambil data laporan' }
      }

      return ExportService.exportLaporanStokPDF(laporan.data.all)
    } catch (error) {
      return { success: false, message: 'Gagal export: ' + (error as Error).message }
    }
  }

  // Generic export
  static async exportToExcel(data: any[], filename: string, sheetName?: string) {
    try {
      return ExportService.exportToExcel(data, filename, sheetName)
    } catch (error) {
      return { success: false, message: 'Gagal export: ' + (error as Error).message }
    }
  }

  static async exportToPDF(
    title: string,
    headers: string[],
    data: any[][],
    filename: string,
    orientation?: 'portrait' | 'landscape'
  ) {
    try {
      return ExportService.exportToPDF(title, headers, data, filename, orientation)
    } catch (error) {
      return { success: false, message: 'Gagal export: ' + (error as Error).message }
    }
  }
}
