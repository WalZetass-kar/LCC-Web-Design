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
import { dialog, BrowserWindow } from 'electron'
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
import { CurrencyController } from '../backend/controllers/CurrencyController.js'
import { InventoryController } from '../backend/controllers/InventoryController.js'
import { AuditController } from '../backend/controllers/AuditController.js'
import { PromoController } from '../backend/controllers/PromoController.js'
import { PromoService } from '../backend/services/promoService.js'
import { MobileAppController } from '../backend/controllers/MobileAppController.js'
import { BranchController } from '../backend/controllers/BranchController.js'
import { WhatsAppController } from '../backend/controllers/WhatsAppController.js'
import { LoyaltyController } from '../backend/controllers/LoyaltyController.js'
import { SecurityController } from '../backend/controllers/SecurityController.js'
import { EcommerceApiController } from '../backend/controllers/EcommerceApiController.js'
import { IndustrySettingsController } from '../backend/controllers/IndustrySettingsController.js'
import { AssistantController } from '../backend/controllers/AssistantController.js'
import { LicenseController } from '../backend/controllers/LicenseController.js'
import { DeviceController, detectPlatformOS } from '../backend/controllers/DeviceController.js'
import { getSubscriptionStatus, checkTransactionLimit, getPopupRule, isFeatureEnabled, getActiveFeatures, getUpgradePopup } from '../backend/middleware/subscriptionGuard.js'
import { sqlite } from '../database/connection.js'
import { SyncServerService, setSyncChannelInvoker } from './syncServer.js'
import { SyncClientService } from './syncClient.js'
import { openExternalHttps } from './platformSecurity.js'
import type { PaginationParams } from '../backend/utils/pagination.js'

type ChannelHandler = (...args: any[]) => any

const channelHandlers = new Map<string, ChannelHandler>()

function isDatabaseCorruptionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('database disk image is malformed')
    || message.includes('database image is malformed')
}

function channelErrorResponse(channel: string, error: unknown) {
  console.error(`IPC channel error [${channel}]:`, error)

  if (isDatabaseCorruptionError(error)) {
    return {
      success: false,
      error_code: 'DATABASE_CORRUPT',
      message: 'Database lokal rusak/korup. Tutup aplikasi, lalu restore backup yang valid atau jalankan recovery database.',
    }
  }

  return {
    success: false,
    message: error instanceof Error ? error.message : String(error),
  }
}

function registerChannel(channel: string, handler: ChannelHandler) {
  channelHandlers.set(channel, handler)
  return handler
}

export async function invokeRegisteredChannel(channel: string, args: unknown[] = []) {
  const handler = channelHandlers.get(channel)
  if (!handler) {
    return {
      success: false,
      message: `Channel tidak terdaftar: ${channel}`,
    }
  }

  try {
    return await handler(...args)
  } catch (error) {
    return channelErrorResponse(channel, error)
  }
}

function syncRendererSession(channel: string, result: any) {
  if (channel === 'auth:logout') {
    demoSession.clearSession()
    return
  }

  if (!['auth:login', 'auth:loginPin', 'auth:restoreSession', 'auth:registerTrial'].includes(channel)) return
  if (!result?.success || !result.data || result.data.must_change_password) return

  const userData = result.data as { nama_pengguna?: string; hak_akses?: string }
  if (userData.nama_pengguna) {
    demoSession.setSession(userData.nama_pengguna, userData.hak_akses || 'kasir')
  }
}

async function invokeRendererChannel(channel: string, args: unknown[], localHandler: ChannelHandler) {
  try {
    if (SyncClientService.shouldForward(channel)) {
      const result = await SyncClientService.invoke(channel, args)
      syncRendererSession(channel, result)
      return result
    }

    const result = await localHandler(...args)
    syncRendererSession(channel, result)
    return result
  } catch (error) {
    return channelErrorResponse(channel, error)
  }
}

/**
 * Helper to register an IPC handler with automatic demo guard.
 * Every channel goes through withDemoGuard which checks the server-side session.
 */
function handle(ipcMain: IpcMain, channel: string, handler: (...args: any[]) => any) {
  registerChannel(channel, handler)
  const guarded = withDemoGuard(channel, (_e: any, ...args: any[]) => invokeRendererChannel(channel, args, handler))
  ipcMain.handle(channel, guarded)
}

