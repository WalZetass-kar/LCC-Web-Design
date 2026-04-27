import type { IpcMain } from 'electron'
import { BarangController } from '../backend/controllers/BarangController.js'
import { KategoriController } from '../backend/controllers/KategoriController.js'
import { SatuanController } from '../backend/controllers/SatuanController.js'
import { PenjualanController } from '../backend/controllers/PenjualanController.js'
import { DashboardController } from '../backend/controllers/DashboardController.js'
import { IdentitasController } from '../backend/controllers/IdentitasController.js'
import { AuthController } from '../backend/controllers/AuthController.js'
import { SupplierController } from '../backend/controllers/SupplierController.js'
import { UserController } from '../backend/controllers/UserController.js'
import { CustomerController } from '../backend/controllers/CustomerController.js'
import { NotifikasiController } from '../backend/controllers/NotifikasiController.js'
import { KasController } from '../backend/controllers/KasController.js'
import { PembelianController } from '../backend/controllers/PembelianController.js'
import { BackupController } from '../backend/controllers/BackupController.js'
import { LaporanController } from '../backend/controllers/LaporanController.js'
import { ActivityLogController } from '../backend/controllers/ActivityLogController.js'
import { ExportController } from '../backend/controllers/ExportController.js'
import { SchedulerService } from '../backend/services/scheduler.js'

