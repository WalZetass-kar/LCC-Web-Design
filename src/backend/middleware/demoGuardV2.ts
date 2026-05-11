/**
 * ═══════════════════════════════════════════════════════════════════════
 * DEMO GUARD V2 — Centralized IPC Mutation Blocker (Layer 2)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * This guard wraps ALL IPC handlers in the main process.
 * It checks the server-side session (NOT client data) to determine
 * if the current user is in demo mode.
 * 
 * Key security properties:
 * 1. Uses demoSession (main process memory) — renderer can't tamper
 * 2. Blocks based on channel pattern — comprehensive coverage
 * 3. Logs all violation attempts — audit trail
 * 4. Catches errors from deeper layers — consistent error response
 */

import { demoSession } from '../services/demoSessionManager.js'
import type { IpcResponse } from '../../shared/types.js'

/** Standard blocked response — consistent across all layers */
export const DEMO_BLOCKED_RESPONSE: IpcResponse = {
  success: false,
  message: '🔒 Mode Demo (READ ONLY): Aksi ini tidak diizinkan. Silakan login dengan akun biasa untuk menggunakan fitur penuh.',
}

/**
 * EXHAUSTIVE list of all mutation IPC channels.
 * If a channel is in this set, it is BLOCKED for demo users.
 * We use an explicit blocklist rather than a pattern match to prevent false negatives.
 */
const MUTATION_CHANNELS: Set<string> = new Set([
  // Barang (Products)
  'barang:create',
  'barang:update',
  'barang:delete',

  // Kategori
  'kategori:create',
  'kategori:update',
  'kategori:delete',

  // Penjualan (Sales/Transactions)
  'penjualan:create',

  // Identitas (Store settings)
  'identitas:save',

  // WhatsApp
  'whatsapp:save',
  'whatsapp:test',

  // Security
  'security:save',

  // Ecommerce API
  'ecommerce:save',

  // Supplier
  'supplier:create',
  'supplier:update',
  'supplier:delete',

  // User Management
  'user:create',
  'user:update',
  'user:changePassword',
  'user:resetPassword',
  'user:delete',
  'user:toggleStatus',
  'user:savePermissions',

  // Customer
  'customer:create',
  'customer:update',
  'customer:delete',
  'customer:toggleStatus',
  'customer:addPoin',

  // Notifikasi
  'notifikasi:create',
  'notifikasi:markAsRead',
  'notifikasi:markAllAsRead',
  'notifikasi:delete',
  'notifikasi:deleteAll',

  // Kas (Cash drawer)
  'kas:bukaKas',
  'kas:tutupKas',
  'kas:addPengeluaran',
  'kas:addPemasukan',
  'kas:deleteTransaksi',
  'kas:deleteKas',

  // Pembelian (Purchases)
  'pembelian:create',
  'pembelian:updateStatus',
  'pembelian:delete',

  // Backup & Restore
  'backup:create',
  'backup:restore',
  'backup:delete',
  'backup:import',

  // Activity Log
  'activityLog:log',
  'activityLog:delete',
  'activityLog:deleteOldLogs',

  // Scheduler Manual Triggers
  'scheduler:runBackup',
  'scheduler:runCleanLogs',

  // Barcode
  'barcode:generate',
  'barcode:updateSettings',

  // Payment Methods
  'payment:create',
  'payment:update',
  'payment:delete',

  // Tax
  'tax:setActive',
  'tax:create',

  // Returns
  'return:create',
  'return:approve',
  'return:reject',
  'return:delete',

  // Shifts
  'shift:open',
  'shift:close',
  'shift:delete',

  // Debts
  'debt:create',
  'debt:addPayment',
  'debt:delete',

  // Stock Opname
  'opname:create',
  'opname:approve',
  'opname:delete',
  'opname:addItem',

  // Product Images
  'productImage:add',
  'productImage:delete',
  'productImage:setPrimary',

  // Error Log (allow log, block clear/delete)
  'errorLog:deleteOld',
  'errorLog:clear',

  // Tutorials (admin-only mutations)
  'tutorial:create',
  'tutorial:update',
  'tutorial:delete',
// HPP Calculator (delete own record)
'hpp:delete',

// Advanced Features (Mutations)
'currency:create',
'currency:update',
'currency:delete',
'currency:setDefault',

'warehouse:create',
'warehouse:update',
'warehouse:delete',

'inventory:addBatch',
'inventory:updateBatch',
'inventory:deleteBatch',
'inventory:addSerial',
'inventory:updateSerial',
'inventory:deleteSerial',
'inventory:transfer',

'promo:create',
'promo:update',
'promo:delete',
'promo:toggleStatus',

'audit:clear',
'audit:deleteOld',

'mobile:processScan',

// Note: strukSettings channels have custom role-based access control

// See shouldBlockChannel() function
])