export function registerIpcHandlers(ipcMain: IpcMain) {
  setSyncChannelInvoker(invokeRegisteredChannel)

  ipcMain.handle('app:openExternal', async (_e, rawUrl: string) => {
    return openExternalHttps(rawUrl)
  })

  // ─── AUTH (always allowed — no demo guard needed) ───────────────────
  const authHasUsers = registerChannel('auth:hasUsers', () => AuthController.hasUsers())
  ipcMain.handle('auth:hasUsers', () => invokeRendererChannel('auth:hasUsers', [], authHasUsers))

  const authCreateInitialAdmin = registerChannel('auth:createInitialAdmin', (data: { username?: string; nama_lengkap?: string; password?: string }) => (
    AuthController.createInitialAdmin(data)
  ))
  ipcMain.handle('auth:createInitialAdmin', (_e, data: { username?: string; nama_lengkap?: string; password?: string }) => (
    invokeRendererChannel('auth:createInitialAdmin', [data], authCreateInitialAdmin)
  ))

  const authRegisterTrial = registerChannel('auth:registerTrial', (data: {
    username?: string
    nama_lengkap?: string
    email?: string
    no_telp?: string
    password?: string
  }, deviceInfo?: any) => (
    AuthController.registerTrial(data, deviceInfo)
  ))
  ipcMain.handle('auth:registerTrial', (_e, data: {
    username?: string
    nama_lengkap?: string
    email?: string
    no_telp?: string
    password?: string
  }, deviceInfo?: any) => (
    invokeRendererChannel('auth:registerTrial', [data, deviceInfo], authRegisterTrial)
  ))

  const authLogin = registerChannel('auth:login', async (username: string, password: string, deviceInfo?: any) => {
    const result = await AuthController.login(username, password, deviceInfo)
    
    // CRITICAL: Set the server-side session on successful login
    if (result.success && result.data && !(result.data as { must_change_password?: boolean }).must_change_password) {
      const userData = result.data as { nama_pengguna: string; hak_akses: string }
      demoSession.setSession(userData.nama_pengguna, userData.hak_akses || 'kasir')
    }
    
    return result
  })
  ipcMain.handle('auth:login', (_e, username: string, password: string, deviceInfo?: any) => (
    invokeRendererChannel('auth:login', [username, password, deviceInfo], authLogin)
  ))

  const authLoginPin = registerChannel('auth:loginPin', async (username: string, pin: string, deviceInfo?: any) => {
    const result = await AuthController.loginWithPin(username, pin, deviceInfo)
    if (result.success && result.data) {
      const userData = result.data as { nama_pengguna: string; hak_akses: string }
      demoSession.setSession(userData.nama_pengguna, userData.hak_akses || 'kasir')
    }
    return result
  })
  ipcMain.handle('auth:loginPin', (_e, username: string, pin: string, deviceInfo?: any) => (
    invokeRendererChannel('auth:loginPin', [username, pin, deviceInfo], authLoginPin)
  ))

  const authChangePassword = registerChannel('auth:changePassword', (username: string, oldPass: string, newPass: string, deviceInfo?: any) => (
    AuthController.changePassword(username, oldPass, newPass, deviceInfo)
  ))
  ipcMain.handle('auth:changePassword', (_e, username: string, oldPass: string, newPass: string, deviceInfo?: any) => (
    invokeRendererChannel('auth:changePassword', [username, oldPass, newPass, deviceInfo], authChangePassword)
  ))
  
  const authCheckIdentitas = registerChannel('auth:checkIdentitas', () => AuthController.checkIdentitas())
  ipcMain.handle('auth:checkIdentitas', () => invokeRendererChannel('auth:checkIdentitas', [], authCheckIdentitas))

  const authRestoreSession = registerChannel('auth:restoreSession', async (input: any) => {
    const result = await AuthController.restoreSession(input)
    if (result.success && result.data) {
      const userData = result.data as { nama_pengguna: string; hak_akses: string }
      demoSession.setSession(userData.nama_pengguna, userData.hak_akses || 'kasir')
    }
    return result
  })
  ipcMain.handle('auth:restoreSession', (_e, input: any) => invokeRendererChannel('auth:restoreSession', [input], authRestoreSession))
  
  // Auth logout — clear the session
  const authLogout = registerChannel('auth:logout', (payload: { username?: string; sessionToken?: string; deviceInfo?: any } | string) => {
    if (typeof payload === 'string') {
      AuthController.logout(payload)
    } else {
      AuthController.logout(payload?.username ?? 'unknown', payload?.sessionToken, payload?.deviceInfo)
    }
    demoSession.clearSession()
    return { success: true, message: 'Logged out' }
  })
  ipcMain.handle('auth:logout', (_e, payload: { username?: string; sessionToken?: string; deviceInfo?: any } | string) => (
    invokeRendererChannel('auth:logout', [payload], authLogout)
  ))

  // ─── DEMO STATUS (always allowed) ──────────────────────────────────
  const demoGetStatus = registerChannel('demo:getStatus', () => {
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
  ipcMain.handle('demo:getStatus', () => demoGetStatus())

  const demoGetViolationLog = registerChannel('demo:getViolationLog', () => {
    return {
      success: true,
      data: demoSession.getViolationLog(),
    }
  })
  ipcMain.handle('demo:getViolationLog', () => demoGetViolationLog())

  // ─── SYNC SERVER (always allowed) ──────────────────────────────────
  ipcMain.handle('sync:getStatus', () => ({
    success: true,
    data: {
      mode: 'desktop',
      ...SyncServerService.getStatus(),
      client: SyncClientService.getStatus(),
    },
  }))
  ipcMain.handle('sync:saveConfig', (_e, config: { enabled?: boolean; port?: number; token?: string }) => {
    if (config.enabled) {
      SyncClientService.saveConfig({ enabled: false })
    }
    return {
      success: true,
      data: {
        mode: 'desktop',
        ...SyncServerService.saveConfig(config),
        client: SyncClientService.getStatus(),
      },
      message: 'Pengaturan sinkronisasi disimpan',
    }
  })
  ipcMain.handle('sync:saveClientConfig', (_e, config: { enabled?: boolean; baseUrl?: string; token?: string; deviceName?: string }) => {
    const result = SyncClientService.saveConfig(config)
    if (result.success && result.data.enabled) {
      SyncServerService.saveConfig({ enabled: false })
    }
    return {
      ...result,
      data: {
        mode: 'desktop',
        ...SyncServerService.getStatus(),
        client: SyncClientService.getStatus(),
      },
    }
  })
  ipcMain.handle('sync:testConnection', () => {
    const status = SyncServerService.getStatus()
    return {
      success: status.running,
      data: status,
      message: status.running
        ? 'Server sinkronisasi desktop aktif'
        : 'Server sinkronisasi desktop belum aktif',
    }
  })
  ipcMain.handle('sync:testClientConnection', (_e, config?: { baseUrl?: string; token?: string; deviceName?: string }) => (
    SyncClientService.testConnection(config)
  ))
  ipcMain.handle('sync:rotateToken', () => ({
    success: true,
    data: {
      mode: 'desktop',
      ...SyncServerService.rotateToken(),
      client: SyncClientService.getStatus(),
    },
    message: 'Token sinkronisasi diganti',
  }))

  // ─── BARANG (Products) ─────────────────────────────────────────────
  handle(ipcMain, 'barang:getAll', () => BarangController.getAll())
  handle(ipcMain, 'barang:getPaginated', (params?: PaginationParams) => BarangController.getPaginated(params))
  handle(ipcMain, 'barang:search', (q: string) => BarangController.search(q))
  handle(ipcMain, 'barang:create', (data: any) => BarangController.create({
    ...data,
    nama_pengguna: demoSession.getUsername() ?? data?.nama_pengguna,
  }))
  handle(ipcMain, 'barang:update', (kd: string, data: any) => BarangController.update(kd, data))
  handle(ipcMain, 'barang:delete', (kd: string) => BarangController.delete(kd))
  handle(ipcMain, 'barang:bulkImport', (products: any[], username?: string) => (
    BarangController.bulkImport(products, demoSession.getUsername() ?? username)
  ))

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
  handle(ipcMain, 'penjualan:create', (data: any) => PenjualanController.create({
    ...data,
    username: demoSession.getUsername() ?? data?.username,
  }))

  // ─── DASHBOARD ─────────────────────────────────────────────────────
  handle(ipcMain, 'dashboard:getSummary', () => DashboardController.getSummary())

  // ─── AI ASSISTANT ──────────────────────────────────────────────────
  handle(ipcMain, 'assistant:ask', (data: any) => AssistantController.ask(data))

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
  handle(ipcMain, 'user:block', (username: string, blocked: boolean, caller?: string) => UserController.block(username, blocked, caller))
  handle(ipcMain, 'user:extendAccess', (username: string, days: number, caller?: string) => UserController.extendAccess(username, days, caller))
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
  handle(ipcMain, 'export:penjualanExcel', (startDate: string, endDate: string, customPath?: string) => 
    ExportController.exportPenjualanExcel(startDate, endDate, customPath))
  handle(ipcMain, 'export:penjualanPDF', (startDate: string, endDate: string, customPath?: string) => 
    ExportController.exportPenjualanPDF(startDate, endDate, customPath))
  handle(ipcMain, 'export:stokExcel', (customPath?: string) => ExportController.exportStokExcel(customPath))
  handle(ipcMain, 'export:stokPDF', (customPath?: string) => ExportController.exportStokPDF(customPath))
  handle(ipcMain, 'export:toExcel', (data: any[], filename: string, sheetName?: string, customPath?: string) => 
    ExportController.exportToExcel(data, filename, sheetName, customPath))
  handle(ipcMain, 'export:toPDF', (title: string, headers: string[], data: any[][], filename: string, orientation?: 'portrait' | 'landscape', customPath?: string) => 
    ExportController.exportToPDF(title, headers, data, filename, orientation, customPath))

  // ─── INDUSTRY INTEGRATIONS ─────────────────────────────────────────
  handle(ipcMain, 'integrations:get', () => IndustrySettingsController.get())
  handle(ipcMain, 'integrations:save', (data: any) => IndustrySettingsController.save(data))
  handle(ipcMain, 'integrations:testAi', (data?: any) => AssistantController.test(data))
  handle(ipcMain, 'integrations:listAiModels', (data?: any) => AssistantController.listModels(data))
  handle(ipcMain, 'integrations:testGoogleSheets', () => IndustrySettingsController.testGoogleSheets())
  handle(ipcMain, 'integrations:exportDashboardToSheets', (summary: any) => IndustrySettingsController.exportDashboardToSheets(summary))

  // ─── SCHEDULER ─────────────────────────────────────────────────────
  handle(ipcMain, 'scheduler:runStokCheck', () => SchedulerService.runStokCheck())
  handle(ipcMain, 'scheduler:runExpiredCheck', () => SchedulerService.runExpiredCheck())
  handle(ipcMain, 'scheduler:runDebtCheck', () => SchedulerService.runDebtCheck())
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
  handle(ipcMain, 'payment:createQris', (data: any) => PaymentMethodController.createQris(data))
  handle(ipcMain, 'payment:checkStatus', (orderId: string) => PaymentMethodController.checkStatus(orderId))
  handle(ipcMain, 'payment:cancelQris', (orderId: string) => PaymentMethodController.cancelQris(orderId))

  // ─── TAX ───────────────────────────────────────────────────────────
  handle(ipcMain, 'tax:getActive', () => TaxController.getActive())
  handle(ipcMain, 'tax:getAll', () => TaxController.getAll())
  handle(ipcMain, 'tax:setActive', (id: number) => TaxController.setActive(id))
  handle(ipcMain, 'tax:create', (data: any) => TaxController.create(data))
  handle(ipcMain, 'tax:update', (id: number, data: any) => TaxController.update(id, data))
  handle(ipcMain, 'tax:delete', (id: number) => TaxController.delete(id))

  // ─── RETURNS ───────────────────────────────────────────────────────
  handle(ipcMain, 'return:create', (data: any) => ReturnController.create(data))
  handle(ipcMain, 'return:getAll', () => ReturnController.getAll())
  handle(ipcMain, 'return:getDetails', (id: number) => ReturnController.getDetails(id))
  handle(ipcMain, 'return:approve', (id: number, userId: string | number) => ReturnController.approve(id, userId))
  handle(ipcMain, 'return:reject', (id: number, userId: string | number) => ReturnController.reject(id, userId))
  handle(ipcMain, 'return:delete', (id: number) => ReturnController.delete(id))

  // ─── SHIFTS ────────────────────────────────────────────────────────
  handle(ipcMain, 'shift:open', (data: any) => ShiftController.open(data))
  handle(ipcMain, 'shift:close', (id: number, data: any) => ShiftController.close(id, data))
  handle(ipcMain, 'shift:getCurrent', (userId: string | number) => ShiftController.getCurrent(userId))
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
  handle(ipcMain, 'plan:create', (data: any) => PlanController.create(data, demoSession.getUsername()))
  handle(ipcMain, 'plan:update', (id: number, data: any) => PlanController.update(id, data, demoSession.getUsername()))
  handle(ipcMain, 'plan:deactivate', (id: number) => PlanController.deactivate(id, demoSession.getUsername()))
  handle(ipcMain, 'plan:delete', (id: number) => PlanController.delete(id, demoSession.getUsername()))

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

  // ─── CURRENCY ──────────────────────────────────────────────────────
  handle(ipcMain, 'currency:getAll', () => CurrencyController.getAll())
  handle(ipcMain, 'currency:getActive', () => CurrencyController.getActive())
  handle(ipcMain, 'currency:create', (data: any) => CurrencyController.create(data))
  handle(ipcMain, 'currency:update', (id: number, data: any) => CurrencyController.update(id, data))
  handle(ipcMain, 'currency:delete', (id: number) => CurrencyController.delete(id))
  handle(ipcMain, 'currency:setDefault', (id: number) => CurrencyController.setDefault(id))

  // ─── INVENTORY ─────────────────────────────────────────────────────
  handle(ipcMain, 'warehouse:getAll', () => InventoryController.getWarehouses())
  handle(ipcMain, 'warehouse:create', (data: any) => InventoryController.createWarehouse(data))
  handle(ipcMain, 'inventory:getBatches', (kd: string) => InventoryController.getBatches(kd))
  handle(ipcMain, 'inventory:addBatch', (data: any) => InventoryController.addBatch(data))
  handle(ipcMain, 'inventory:getSerials', (kd: string) => InventoryController.getSerials(kd))
  handle(ipcMain, 'inventory:addSerial', (data: any) => InventoryController.addSerial(data))
  handle(ipcMain, 'inventory:transfer', (data: any) => InventoryController.transfer(data))

  // ─── PROMO ─────────────────────────────────────────────────────────
  handle(ipcMain, 'promo:getAll', () => PromoController.getAll())
  handle(ipcMain, 'promo:getActive', () => PromoController.getActive())
  handle(ipcMain, 'promo:create', (data: any) => PromoController.create(data))
  handle(ipcMain, 'promo:update', (id: number, data: any) => PromoController.update(id, data))
  handle(ipcMain, 'promo:delete', (id: number) => PromoController.delete(id))
  handle(ipcMain, 'promo:validate', (code: string, subtotal: number, items: any[]) => PromoController.validate(code, subtotal, items))
  handle(ipcMain, 'promo:apply', (code: string) => PromoService.applyPromo(code))

  // ─── BRANCH / MULTI-OUTLET ────────────────────────────────────────────
  handle(ipcMain, 'branch:getAll', () => BranchController.getAll())
  handle(ipcMain, 'branch:getActive', () => BranchController.getActive())
  handle(ipcMain, 'branch:getWarehouses', () => BranchController.getWarehouses())
  handle(ipcMain, 'branch:getById', (id: number) => BranchController.getById(id))
  handle(ipcMain, 'branch:create', (data: any) => BranchController.create(data))
  handle(ipcMain, 'branch:update', (id: number, data: any) => BranchController.update(id, data))
  handle(ipcMain, 'branch:delete', (id: number) => BranchController.delete(id))
  handle(ipcMain, 'branch:transferStock', (fromId: number, toId: number, productId: string, qty: number, notes: string, userId: string) => 
    BranchController.transferStock(fromId, toId, productId, qty, notes, userId))

  // ─── LOYALTY / POINTS ───────────────────────────────────────────────
  handle(ipcMain, 'loyalty:getTiers', () => LoyaltyController.getTiers())
  handle(ipcMain, 'loyalty:getCustomerTier', (customerId: string) => LoyaltyController.getCustomerTier(customerId))
  handle(ipcMain, 'loyalty:calculatePoints', (amount: number, tierId: number) => LoyaltyController.calculatePoints(amount, tierId))
  handle(ipcMain, 'loyalty:redeemPoints', (customerId: string, points: number) => LoyaltyController.redeemPoints(customerId, points))
  handle(ipcMain, 'loyalty:createTier', (data: any) => LoyaltyController.createTier(data))
  handle(ipcMain, 'loyalty:updateTier', (id: number, data: any) => LoyaltyController.updateTier(id, data))
  handle(ipcMain, 'loyalty:deleteTier', (id: number) => LoyaltyController.deleteTier(id))

  // ─── AUDIT TRAIL ───────────────────────────────────────────────────
  handle(ipcMain, 'audit:getAll', () => AuditController.getAll())
  handle(ipcMain, 'audit:log', (data: any) => AuditController.log(data))
  handle(ipcMain, 'audit:clear', () => AuditController.clear())

  // ─── MOBILE APP SUPPORT ────────────────────────────────────────────
  handle(ipcMain, 'mobile:getSummary', (token: string) => MobileAppController.getRemoteSummary(token))
  handle(ipcMain, 'mobile:processScan', (barcode: string, username: string) => MobileAppController.processMobileScan(barcode, username))

  // ─── SYSTEM STATUS ─────────────────────────────────────────────────
  handle(ipcMain, 'system:checkDb', () => SystemController.checkDb())
  handle(ipcMain, 'system:resetData', () => SystemController.resetData())

  // ─── WHATSAPP SETTINGS ─────────────────────────────────────────────
  handle(ipcMain, 'whatsapp:get', () => WhatsAppController.get())
  handle(ipcMain, 'whatsapp:save', (data: any) => WhatsAppController.save(data))
  handle(ipcMain, 'whatsapp:test', (phone: string) => WhatsAppController.test(phone))
  handle(ipcMain, 'whatsapp:getTemplates', () => WhatsAppController.getTemplates())
  handle(ipcMain, 'whatsapp:saveTemplate', (data: any) => WhatsAppController.saveTemplate(data))
  handle(ipcMain, 'whatsapp:getBroadcastHistory', () => WhatsAppController.getBroadcastHistory())
  handle(ipcMain, 'whatsapp:saveBroadcastHistory', (data: any) => WhatsAppController.saveBroadcastHistory(data))

  // ─── SECURITY SETTINGS ─────────────────────────────────────────────
  handle(ipcMain, 'security:get', () => SecurityController.get())
  handle(ipcMain, 'security:save', (data: any) => SecurityController.save(data))

  // ─── ECOMMERCE API SETTINGS ────────────────────────────────────────
  handle(ipcMain, 'ecommerce:get', () => EcommerceApiController.get())
  handle(ipcMain, 'ecommerce:save', (data: any) => EcommerceApiController.save(data, demoSession.getUsername()))
  handle(ipcMain, 'ecommerce:getIntegration', () => EcommerceApiController.getIntegration())
  handle(ipcMain, 'ecommerce:saveIntegration', (data: any) => EcommerceApiController.saveIntegration(data, demoSession.getUsername()))
  handle(ipcMain, 'ecommerce:syncNow', () => EcommerceApiController.syncNow(demoSession.getUsername()))
  handle(ipcMain, 'ecommerce:enqueueStockUpdate', (productId: string | number, qty: number) => EcommerceApiController.enqueueStockUpdate(productId, qty))

  // ─── DEVICE TRACKING ───────────────────────────────────────────────
  handle(ipcMain, 'device:getAll', () => ({ success: true, data: DeviceController.getAllDevices() }))
  handle(ipcMain, 'device:getByUser', (username: string) => ({ success: true, data: DeviceController.getByUser(username) }))
  handle(ipcMain, 'device:revoke', (id: number, revokedBy: string) => DeviceController.revoke(id, revokedBy))
  handle(ipcMain, 'device:revokeAll', (username: string, revokedBy: string) => DeviceController.revokeAll(username, revokedBy))
  handle(ipcMain, 'device:getAllSessions', () => ({ success: true, data: DeviceController.getAllActiveSessions() }))
  handle(ipcMain, 'device:revokeSession', (id: number, revokedBy?: string) => DeviceController.revokeSession(id, revokedBy))
  handle(ipcMain, 'device:detectPlatformOS', (userAgent: string) => ({ success: true, data: detectPlatformOS(userAgent) }))

  // ─── SUBSCRIPTION / FEATURE CHECK ──────────────────────────────────
  handle(ipcMain, 'subscription:getStatus', (username: string) => ({ success: true, data: getSubscriptionStatus(username) }))
  handle(ipcMain, 'subscription:checkTransactionLimit', (username: string) => ({ success: true, data: checkTransactionLimit(username) }))
  handle(ipcMain, 'subscription:isFeatureEnabled', (username: string, featureKey: string) => ({ success: true, data: isFeatureEnabled(username, featureKey) }))
  handle(ipcMain, 'subscription:getActiveFeatures', (username: string) => ({ success: true, data: getActiveFeatures(username) }))
  handle(ipcMain, 'subscription:getPopupRule', (code: string) => ({ success: true, data: getPopupRule(code) }))
  handle(ipcMain, 'subscription:getUpgradePopup', (username: string, featureKey?: string) => ({ success: true, data: getUpgradePopup(username, featureKey) }))

  // ─── POPUP RULES ───────────────────────────────────────────────────
  handle(ipcMain, 'popup:getAll', () => ({ success: true, data: sqlite.prepare('SELECT * FROM mediasoft_popup_rules ORDER BY id').all() }))
  handle(ipcMain, 'popup:update', (id: number, data: any) => {
    const allowed = new Set(['title', 'description', 'cta_text', 'cta_url', 'whatsapp_number', 'pricing_html', 'is_active', 'trigger_on'])
    const entries = Object.entries(data ?? {}).filter(([k]) => allowed.has(k))
    if (entries.length === 0) return { success: true }
    const fields = entries.map(([k]) => `${k} = ?`).join(', ')
    const vals = [...entries.map(([, v]) => v), id]
    sqlite.prepare(`UPDATE mediasoft_popup_rules SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...vals)
    return { success: true }
  })

  // ─── LICENSE SERVER ────────────────────────────────────────────────
  handle(ipcMain, 'license:getConfig', () => LicenseController.getConfig())
  handle(ipcMain, 'license:testConnection', (url?: string) => LicenseController.testConnection(url))
  handle(ipcMain, 'license:testAndSave', (url: string, email: string, password: string) => LicenseController.testAndSave(url, email, password))
  handle(ipcMain, 'license:validateApplication', () => LicenseController.validateApplication())
  handle(ipcMain, 'license:syncFromServer', () => LicenseController.syncFromServer())
  handle(ipcMain, 'license:syncBuyerLicense', (username: string, deviceInfo?: any) => LicenseController.syncBuyerLicense(username, deviceInfo))
  handle(ipcMain, 'license:createPaymentInvoice', (data: any) => LicenseController.createPaymentInvoice(data))
  handle(ipcMain, 'license:createManualPaymentRequest', (data: any) => LicenseController.createManualPaymentRequest(data))
  handle(ipcMain, 'license:getPaymentStatus', (externalRef: string) => LicenseController.getPaymentStatus(externalRef))
  handle(ipcMain, 'license:getPublicPlans', () => LicenseController.getPublicPlans())
  handle(ipcMain, 'license:getPublicPopup', (code: string) => LicenseController.getPublicPopup(code))
  handle(ipcMain, 'license:getUsers', (search?: string) => LicenseController.getUsers(search))
  handle(ipcMain, 'license:createUser', (data: any) => LicenseController.createUser(data))
  handle(ipcMain, 'license:updateUser', (id: string | number, data: any) => LicenseController.updateUser(id, data))
  handle(ipcMain, 'license:deleteUser', (id: string | number) => LicenseController.deleteUser(id))
  handle(ipcMain, 'license:changeUserPlan', (id: string | number, data: any) => LicenseController.changeUserPlan(id, data))
  handle(ipcMain, 'license:resetUserPassword', (id: string | number) => LicenseController.resetUserPassword(id))
  handle(ipcMain, 'license:getPlans', () => LicenseController.getLicensePlans())
  handle(ipcMain, 'license:createPlan', (data: any) => LicenseController.createLicensePlan(data))
  handle(ipcMain, 'license:updatePlan', (id: string | number, data: any) => LicenseController.updateLicensePlan(id, data))
  handle(ipcMain, 'license:deletePlan', (id: string | number) => LicenseController.deleteLicensePlan(id))
  handle(ipcMain, 'license:getPlanFeatures', (planId: string | number) => LicenseController.getPlanFeatures(planId))
  handle(ipcMain, 'license:setPlanFeatures', (planId: string | number, data: any) => LicenseController.setPlanFeatures(planId, data))
  handle(ipcMain, 'license:getFeatures', () => LicenseController.getLicenseFeatures())
  handle(ipcMain, 'license:createFeature', (data: any) => LicenseController.createLicenseFeature(data))
  handle(ipcMain, 'license:updateFeature', (id: string | number, data: any) => LicenseController.updateLicenseFeature(id, data))
  handle(ipcMain, 'license:getPopups', () => LicenseController.getPopups())
  handle(ipcMain, 'license:updatePopup', (id: string | number, data: any) => LicenseController.updatePopup(id, data))
  handle(ipcMain, 'license:getPayments', () => LicenseController.getPayments())
  handle(ipcMain, 'license:createPayment', (data: any) => LicenseController.createPayment(data))
  handle(ipcMain, 'license:approvePayment', (id: string | number) => LicenseController.approvePayment(id))
  handle(ipcMain, 'license:deletePayment', (id: string | number) => LicenseController.deletePayment(id))
  handle(ipcMain, 'license:getStats', () => LicenseController.getStats())
  handle(ipcMain, 'license:getRevenue', () => LicenseController.getRevenue())
  handle(ipcMain, 'license:getDevices', (query?: { search?: string; status?: string; platform?: string }) => LicenseController.getDevices(query))
  handle(ipcMain, 'license:getDeviceDetail', (id: string | number) => LicenseController.getDeviceDetail(id))
  handle(ipcMain, 'license:blockDevice', (id: string | number) => LicenseController.blockDevice(id))
  handle(ipcMain, 'license:unblockDevice', (id: string | number) => LicenseController.unblockDevice(id))
  handle(ipcMain, 'license:suspendDeviceLicense', (id: string | number) => LicenseController.suspendDeviceLicense(id))
  handle(ipcMain, 'license:activateDeviceLicense', (id: string | number) => LicenseController.activateDeviceLicense(id))
  handle(ipcMain, 'license:extendDeviceLicense', (id: string | number, data: any) => LicenseController.extendDeviceLicense(id, data))
  handle(ipcMain, 'license:getAppUpdates', () => LicenseController.getAppUpdates())
  handle(ipcMain, 'license:saveAppUpdate', (data: any) => LicenseController.saveAppUpdate(data))
  handle(ipcMain, 'license:checkAppUpdate', (data: any) => LicenseController.checkAppUpdate(data))
  handle(ipcMain, 'license:getErrors', (query?: { type?: string }) => LicenseController.getErrors(query))
  handle(ipcMain, 'license:getAnnouncements', () => LicenseController.getAnnouncements())
  handle(ipcMain, 'license:createAnnouncement', (data: any) => LicenseController.createAnnouncement(data))
  handle(ipcMain, 'license:updateAnnouncement', (id: string | number, data: any) => LicenseController.updateAnnouncement(id, data))
  handle(ipcMain, 'license:deleteAnnouncement', (id: string | number) => LicenseController.deleteAnnouncement(id))
  handle(ipcMain, 'license:heartbeat', (data: any, token?: string | null) => LicenseController.heartbeat(data, token))
  handle(ipcMain, 'license:logError', (data: any) => LicenseController.logError(data))

  // ─── DIALOG ────────────────────────────────────────────────────────
  handle(ipcMain, 'dialog:showSaveDialog', async (options: any) => {
    const result = await dialog.showSaveDialog(options)
    return { success: true, data: result }
  })

  // ─── PRINT ─────────────────────────────────────────────────────────
  ipcMain.handle('print:getPrinters', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, message: 'Window not found' }
      const printers = await win.webContents.getPrintersAsync()
      return { success: true, data: printers }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('print:execute', async (event, options: { printerName?: string; silent?: boolean; copies?: number }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, message: 'Window not found' }
      return new Promise<{ success: boolean; message?: string }>((resolve) => {
        win.webContents.print(
          {
            silent: options.silent ?? true,
            printBackground: true,
            deviceName: options.printerName ?? '',
            copies: options.copies ?? 1,
          },
          (success, failureReason) => {
            if (success) resolve({ success: true })
            else resolve({ success: false, message: failureReason })
          }
        )
      })
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })
}
