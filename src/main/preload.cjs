/**
 * ═══════════════════════════════════════════════════════════════════════
 * PRELOAD BRIDGE — Channel Whitelist Security (Layer 3)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * SECURITY: Only whitelisted IPC channels are exposed to the renderer.
 * This prevents attackers from invoking arbitrary channels even if they
 * manage to access the window.api object through DevTools.
 * 
 * The renderer is UNTRUSTED — it can only call channels listed here.
 */

const { contextBridge, ipcRenderer } = require('electron')

// Only log during development
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
if (isDev) console.log('🔧 Preload script is running...')

/**
 * EXHAUSTIVE whitelist of all allowed IPC channels.
 * Any channel not in this list is BLOCKED.
 */
const ALLOWED_CHANNELS = new Set([
  // Auth
  'auth:login',
  'auth:checkIdentitas',
  'auth:logout',

  // Demo status
  'demo:getStatus',
  'demo:getViolationLog',

  // Barang
  'barang:getAll',
  'barang:search',
  'barang:create',
  'barang:update',
  'barang:delete',

  // Kategori
  'kategori:getAll',
  'kategori:create',
  'kategori:update',
  'kategori:delete',

  // Satuan
  'satuan:getAll',

  // Penjualan
  'penjualan:getAll',
  'penjualan:getDetail',
  'penjualan:create',

  // Dashboard
  'dashboard:getSummary',

  // Identitas
  'identitas:get',
  'identitas:save',

  // Supplier
  'supplier:getAll',
  'supplier:getById',
  'supplier:create',
  'supplier:update',
  'supplier:delete',

  // User Management
  'user:getAll',
  'user:create',
  'user:update',
  'user:changePassword',
  'user:resetPassword',
  'user:delete',
  'user:toggleStatus',
  'user:getPermissions',
  'user:savePermissions',

  // Customer
  'customer:getAll',
  'customer:getById',
  'customer:search',
  'customer:create',
  'customer:update',
  'customer:delete',
  'customer:toggleStatus',
  'customer:addPoin',
  'customer:getBirthdayToday',
  'customer:getRiwayatPembelian',

  // Notifikasi
  'notifikasi:getAll',
  'notifikasi:getUnread',
  'notifikasi:getUnreadCount',
  'notifikasi:create',
  'notifikasi:markAsRead',
  'notifikasi:markAllAsRead',
  'notifikasi:delete',
  'notifikasi:deleteAll',
  'notifikasi:checkStokMinimum',
  'notifikasi:checkExpiredProducts',

  // Kas
  'kas:getActiveKas',
  'kas:getAllKas',
  'kas:getKasById',
  'kas:bukaKas',
  'kas:tutupKas',
  'kas:getTransaksi',
  'kas:addPengeluaran',
  'kas:addPemasukan',
  'kas:deleteTransaksi',
  'kas:deleteKas',
  'kas:getLaporan',

  // Pembelian
  'pembelian:getAll',
  'pembelian:getById',
  'pembelian:create',
  'pembelian:updateStatus',
  'pembelian:delete',
  'pembelian:getLaporan',

  // Backup
  'backup:getAll',
  'backup:create',
  'backup:restore',
  'backup:delete',
  'backup:download',
  'backup:import',

  // Laporan
  'laporan:penjualan',
  'laporan:labaRugi',
  'laporan:produkTerlaris',
  'laporan:stok',
  'laporan:kas',
  'laporan:customer',

  // Activity Log
  'activityLog:getAll',
  'activityLog:getByUsername',
  'activityLog:getByModul',
  'activityLog:search',
  'activityLog:log',
  'activityLog:delete',
  'activityLog:deleteOldLogs',

  // Export
  'export:penjualanExcel',
  'export:penjualanPDF',
  'export:stokExcel',
  'export:stokPDF',
  'export:toExcel',
  'export:toPDF',

  // Scheduler
  'scheduler:runStokCheck',
  'scheduler:runExpiredCheck',
  'scheduler:runBackup',
  'scheduler:runCleanLogs',

  // Barcode
  'barcode:generate',
  'barcode:search',
  'barcode:getSettings',
  'barcode:updateSettings',

  // Payment Methods
  'payment:getAll',
  'payment:create',
  'payment:update',
  'payment:delete',

  // Tax
  'tax:getActive',
  'tax:getAll',
  'tax:setActive',
  'tax:create',

  // Returns
  'return:create',
  'return:getAll',
  'return:approve',
  'return:reject',
  'return:delete',

  // Shifts
  'shift:open',
  'shift:close',
  'shift:getCurrent',
  'shift:getAll',
  'shift:delete',

  // Debts
  'debt:create',
  'debt:addPayment',
  'debt:getAll',
  'debt:getPayments',
  'debt:delete',

  // Stock Opname
  'opname:create',
  'opname:approve',
  'opname:getAll',
  'opname:getDetails',
  'opname:delete',
  'opname:addItem',
  'opname:getItems',

  // Product Images
  'productImage:add',
  'productImage:getByProduct',
  'productImage:delete',
  'productImage:setPrimary',

  // Updates
  'update:check',
  'update:getHistory',

  // Error Logging
  'errorLog:log',
  'errorLog:getAll',
  'errorLog:deleteOld',
  'errorLog:clear',

  // Subscription Plans
  'plan:getAll',
  'plan:getActive',
  'plan:create',
  'plan:update',
  'plan:deactivate',
])

// Expose safe IPC bridge to renderer via window.api
contextBridge.exposeInMainWorld('api', {
  /**
   * Invoke an IPC channel with channel whitelist validation.
   * BLOCKED channels will throw an error immediately without reaching main process.
   */
  invoke: (channel, ...args) => {
    // SECURITY: Validate channel is in whitelist
    if (!ALLOWED_CHANNELS.has(channel)) {
      console.error(`🚫 PRELOAD BLOCKED: Channel "${channel}" is not whitelisted!`)
      return Promise.reject(new Error(`Channel "${channel}" is not allowed`))
    }

    // Only log IPC calls in development — prevents channel name leak in production
    if (isDev) console.log('📡 IPC invoke:', channel)
    return ipcRenderer.invoke(channel, ...args)
  },
})

if (isDev) console.log('✅ window.api exposed successfully (with channel whitelist)')
