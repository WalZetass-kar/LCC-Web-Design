/**
 * ═══════════════════════════════════════════════════════════════════════
 * IPC HANDLERS — All IPC channels with DEMO GUARD protection
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * SECURITY: Every handler is wrapped with withDemoGuard().
 * Mutation channels are automatically blocked for demo users.
 * The guard checks the server-side session — NOT client data.
 */

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
import { BarcodeController } from '../backend/controllers/BarcodeController.js'
import { PaymentMethodController, TaxController, ReturnController, ShiftController, DebtController, StockOpnameController, ProductImageController } from '../backend/controllers/NewFeaturesController.js'
import { UpdateService } from '../backend/services/updateService.js'
import { ErrorLogService } from '../backend/services/errorLogService.js'
import { demoSession } from '../backend/services/demoSessionManager.js'
import { withDemoGuard, DEMO_BLOCKED_RESPONSE } from '../backend/middleware/demoGuardV2.js'
import { PlanController } from '../backend/controllers/PlanController.js'
import { TutorialController } from '../backend/controllers/TutorialController.js'
import { HppController } from '../backend/controllers/HppController.js'
import { StrukSettingsController } from '../backend/controllers/StrukSettingsController.js'
import { SystemController } from '../backend/controllers/SystemController.js'

/**
 * Helper to register an IPC handler with automatic demo guard.
 * Every channel goes through withDemoGuard which checks the server-side session.
 */
function handle(ipcMain: IpcMain, channel: string, handler: (...args: any[]) => any) {
  const guarded = withDemoGuard(channel, (_e: any, ...args: any[]) => handler(...args))
  ipcMain.handle(channel, guarded)
}