/**
* READ-ONLY channels that are always allowed.
* Used as secondary validation.
*/
const READ_CHANNELS: Set<string> = new Set([
// ... rest of read channels
'strukSettings:get',

// Advanced Features (Reads)
'currency:getAll',
'currency:getById',
'currency:getActive',

'warehouse:getAll',
'warehouse:getById',

'inventory:getBatches',
'inventory:getSerials',
'inventory:getTransfers',

'promo:getAll',
'promo:getById',
'promo:getActive',

'audit:getAll',
'audit:getLatest',

'mobile:getSummary',

  'auth:checkIdentitas',
  'auth:logout',

  // Demo session info
  'demo:getStatus',
  'demo:getViolationLog',

  // Barang
  'barang:getAll',
  'barang:search',

  // Kategori
  'kategori:getAll',

  // Satuan
  'satuan:getAll',

  // Penjualan
  'penjualan:getAll',
  'penjualan:getDetail',

  // Dashboard
  'dashboard:getSummary',

  // Identitas
  'identitas:get',

  // Supplier
  'supplier:getAll',
  'supplier:getById',

  // User
  'user:getAll',
  'user:getPermissions',

  // Customer
  'customer:getAll',
  'customer:getById',
  'customer:search',
  'customer:getBirthdayToday',
  'customer:getRiwayatPembelian',

  // Notifikasi
  'notifikasi:getAll',
  'notifikasi:getUnread',
  'notifikasi:getUnreadCount',
  'notifikasi:checkStokMinimum',
  'notifikasi:checkExpiredProducts',

  // Kas
  'kas:getActiveKas',
  'kas:getAllKas',
  'kas:getKasById',
  'kas:getTransaksi',
  'kas:getLaporan',

  // Pembelian
  'pembelian:getAll',
  'pembelian:getById',
  'pembelian:getLaporan',

  // Backup
  'backup:getAll',
  'backup:download',

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

  // Export (read-only)
  'export:penjualanExcel',
  'export:penjualanPDF',
  'export:stokExcel',
  'export:stokPDF',
  'export:toExcel',
  'export:toPDF',

  // Scheduler checks (read-only triggers)
  'scheduler:runStokCheck',
  'scheduler:runExpiredCheck',

  // Barcode
  'barcode:search',
  'barcode:getSettings',

  // Payment Methods
  'payment:getAll',

  // Tax
  'tax:getActive',
  'tax:getAll',

  // Returns
  'return:getAll',

  // Shifts
  'shift:getCurrent',
  'shift:getAll',

  // Debts
  'debt:getAll',
  'debt:getPayments',

  // Stock Opname
  'opname:getAll',
  'opname:getDetails',
  'opname:getItems',

  // Product Images
  'productImage:getByProduct',

  // Updates
  'update:check',
  'update:getHistory',

  // Error Log
  'errorLog:log',
  'errorLog:getAll',

  // Subscription plans (read-only for all users)
  'plan:getAll',
  'plan:getActive',

  // Tutorials (all users can read)
  'tutorial:getAll',
  'tutorial:getById',

  // HPP Calculator (demo users can calculate up to limit, reads always allowed)
  'hpp:calculate',
  'hpp:getHistory',
  'hpp:getUsageCount',

  // Struk Settings (all users can read)
  'strukSettings:get',
])


/**
 * Check if a channel is a mutation (write) operation.
 */
export function isMutationChannel(channel: string): boolean {
  // Explicit check against the mutation set
  if (MUTATION_CHANNELS.has(channel)) return true

  // Fallback pattern check for any NEW channels that might be added later
  // This catches channels like "newFeature:create" that haven't been added to the set yet
  const mutationPatterns = [
    ':create', ':update', ':delete', ':save', ':simpan',
    ':hapus', ':ubah', ':buka', ':tutup', ':bayar',
    ':cicil', ':approve', ':reject', ':reset',
    ':add', ':remove', ':set', ':toggle', ':import',
    ':restore', ':clear', ':open', ':close',
  ]
  
  // Only apply pattern matching for channels NOT in the read set
  if (!READ_CHANNELS.has(channel)) {
    return mutationPatterns.some(p => channel.endsWith(p) || channel.includes(p))
  }

  return false
}

/**
 * Check if a channel should be blocked based on user role.
 * Returns true if the user doesn't have permission.
 */
export function shouldBlockChannel(channel: string): boolean {
  const role = demoSession.getRole()
  
  // Demo users blocked from all mutations
  if (demoSession.isDemoMode()) {
    return isMutationChannel(channel)
  }
  
  // Struk settings: only developer, superadmin, admin, operator allowed
  const strukSettingsChannels = [
    'strukSettings:update',
    'strukSettings:uploadQris',
    'strukSettings:removeQris',
  ]
  
  if (strukSettingsChannels.includes(channel)) {
    const allowedRoles = ['developer', 'superadmin', 'admin', 'operator']
    // Block if role is NOT in allowed list
    return !allowedRoles.includes(role || '')
  }
  
  // All other channels: allow for non-demo users
  return false
}

/**
 * Check if a channel should be blocked for demo users.
 * Returns true if the channel is a mutation AND the user is demo.
 * @deprecated Use shouldBlockChannel instead
 */
export function shouldBlockDemoChannel(channel: string): boolean {
  return shouldBlockChannel(channel)
}

/**
 * Create a demo-guarded IPC handler.
 * Wraps the original handler with demo mode check.
 * 
 * @param channel - The IPC channel name
 * @param handler - The original handler function
 * @returns Wrapped handler that blocks demo users from mutations
 */
export function withDemoGuard<T extends (...args: any[]) => any>(
  channel: string,
  handler: T
): T {
  const wrapped = (async (...args: any[]) => {
    // Check if this channel should be blocked
    if (shouldBlockChannel(channel)) {
      // Log the violation
      demoSession.logViolation(channel, args.slice(1)) // Skip IPC event arg
      
      return { ...DEMO_BLOCKED_RESPONSE }
    }

    // Execute the original handler
    try {
      return await handler(...args)
    } catch (error: any) {
      // Catch demo blocks from the database layer
      if (
        error.code === 'DEMO_WRITE_BLOCKED' ||
        error.message?.includes('DEMO_MODE_BLOCKED')
      ) {
        demoSession.logViolation(`${channel}:db-layer`, args.slice(1))
        return { ...DEMO_BLOCKED_RESPONSE }
      }
      throw error
    }
  }) as unknown as T

  return wrapped
}
