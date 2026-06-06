import type { IpcMainInvokeEvent } from 'electron'
import type { IpcResponse } from '../../shared/types'

// READ operations that are allowed in demo mode
const READ_OPERATIONS = [
  'getAll', 'get', 'search', 'getDetail', 'getById', 
  'getSummary', 'getLaporan', 'getActive', 'getUnread',
  'check', 'getRiwayat', 'getByProduct', 'getItems',
  'getPayments', 'getCurrent', 'getByModul', 'getByUsername',
  'getMigrationStatus', 'getSettings', 'getPermissions',
  'getBirthdayToday', 'getTransaksiByKas', 'getKasById',
  'getAllKas', 'getActiveKas'
]

/**
 * Check if channel is a read operation
 */
function isReadOperation(channel: string): boolean {
  return READ_OPERATIONS.some(op => channel.includes(op))
}

/**
 * Check if channel is auth operation (always allowed)
 */
function isAuthOperation(channel: string): boolean {
  return channel.startsWith('auth:')
}

/**
 * Extract username from handler arguments
 */
function extractUsername(args: any[]): string | null {
  if (!args || args.length === 0) return null
  
  const firstArg = args[0]
  
  // Direct username string
  if (typeof firstArg === 'string') return firstArg
  
  // Object with username field
  if (firstArg?.username) return firstArg.username
  if (firstArg?.nama_pengguna) return firstArg.nama_pengguna
  if (firstArg?.user?.nama_pengguna) return firstArg.user.nama_pengguna
  
  return null
}

/**
 * Global IPC guard for demo mode
 * Wraps any IPC handler and blocks write operations for demo users
 */
export function demoGuard<T>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<IpcResponse<T>> | IpcResponse<T>
) {
  return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<IpcResponse<T>> => {
    // Allow auth operations
    if (isAuthOperation(channel)) {
      return handler(event, ...args)
    }
    
    // Allow read operations
    if (isReadOperation(channel)) {
      return handler(event, ...args)
    }
    
    // For write operations, check if user is demo
    const username = extractUsername(args)
    if (username === 'demo') {
      return {
        success: false,
        message: '🔒 Mode Demo: Anda tidak dapat melakukan perubahan data. Silakan login dengan akun biasa untuk menggunakan fitur ini.'
      } as IpcResponse<T>
    }
    
    // Execute handler
    try {
      return await handler(event, ...args)
    } catch (error: any) {
      // Catch demo mode errors from deeper layers
      if (error.message?.includes('DEMO_MODE_BLOCKED')) {
        return {
          success: false,
          message: '🔒 Mode Demo: Anda tidak dapat melakukan perubahan data. Silakan login dengan akun biasa untuk menggunakan fitur ini.'
        } as IpcResponse<T>
      }
      throw error
    }
  }
}

/**
 * Simple check if operation should be blocked
 */
export function shouldBlockDemo(channel: string, username?: string): boolean {
  if (username !== 'demo') return false
  if (isAuthOperation(channel)) return false
  if (isReadOperation(channel)) return false
  return true
}