export function registerIpcHandlers(ipcMain: IpcMain) {
  // ─── AUTH (always allowed — no demo guard needed) ───────────────────
  ipcMain.handle('auth:login', async (_e, username: string, password: string) => {
    const result = await AuthController.login(username, password)
    
    // CRITICAL: Set the server-side session on successful login
    if (result.success && result.data) {
      const userData = result.data as { nama_pengguna: string; hak_akses: string }
      demoSession.setSession(userData.nama_pengguna, userData.hak_akses || 'kasir')
    }
    
    return result
  })
  
  ipcMain.handle('auth:checkIdentitas', () => AuthController.checkIdentitas())
  
  // Auth logout — clear the session
  ipcMain.handle('auth:logout', (_e, username: string) => {
    demoSession.clearSession()
    return { success: true, message: 'Logged out' }
  })

  // ─── DEMO STATUS (always allowed) ──────────────────────────────────
  ipcMain.handle('demo:getStatus', () => {
    return {
      success: true,
      data: {
        isDemo: demoSession.isDemoMode(),
        username: demoSession.getUsername(),
        role: demoSession.getRole(),
        violationCount: demoSession.getViolationCount(),
      },
    }
  })

  ipcMain.handle('demo:getViolationLog', () => {
    return {
      success: true,
      data: demoSession.getViolationLog(),
    }
  })

  // ─── BARANG (Products) ─────────────────────────────────────────────
  handle(ipcMain, 'barang:getAll', () => BarangController.getAll())
  handle(ipcMain, 'barang:search', (q: string) => BarangController.search(q))
  handle(ipcMain, 'barang:create', (data: any) => BarangController.create(data))
  handle(ipcMain, 'barang:update', (kd: string, data: any) => BarangController.update(kd, data))
  handle(ipcMain, 'barang:delete', (kd: string) => BarangController.delete(kd))

  // ─── KATEGORI ──────────────────────────────────────────────────────
  handle(ipcMain, 'kategori:getAll', () => KategoriController.getAll())
  handle(ipcMain, 'kategori:create', (data: any) => KategoriController.create(data))
  handle(ipcMain, 'kategori:update', (id: number, data: any) => KategoriController.update(id, data))
  handle(ipcMain, 'kategori:delete', (id: number) => KategoriController.delete(id))

  // ─── SATUAN ────────────────────────────────────────────────────────
  handle(ipcMain, 'satuan:getAll', () => SatuanController.getAll())
  handle(ipcMain, 'satuan:create', (data: any) => SatuanController.create(data))
  handle(ipcMain, 'satuan:update', (kd: number, data: any) => SatuanController.update(kd, data))
  handle(ipcMain, 'satuan:delete', (kd: number) => SatuanController.delete(kd))

  // ─── PENJUALAN (Transactions) ──────────────────────────────────────
  handle(ipcMain, 'penjualan:getAll', () => PenjualanController.getAll())
  handle(ipcMain, 'penjualan:getDetail', (kd: string) => PenjualanController.getDetail(kd))
  handle(ipcMain, 'penjualan:create', (data: any) => PenjualanController.create(data))

  // ─── DASHBOARD ─────────────────────────────────────────────────────
  handle(ipcMain, 'dashboard:getSummary', () => DashboardController.getSummary())

  // ─── IDENTITAS TOKO ────────────────────────────────────────────────
  handle(ipcMain, 'identitas:get', () => IdentitasController.get())
  handle(ipcMain, 'identitas:save', (data: any) => IdentitasController.save(data))

  // ─── SUPPLIER ──────────────────────────────────────────────────────
  handle(ipcMain, 'supplier:getAll', () => SupplierController.getAll())
  handle(ipcMain, 'supplier:getById', (kd: string) => SupplierController.getById(kd))
  handle(ipcMain, 'supplier:create', (data: any) => SupplierController.create(data))
  handle(ipcMain, 'supplier:update', (kd: string, data: any) => SupplierController.update(kd, data))
  handle(ipcMain, 'supplier:delete', (kd: string) => SupplierController.delete(kd))

  // ─── USER MANAGEMENT ──────────────────────────────────────────────
  handle(ipcMain, 'user:getAll', () => UserController.getAll())
  handle(ipcMain, 'user:create', (data: any) => UserController.create(data))
  handle(ipcMain, 'user:update', (username: string, data: any) => UserController.update(username, data))
  handle(ipcMain, 'user:changePassword', (username: string, oldPass: string, newPass: string) => 
    UserController.changePassword(username, oldPass, newPass))
  handle(ipcMain, 'user:resetPassword', (username: string, newPass: string, caller?: string) => 
    UserController.resetPassword(username, newPass, caller))
  handle(ipcMain, 'user:delete', (username: string, caller?: string) => UserController.delete(username, caller))
  handle(ipcMain, 'user:toggleStatus', (username: string, caller?: string) => UserController.toggleStatus(username, caller))
  handle(ipcMain, 'user:getPermissions', (username: string) => UserController.getPermissions(username))
  handle(ipcMain, 'user:savePermissions', (username: string, permissions: Record<string, boolean>) => UserController.savePermissions(username, permissions))

  // ─── CUSTOMER ──────────────────────────────────────────────────────
  handle(ipcMain, 'customer:getAll', () => CustomerController.getAll())
  handle(ipcMain, 'customer:getById', (kd: string) => CustomerController.getById(kd))
  handle(ipcMain, 'customer:search', (query: string) => CustomerController.search(query))
  handle(ipcMain, 'customer:create', (data: any) => CustomerController.create(data))
  handle(ipcMain, 'customer:update', (kd: string, data: any) => CustomerController.update(kd, data))
  handle(ipcMain, 'customer:delete', (kd: string) => CustomerController.delete(kd))
  handle(ipcMain, 'customer:toggleStatus', (kd: string) => CustomerController.toggleStatus(kd))
  handle(ipcMain, 'customer:addPoin', (kd: string, poin: number) => CustomerController.addPoin(kd, poin))
  handle(ipcMain, 'customer:getBirthdayToday', () => CustomerController.getBirthdayToday())
  handle(ipcMain, 'customer:getRiwayatPembelian', (kd: string) => CustomerController.getRiwayatPembelian(kd))

  // ─── NOTIFIKASI ────────────────────────────────────────────────────
  handle(ipcMain, 'notifikasi:getAll', (username?: string) => NotifikasiController.getAll(username))
  handle(ipcMain, 'notifikasi:getUnread', (username?: string) => NotifikasiController.getUnread(username))
  handle(ipcMain, 'notifikasi:getUnreadCount', (username?: string) => NotifikasiController.getUnreadCount(username))
  handle(ipcMain, 'notifikasi:create', (data: any) => NotifikasiController.create(data))
  handle(ipcMain, 'notifikasi:markAsRead', (kd: number) => NotifikasiController.markAsRead(kd))
  handle(ipcMain, 'notifikasi:markAllAsRead', (username?: string) => NotifikasiController.markAllAsRead(username))
  handle(ipcMain, 'notifikasi:delete', (kd: number) => NotifikasiController.delete(kd))
  handle(ipcMain, 'notifikasi:deleteAll', (username?: string) => NotifikasiController.deleteAll(username))
  handle(ipcMain, 'notifikasi:checkStokMinimum', () => NotifikasiController.checkStokMinimum())
  handle(ipcMain, 'notifikasi:checkExpiredProducts', () => NotifikasiController.checkExpiredProducts())

  // ─── KAS (Cash Drawer) ────────────────────────────────────────────
  handle(ipcMain, 'kas:getActiveKas', (username: string) => KasController.getActiveKas(username))
  handle(ipcMain, 'kas:getAllKas', () => KasController.getAllKas())
  handle(ipcMain, 'kas:getKasById', (kd: string) => KasController.getKasById(kd))
  handle(ipcMain, 'kas:bukaKas', (username: string, modal: number, catatan?: string) => 
    KasController.bukaKas(username, modal, catatan))
  handle(ipcMain, 'kas:tutupKas', (kd: string, saldo: number, catatan?: string) => 
    KasController.tutupKas(kd, saldo, catatan))
  handle(ipcMain, 'kas:getTransaksi', (kd: string) => KasController.getTransaksiByKas(kd))
  handle(ipcMain, 'kas:addPengeluaran', (kd: string, jumlah: number, keterangan: string, username: string) => 
    KasController.addPengeluaran(kd, jumlah, keterangan, username))
  handle(ipcMain, 'kas:addPemasukan', (kd: string, jumlah: number, keterangan: string, username: string) => 
    KasController.addPemasukan(kd, jumlah, keterangan, username))
  handle(ipcMain, 'kas:deleteTransaksi', (kd: number) => KasController.deleteTransaksi(kd))
  handle(ipcMain, 'kas:deleteKas', (kd_kas: string) => KasController.deleteKas(kd_kas))
  handle(ipcMain, 'kas:getLaporan', (startDate: string, endDate: string) => 
    KasController.getLaporanKas(startDate, endDate))

  // ─── PEMBELIAN (Purchases) ─────────────────────────────────────────
  handle(ipcMain, 'pembelian:getAll', () => PembelianController.getAll())
  handle(ipcMain, 'pembelian:getById', (kd: string) => PembelianController.getById(kd))
  handle(ipcMain, 'pembelian:create', (data: any) => PembelianController.create(data))
  handle(ipcMain, 'pembelian:updateStatus', (kd: string, bayar: number) => 
    PembelianController.updateStatus(kd, bayar))
  handle(ipcMain, 'pembelian:delete', (kd: string) => PembelianController.delete(kd))
  handle(ipcMain, 'pembelian:getLaporan', (startDate: string, endDate: string) => 
    PembelianController.getLaporanPembelian(startDate, endDate))

  // ─── BACKUP & RESTORE ─────────────────────────────────────────────
  handle(ipcMain, 'backup:getAll', () => BackupController.getAll())
  handle(ipcMain, 'backup:create', (username: string, keterangan?: string) => 
    BackupController.create(username, keterangan))
  handle(ipcMain, 'backup:restore', (kd: number) => BackupController.restore(kd))
  handle(ipcMain, 'backup:delete', (kd: number) => BackupController.delete(kd))
  handle(ipcMain, 'backup:download', (kd: number) => BackupController.download(kd))
  handle(ipcMain, 'backup:import', (base64Data: string, fileName: string) => BackupController.import(base64Data, fileName))

  // ─── LAPORAN (Reports) ─────────────────────────────────────────────
  handle(ipcMain, 'laporan:penjualan', (startDate: string, endDate: string) => 
    LaporanController.getLaporanPenjualan(startDate, endDate))
  handle(ipcMain, 'laporan:labaRugi', (startDate: string, endDate: string) => 
    LaporanController.getLaporanLabaRugi(startDate, endDate))
  handle(ipcMain, 'laporan:produkTerlaris', (startDate: string, endDate: string, limit?: number) => 
    LaporanController.getLaporanProdukTerlaris(startDate, endDate, limit))
  handle(ipcMain, 'laporan:stok', () => LaporanController.getLaporanStok())
  handle(ipcMain, 'laporan:kas', (startDate: string, endDate: string) => 
    LaporanController.getLaporanKas(startDate, endDate))
  handle(ipcMain, 'laporan:customer', () => LaporanController.getLaporanCustomer())

  // ─── ACTIVITY LOG ──────────────────────────────────────────────────
  handle(ipcMain, 'activityLog:getAll', () => ActivityLogController.getAll())
  handle(ipcMain, 'activityLog:getByUsername', (username: string) => 
    ActivityLogController.getByUsername(username))
  handle(ipcMain, 'activityLog:getByModul', (modul: string) => 
    ActivityLogController.getByModul(modul))
  handle(ipcMain, 'activityLog:search', (filters: any) => ActivityLogController.search(filters))
  handle(ipcMain, 'activityLog:log', (username: string, aktivitas: string, modul: string, detail?: string) => 
    ActivityLogController.log(username, aktivitas, modul, detail))
  handle(ipcMain, 'activityLog:delete', (kd: number) => ActivityLogController.delete(kd))
  handle(ipcMain, 'activityLog:deleteOldLogs', (days?: number) => 
    ActivityLogController.deleteOldLogs(days))

  // ─── EXPORT ────────────────────────────────────────────────────────
  handle(ipcMain, 'export:penjualanExcel', (startDate: string, endDate: string) => 
    ExportController.exportPenjualanExcel(startDate, endDate))
  handle(ipcMain, 'export:penjualanPDF', (startDate: string, endDate: string) => 
    ExportController.exportPenjualanPDF(startDate, endDate))
  handle(ipcMain, 'export:stokExcel', () => ExportController.exportStokExcel())
  handle(ipcMain, 'export:stokPDF', () => ExportController.exportStokPDF())
  handle(ipcMain, 'export:toExcel', (data: any[], filename: string, sheetName?: string) => 
    ExportController.exportToExcel(data, filename, sheetName))
  handle(ipcMain, 'export:toPDF', (title: string, headers: string[], data: any[][], filename: string, orientation?: 'portrait' | 'landscape') => 
    ExportController.exportToPDF(title, headers, data, filename, orientation))

  // ─── SCHEDULER ─────────────────────────────────────────────────────
  handle(ipcMain, 'scheduler:runStokCheck', () => SchedulerService.runStokCheck())
  handle(ipcMain, 'scheduler:runExpiredCheck', () => SchedulerService.runExpiredCheck())
  handle(ipcMain, 'scheduler:runBackup', (username: string) => SchedulerService.runBackup(username))
  handle(ipcMain, 'scheduler:runCleanLogs', (days?: number) => SchedulerService.runCleanLogs(days))

  // ─── BARCODE ───────────────────────────────────────────────────────
  handle(ipcMain, 'barcode:generate', () => BarcodeController.generateBarcode())
  handle(ipcMain, 'barcode:search', (barcode: string) => BarcodeController.searchByBarcode(barcode))
  handle(ipcMain, 'barcode:getSettings', () => BarcodeController.getSettings())
  handle(ipcMain, 'barcode:updateSettings', (data: any) => BarcodeController.updateSettings(data))

  // ─── PAYMENT METHODS ──────────────────────────────────────────────
  handle(ipcMain, 'payment:getAll', () => PaymentMethodController.getAll())
  handle(ipcMain, 'payment:create', (data: any) => PaymentMethodController.create(data))
  handle(ipcMain, 'payment:update', (id: number, data: any) => PaymentMethodController.update(id, data))
  handle(ipcMain, 'payment:delete', (id: number) => PaymentMethodController.delete(id))

  // ─── TAX ───────────────────────────────────────────────────────────
  handle(ipcMain, 'tax:getActive', () => TaxController.getActive())
  handle(ipcMain, 'tax:getAll', () => TaxController.getAll())
  handle(ipcMain, 'tax:setActive', (id: number) => TaxController.setActive(id))
  handle(ipcMain, 'tax:create', (data: any) => TaxController.create(data))

  // ─── RETURNS ───────────────────────────────────────────────────────
  handle(ipcMain, 'return:create', (data: any) => ReturnController.create(data))
  handle(ipcMain, 'return:getAll', () => ReturnController.getAll())
  handle(ipcMain, 'return:approve', (id: number, userId: number) => ReturnController.approve(id, userId))
  handle(ipcMain, 'return:reject', (id: number, userId: number) => ReturnController.reject(id, userId))
  handle(ipcMain, 'return:delete', (id: number) => ReturnController.delete(id))

  // ─── SHIFTS ────────────────────────────────────────────────────────
  handle(ipcMain, 'shift:open', (data: any) => ShiftController.open(data))
  handle(ipcMain, 'shift:close', (id: number, data: any) => ShiftController.close(id, data))
  handle(ipcMain, 'shift:getCurrent', (userId: number) => ShiftController.getCurrent(userId))
  handle(ipcMain, 'shift:getAll', () => ShiftController.getAll())
  handle(ipcMain, 'shift:delete', (id: number) => ShiftController.delete(id))

  // ─── DEBTS ─────────────────────────────────────────────────────────
  handle(ipcMain, 'debt:create', (data: any) => DebtController.create(data))
  handle(ipcMain, 'debt:addPayment', (debtId: number, data: any) => DebtController.addPayment(debtId, data))
  handle(ipcMain, 'debt:getAll', (type?: string) => DebtController.getAll(type))
  handle(ipcMain, 'debt:getPayments', (debtId: number) => DebtController.getPayments(debtId))
  handle(ipcMain, 'debt:delete', (id: number) => DebtController.delete(id))

  // ─── STOCK OPNAME ──────────────────────────────────────────────────
  handle(ipcMain, 'opname:create', (data: any) => StockOpnameController.create(data))
  handle(ipcMain, 'opname:approve', (id: number, userId: number) => StockOpnameController.approve(id, userId))
  handle(ipcMain, 'opname:getAll', () => StockOpnameController.getAll())
  handle(ipcMain, 'opname:getDetails', (id: number) => StockOpnameController.getDetails(id))
  handle(ipcMain, 'opname:delete', (id: number) => StockOpnameController.delete(id))
  handle(ipcMain, 'opname:addItem', (data: any) => StockOpnameController.addItem(data))
  handle(ipcMain, 'opname:getItems', (opnameId: number) => StockOpnameController.getItems(opnameId))

  // ─── PRODUCT IMAGES ────────────────────────────────────────────────
  handle(ipcMain, 'productImage:add', (barangId: number, imagePath: string, isPrimary: boolean) => ProductImageController.add(barangId, imagePath, isPrimary))
  handle(ipcMain, 'productImage:getByProduct', (barangId: number) => ProductImageController.getByProduct(barangId))
  handle(ipcMain, 'productImage:delete', (id: number) => ProductImageController.delete(id))
  handle(ipcMain, 'productImage:setPrimary', (id: number, barangId: number) => ProductImageController.setPrimary(id, barangId))

  // ─── UPDATES ───────────────────────────────────────────────────────
  handle(ipcMain, 'update:check', () => UpdateService.checkForUpdates())
  handle(ipcMain, 'update:getHistory', () => UpdateService.getUpdateHistory())

  // ─── ERROR LOGGING ─────────────────────────────────────────────────
  handle(ipcMain, 'errorLog:log', (errorType: string, errorMessage: string, stackTrace?: string, userId?: string, context?: string) => ErrorLogService.log(errorType, errorMessage, stackTrace, userId, context))
  handle(ipcMain, 'errorLog:getAll', (limit?: number) => ErrorLogService.getAll(limit))
  handle(ipcMain, 'errorLog:deleteOld', (days?: number) => ErrorLogService.deleteOld(days))
  handle(ipcMain, 'errorLog:clear', () => ErrorLogService.clear())

  // ─── SUBSCRIPTION PLANS ─────────────────────────────────────────────
  handle(ipcMain, 'plan:getAll', () => PlanController.getAll())
  handle(ipcMain, 'plan:getActive', () => PlanController.getActive())
  handle(ipcMain, 'plan:create', (data: any) => PlanController.create(data))
  handle(ipcMain, 'plan:update', (id: number, data: any) => PlanController.update(id, data))
  handle(ipcMain, 'plan:deactivate', (id: number) => PlanController.deactivate(id))

  // ─── TUTORIALS ─────────────────────────────────────────────────────
  handle(ipcMain, 'tutorial:getAll', () => TutorialController.getAll())
  handle(ipcMain, 'tutorial:getById', (id: number) => TutorialController.getById(id))
  handle(ipcMain, 'tutorial:create', (data: any) => TutorialController.create(data))
  handle(ipcMain, 'tutorial:update', (id: number, data: any) => TutorialController.update(id, data))
  handle(ipcMain, 'tutorial:delete', (id: number) => TutorialController.delete(id))

  // ─── HPP CALCULATOR ────────────────────────────────────────────────
  // Note: hpp:calculate has its own demo-limit logic inside the controller.
  // It is intentionally NOT in MUTATION_CHANNELS so demo users can use it up to 10 times.
  handle(ipcMain, 'hpp:calculate', (data: any) => HppController.calculate(data))
  handle(ipcMain, 'hpp:getHistory', (username: string) => HppController.getHistory(username))
  handle(ipcMain, 'hpp:getUsageCount', (username: string) => HppController.getUsageCount(username))
  handle(ipcMain, 'hpp:delete', (id: number, username: string) => HppController.delete(id, username))

  // ─── STRUK SETTINGS ────────────────────────────────────────────────
  handle(ipcMain, 'strukSettings:get', () => StrukSettingsController.get())
  handle(ipcMain, 'strukSettings:update', (data: any) => StrukSettingsController.update(data))
  handle(ipcMain, 'strukSettings:uploadQris', (base64: string) => StrukSettingsController.uploadQris(base64))
  handle(ipcMain, 'strukSettings:removeQris', () => StrukSettingsController.removeQris())

  // ─── SYSTEM STATUS ─────────────────────────────────────────────────
  handle(ipcMain, 'system:checkDb', () => SystemController.checkDb())
  handle(ipcMain, 'system:resetData', () => SystemController.resetData())
}

