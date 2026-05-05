import type { IpcResponse } from '../../shared/types'
import { isDemoMode } from './demo'

// Whitelist: Only these operations are allowed in demo mode (READ operations)
const ALLOWED_OPERATIONS = [
  'getAll', 'get', 'search', 'getDetail', 'getById', 
  'getSummary', 'getLaporan', 'getActive', 'getUnread',
  'check', 'download', 'export', 'print',
  'getRiwayat', 'getByProduct', 'getItems', 'getPayments',
  'getCurrent', 'getByModul', 'getByUsername', 'getMigrationStatus',
  'getSettings', 'getPermissions', 'getBirthdayToday',
  'getTransaksi', 'getKasById', 'getAllKas', 'getActiveKas',
  'getUnreadCount'
]

function isReadOperation(channel: string): boolean {
  // If channel contains any allowed operation, it's a read operation
  return ALLOWED_OPERATIONS.some(op => channel.includes(op))
}

/** Typed wrapper around window.api.invoke */
export async function api<T>(channel: string, ...args: unknown[]): Promise<IpcResponse<T>> {
  // Block ALL operations except read operations in demo mode
  if (isDemoMode()) {
    // Special case: allow auth operations
    if (channel.startsWith('auth:')) {
      return window.api.invoke(channel, ...args) as Promise<IpcResponse<T>>
    }
    
    // Block if NOT a read operation
    if (!isReadOperation(channel)) {
      return {
        success: false,
        message: '🔒 Mode Demo: Anda tidak dapat melakukan perubahan data. Silakan login dengan akun biasa untuk menggunakan fitur ini.'
      } as IpcResponse<T>
    }
  }
  
  return window.api.invoke(channel, ...args) as Promise<IpcResponse<T>>
}
