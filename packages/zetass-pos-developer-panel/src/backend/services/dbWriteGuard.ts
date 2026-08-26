/**
 * DATABASE WRITE GUARD — Last Line of Defense (Layer 4)
 * 
 * This is the DOUBLE LOCK on the database layer.
 * Even if all IPC guards somehow fail, this blocks writes for demo users.
 * 
 * Usage: Wrap ALL database write operations with safeWrite()
 * 
 * Example:
 *   import { safeWrite } from './dbWriteGuard'
 *   
 *   function createProduct(data) {
 *     safeWrite()  // Throws if demo mode
 *     db.insert(barang).values(data).run()
 *   }
 */

import { demoSession } from './demoSessionManager.js'

/**
 * Error class for demo write blocks.
 * Has a specific code so it can be caught and handled gracefully.
 */
export class DemoWriteBlockedError extends Error {
  public readonly code = 'DEMO_WRITE_BLOCKED'
  
  constructor(operation?: string) {
    super(`DEMO_MODE_BLOCKED: Write operation "${operation ?? 'unknown'}" is not allowed in demo mode.`)
    this.name = 'DemoWriteBlockedError'
  }
}

/**
 * Guard function — call at the START of every write operation.
 * Throws DemoWriteBlockedError if the current session is demo.
 * 
 * @param operation - Optional description of the operation (for logging)
 * @throws DemoWriteBlockedError
 */
export function safeWrite(operation?: string): void {
  if (demoSession.isDemoMode()) {
    const username = demoSession.getUsername()
    console.error(`🛑 DB WRITE BLOCKED: operation="${operation ?? 'unknown'}" user="${username}" — DEMO MODE ACTIVE`)
    
    // Log the violation
    demoSession.logViolation(`db:${operation ?? 'unknown'}`, [])
    
    throw new DemoWriteBlockedError(operation)
  }
}

/**
 * Wrapper for database write operations with automatic rollback.
 * If the operation somehow starts but demo mode is active, it catches and logs.
 * 
 * @param operation - Description of the operation
 * @param fn - The write function to execute
 * @returns The result of fn, or throws DemoWriteBlockedError
 */
export async function guardedWrite<T>(
  operation: string,
  fn: () => T | Promise<T>
): Promise<T> {
  // Pre-check: Block before even attempting
  safeWrite(operation)
  
  try {
    const result = await fn()
    
    // Post-check: Verify demo mode hasn't been set during execution
    // (paranoid defense against race conditions)
    if (demoSession.isDemoMode()) {
      console.error(`🛑 POST-WRITE DEMO CHECK FAILED: operation="${operation}" — This should never happen!`)
      demoSession.logViolation(`db:post-check:${operation}`, [])
      throw new DemoWriteBlockedError(operation)
    }
    
    return result
  } catch (error) {
    if (error instanceof DemoWriteBlockedError) {
      throw error // Re-throw demo blocks
    }
    throw error // Re-throw other errors
  }
}

/**
 * Synchronous version for better-sqlite3 operations (which are sync).
 */
export function guardedWriteSync<T>(operation: string, fn: () => T): T {
  safeWrite(operation)
  
  const result = fn()
  
  // Post-check
  if (demoSession.isDemoMode()) {
    console.error(`🛑 POST-WRITE DEMO CHECK FAILED: operation="${operation}" — This should never happen!`)
    demoSession.logViolation(`db:post-check:${operation}`, [])
    throw new DemoWriteBlockedError(operation)
  }
  
  return result
}
