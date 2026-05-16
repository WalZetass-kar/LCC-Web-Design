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
  // App
  'app:openExternal',

  // Auth
  'auth:login',
  'auth:checkIdentitas',
  'auth:restoreSession',
  'auth:logout',

  // Demo status
  'demo:getStatus',
  'demo:getViolationLog',

  // Sync
  'sync:getStatus',
  'sync:saveConfig',
  'sync:testConnection',
  'sync:rotateToken',

  // Barang
  'barang:getAll',
  'barang:search',
  'barang:create',
  'barang:update',
  'barang:delete',
  'barang:bulkImport',

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

  // AI Assistant
  'assistant:ask',

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
  'user:block',
  'user:extendAccess',
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

  // Industry Integrations
  'integrations:get',
  'integrations:save',
  'integrations:testGoogleSheets',
  'integrations:exportDashboardToSheets',

  // Scheduler
  'scheduler:runStokCheck',
  'scheduler:runExpiredCheck',
  'scheduler:runDebtCheck',
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
  'payment:createQris',
  'payment:checkStatus',
  'payment:cancelQris',

  // Tax
  'tax:getActive',
  'tax:getAll',
  'tax:setActive',
  'tax:create',
  'tax:update',
  'tax:delete',

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

  // Tutorial
  'tutorial:getAll',
  'tutorial:getById',
  'tutorial:create',
  'tutorial:update',
  'tutorial:delete',

  // HPP Calculator
  'hpp:calculate',
  'hpp:getHistory',
  'hpp:getUsageCount',
  'hpp:delete',

  // Struk Settings
  'strukSettings:get',
  'strukSettings:update',
  'strukSettings:uploadQris',
  'strukSettings:removeQris',

  // System
  'system:checkDb',
  'system:resetData',

  // Satuan CRUD
  'satuan:create',
  'satuan:update',
  'satuan:delete',

  // Dialog
  'dialog:showSaveDialog',

  // Promo/Discount
  'promo:getAll',
  'promo:getActive',
  'promo:create',
  'promo:update',
  'promo:delete',
  'promo:validate',
  'promo:apply',

  // Branch/Multi-outlet
  'branch:getAll',
  'branch:getActive',
  'branch:getWarehouses',
  'branch:getById',
  'branch:create',
  'branch:update',
  'branch:delete',
  'branch:transferStock',

  // Loyalty/Points
  'loyalty:getTiers',
  'loyalty:getCustomerTier',
  'loyalty:calculatePoints',
  'loyalty:redeemPoints',
  'loyalty:createTier',
  'loyalty:updateTier',
  'loyalty:deleteTier',

  // Currency
  'currency:getAll',
  'currency:getActive',
  'currency:create',
  'currency:update',
  'currency:delete',
  'currency:setDefault',

  // Inventory / Warehouse
  'warehouse:getAll',
  'warehouse:create',
  'inventory:getBatches',
  'inventory:addBatch',
  'inventory:getSerials',
  'inventory:addSerial',
  'inventory:transfer',

  // Audit Trail
  'audit:getAll',
  'audit:log',
  'audit:clear',

  // Mobile App
  'mobile:getSummary',
  'mobile:processScan',

  // WhatsApp Settings
  'whatsapp:get',
  'whatsapp:save',
  'whatsapp:test',
  // Security Settings
  'security:get',
  'security:save',
  // Ecommerce API Settings
  'ecommerce:get',
  'ecommerce:save',
  // Print
  'print:getPrinters',
  'print:execute',
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
