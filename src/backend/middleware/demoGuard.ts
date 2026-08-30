import type { IpcMainInvokeEvent } from 'electron'
import type { IpcResponse } from '../../shared/types'

// List of write operations that should be blocked in demo mode
const WRITE_OPERATIONS = [
  'create', 'update', 'delete', 'save', 'simpan', 'hapus', 'ubah',
  'buka', 'tutup', 'bayar', 'cicil', 'approve', 'reject', 'reset'
]

function isWriteOperation(channel: string): boolean {
  return WRITE_OPERATIONS.some(op => channel.includes(op))
}

/**
 * Demo mode guard middleware for IPC handlers
 * Blocks all write operations for demo users
 */
export function demoGuard<T>(
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<IpcResponse<T>>
) {
  return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<IpcResponse<T>> => {
    const channel = event.sender.getURL() // Get channel info
    const userData = args[0]?.username || args[0]?.user || null
    
    // Check if this is a write operation
    if (isWriteOperation(event.frameId.toString())) {
      // Get user role from session or args
      const userRole = getUserRole(args)
      
      if (userRole === 'demo') {
        return {
          success: false,
          message: ' Mode Demo: Anda tidak dapat melakukan perubahan data. Silakan login dengan akun biasa untuk menggunakan fitur ini.'
        } as IpcResponse<T>
      }
    }
    
    // Execute original handler
    return handler(event, ...args)
  }
}

/**
 * Extract user role from handler arguments
 */
function getUserRole(args: any[]): string | null {
  // Check first argument for username
  if (args[0]?.username) {
    // This would need to query database to get role
    // For now, check if username is 'demo'
    if (args[0].username === 'demo') return 'demo'
  }
  
  // Check for user object
  if (args[0]?.user?.hak_akses) {
    return args[0].user.hak_akses
  }
  
  return null
}

/**
 * Simple wrapper to check if operation should be blocked
 */
export function isDemoBlocked(channel: string, username?: string): boolean {
  return isWriteOperation(channel) && username === 'demo'
}