export function registerIpcHandlers(ipcMain: IpcMain) {
  // Auth
  ipcMain.handle('auth:login', (_e, username: string, password: string) => AuthController.login(username, password))
  ipcMain.handle('auth:checkIdentitas', () => AuthController.checkIdentitas())
  
  // Barang (Produk)
  ipcMain.handle('barang:getAll', () => BarangController.getAll())
  ipcMain.handle('barang:search', (_e, q: string) => BarangController.search(q))
  ipcMain.handle('barang:create', (_e, data) => BarangController.create(data))
  ipcMain.handle('barang:update', (_e, kd: string, data) => BarangController.update(kd, data))
  ipcMain.handle('barang:delete', (_e, kd: string) => BarangController.delete(kd))

  // Kategori
  ipcMain.handle('kategori:getAll', () => KategoriController.getAll())
  ipcMain.handle('kategori:create', (_e, data) => KategoriController.create(data))
  ipcMain.handle('kategori:update', (_e, id: number, data) => KategoriController.update(id, data))
  ipcMain.handle('kategori:delete', (_e, id: number) => KategoriController.delete(id))

  // Satuan
  ipcMain.handle('satuan:getAll', () => SatuanController.getAll())

  // Penjualan (Transaksi)
  ipcMain.handle('penjualan:getAll', () => PenjualanController.getAll())
  ipcMain.handle('penjualan:getDetail', (_e, kd: string) => PenjualanController.getDetail(kd))
  ipcMain.handle('penjualan:create', (_e, data) => PenjualanController.create(data))

  // Dashboard
  ipcMain.handle('dashboard:getSummary', () => DashboardController.getSummary())

  // Identitas Toko
  ipcMain.handle('identitas:get', () => IdentitasController.get())
  ipcMain.handle('identitas:save', (_e, data) => IdentitasController.save(data))

  // Supplier
  ipcMain.handle('supplier:getAll', () => SupplierController.getAll())
  ipcMain.handle('supplier:getById', (_e, kd: string) => SupplierController.getById(kd))
  ipcMain.handle('supplier:create', (_e, data) => SupplierController.create(data))
  ipcMain.handle('supplier:update', (_e, kd: string, data) => SupplierController.update(kd, data))
  ipcMain.handle('supplier:delete', (_e, kd: string) => SupplierController.delete(kd))

  // User Management
  ipcMain.handle('user:getAll', () => UserController.getAll())
  ipcMain.handle('user:create', (_e, data) => UserController.create(data))
  ipcMain.handle('user:update', (_e, username: string, data) => UserController.update(username, data))
  ipcMain.handle('user:changePassword', (_e, username: string, oldPass: string, newPass: string) => 
    UserController.changePassword(username, oldPass, newPass))
  ipcMain.handle('user:resetPassword', (_e, username: string, newPass: string) => 
    UserController.resetPassword(username, newPass))
  ipcMain.handle('user:delete', (_e, username: string) => UserController.delete(username))
  ipcMain.handle('user:toggleStatus', (_e, username: string) => UserController.toggleStatus(username))

  // Customer Management
  ipcMain.handle('customer:getAll', () => CustomerController.getAll())
  ipcMain.handle('customer:getById', (_e, kd: string) => CustomerController.getById(kd))
  ipcMain.handle('customer:search', (_e, query: string) => CustomerController.search(query))
  ipcMain.handle('customer:create', (_e, data) => CustomerController.create(data))
  ipcMain.handle('customer:update', (_e, kd: string, data) => CustomerController.update(kd, data))
  ipcMain.handle('customer:delete', (_e, kd: string) => CustomerController.delete(kd))
  ipcMain.handle('customer:toggleStatus', (_e, kd: string) => CustomerController.toggleStatus(kd))
  ipcMain.handle('customer:addPoin', (_e, kd: string, poin: number) => CustomerController.addPoin(kd, poin))
  ipcMain.handle('customer:getBirthdayToday', () => CustomerController.getBirthdayToday())

  // Notifikasi
  ipcMain.handle('notifikasi:getAll', (_e, username?: string) => NotifikasiController.getAll(username))
  ipcMain.handle('notifikasi:getUnread', (_e, username?: string) => NotifikasiController.getUnread(username))
  ipcMain.handle('notifikasi:getUnreadCount', (_e, username?: string) => NotifikasiController.getUnreadCount(username))
  ipcMain.handle('notifikasi:create', (_e, data) => NotifikasiController.create(data))
  ipcMain.handle('notifikasi:markAsRead', (_e, kd: number) => NotifikasiController.markAsRead(kd))
  ipcMain.handle('notifikasi:markAllAsRead', (_e, username?: string) => NotifikasiController.markAllAsRead(username))
  ipcMain.handle('notifikasi:delete', (_e, kd: number) => NotifikasiController.delete(kd))
  ipcMain.handle('notifikasi:deleteAll', (_e, username?: string) => NotifikasiController.deleteAll(username))
  ipcMain.handle('notifikasi:checkStokMinimum', () => NotifikasiController.checkStokMinimum())
  ipcMain.handle('notifikasi:checkExpiredProducts', () => NotifikasiController.checkExpiredProducts())

  // Kas Management
  ipcMain.handle('kas:getActiveKas', (_e, username: string) => KasController.getActiveKas(username))
  ipcMain.handle('kas:getAllKas', () => KasController.getAllKas())
  ipcMain.handle('kas:getKasById', (_e, kd: string) => KasController.getKasById(kd))
  ipcMain.handle('kas:bukaKas', (_e, username: string, modal: number, catatan?: string) => 
    KasController.bukaKas(username, modal, catatan))
  ipcMain.handle('kas:tutupKas', (_e, kd: string, saldo: number, catatan?: string) => 
    KasController.tutupKas(kd, saldo, catatan))
  ipcMain.handle('kas:getTransaksi', (_e, kd: string) => KasController.getTransaksiByKas(kd))
  ipcMain.handle('kas:addPengeluaran', (_e, kd: string, jumlah: number, keterangan: string, username: string) => 
    KasController.addPengeluaran(kd, jumlah, keterangan, username))
  ipcMain.handle('kas:addPemasukan', (_e, kd: string, jumlah: number, keterangan: string, username: string) => 
    KasController.addPemasukan(kd, jumlah, keterangan, username))
  ipcMain.handle('kas:deleteTransaksi', (_e, kd: number) => KasController.deleteTransaksi(kd))
  ipcMain.handle('kas:getLaporan', (_e, startDate: string, endDate: string) => 
    KasController.getLaporanKas(startDate, endDate))

  // Pembelian
  ipcMain.handle('pembelian:getAll', () => PembelianController.getAll())
  ipcMain.handle('pembelian:getById', (_e, kd: string) => PembelianController.getById(kd))
  ipcMain.handle('pembelian:create', (_e, data) => PembelianController.create(data))
  ipcMain.handle('pembelian:updateStatus', (_e, kd: string, bayar: number) => 
    PembelianController.updateStatus(kd, bayar))
  ipcMain.handle('pembelian:delete', (_e, kd: string) => PembelianController.delete(kd))
  ipcMain.handle('pembelian:getLaporan', (_e, startDate: string, endDate: string) => 
    PembelianController.getLaporanPembelian(startDate, endDate))

  // Backup & Restore
  ipcMain.handle('backup:getAll', () => BackupController.getAll())
  ipcMain.handle('backup:create', (_e, username: string, keterangan?: string) => 
    BackupController.create(username, keterangan))
  ipcMain.handle('backup:restore', (_e, kd: number) => BackupController.restore(kd))
  ipcMain.handle('backup:delete', (_e, kd: number) => BackupController.delete(kd))
  ipcMain.handle('backup:download', (_e, kd: number) => BackupController.download(kd))

  // Laporan
  ipcMain.handle('laporan:penjualan', (_e, startDate: string, endDate: string) => 
    LaporanController.getLaporanPenjualan(startDate, endDate))
  ipcMain.handle('laporan:labaRugi', (_e, startDate: string, endDate: string) => 
    LaporanController.getLaporanLabaRugi(startDate, endDate))
  ipcMain.handle('laporan:produkTerlaris', (_e, startDate: string, endDate: string, limit?: number) => 
    LaporanController.getLaporanProdukTerlaris(startDate, endDate, limit))
  ipcMain.handle('laporan:stok', () => LaporanController.getLaporanStok())
  ipcMain.handle('laporan:kas', (_e, startDate: string, endDate: string) => 
    LaporanController.getLaporanKas(startDate, endDate))
  ipcMain.handle('laporan:customer', () => LaporanController.getLaporanCustomer())

  // Activity Log
  ipcMain.handle('activityLog:getAll', () => ActivityLogController.getAll())
  ipcMain.handle('activityLog:getByUsername', (_e, username: string) => 
    ActivityLogController.getByUsername(username))
  ipcMain.handle('activityLog:getByModul', (_e, modul: string) => 
    ActivityLogController.getByModul(modul))
  ipcMain.handle('activityLog:search', (_e, filters) => ActivityLogController.search(filters))
  ipcMain.handle('activityLog:log', (_e, username: string, aktivitas: string, modul: string, detail?: string) => 
    ActivityLogController.log(username, aktivitas, modul, detail))
  ipcMain.handle('activityLog:delete', (_e, kd: number) => ActivityLogController.delete(kd))
  ipcMain.handle('activityLog:deleteOldLogs', (_e, days?: number) => 
    ActivityLogController.deleteOldLogs(days))

  // Export
  ipcMain.handle('export:penjualanExcel', (_e, startDate: string, endDate: string) => 
    ExportController.exportPenjualanExcel(startDate, endDate))
  ipcMain.handle('export:penjualanPDF', (_e, startDate: string, endDate: string) => 
    ExportController.exportPenjualanPDF(startDate, endDate))
  ipcMain.handle('export:stokExcel', () => ExportController.exportStokExcel())
  ipcMain.handle('export:stokPDF', () => ExportController.exportStokPDF())
  ipcMain.handle('export:toExcel', (_e, data: any[], filename: string, sheetName?: string) => 
    ExportController.exportToExcel(data, filename, sheetName))
  ipcMain.handle('export:toPDF', (_e, title: string, headers: string[], data: any[][], filename: string, orientation?: 'portrait' | 'landscape') => 
    ExportController.exportToPDF(title, headers, data, filename, orientation))

  // Scheduler Manual Triggers
  ipcMain.handle('scheduler:runStokCheck', () => SchedulerService.runStokCheck())
  ipcMain.handle('scheduler:runExpiredCheck', () => SchedulerService.runExpiredCheck())
  ipcMain.handle('scheduler:runBackup', (_e, username: string) => SchedulerService.runBackup(username))
  ipcMain.handle('scheduler:runCleanLogs', (_e, days?: number) => SchedulerService.runCleanLogs(days))
}
