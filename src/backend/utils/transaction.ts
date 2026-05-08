import { sqlite } from '../../database/connection.js'

/**
 * Execute multiple database operations in a transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  operations: () => T | Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    sqlite.exec('BEGIN TRANSACTION')
    const result = await Promise.resolve(operations())
    sqlite.exec('COMMIT')
    return { success: true, data: result }
  } catch (error) {
    sqlite.exec('ROLLBACK')
    return { success: false, error: String(error) }
  }
}

/**
 * Execute operations with optimistic locking
 * Checks version before update to prevent concurrent modification
 */
export function withOptimisticLock<T>(
  table: string,
  id: string | number,
  idColumn: string,
  expectedVersion: number,
  updateFn: () => T
): { success: true; data: T } | { success: false; error: string } {
  try {
    // Check current version
    const row = sqlite.prepare(`SELECT version FROM ${table} WHERE ${idColumn} = ?`).get(id) as { version?: number } | undefined
    
    if (!row) {
      return { success: false, error: 'Record not found' }
    }
    
    if (row.version !== expectedVersion) {
      return { success: false, error: 'Record has been modified by another user. Please refresh and try again.' }
    }
    
    // Execute update
    const result = updateFn()
    
    // Increment version
    sqlite.prepare(`UPDATE ${table} SET version = version + 1 WHERE ${idColumn} = ?`).run(id)
    
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Batch insert with transaction
 */
export function batchInsert<T extends Record<string, any>>(
  table: string,
  records: T[]
): { success: boolean; inserted: number; error?: string } {
  if (records.length === 0) {
    return { success: true, inserted: 0 }
  }
  
  try {
    sqlite.exec('BEGIN TRANSACTION')
    
    const columns = Object.keys(records[0])
    const placeholders = columns.map(() => '?').join(', ')
    const stmt = sqlite.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
    
    let inserted = 0
    for (const record of records) {
      const values = columns.map(col => record[col])
      stmt.run(...values)
      inserted++
    }
    
    sqlite.exec('COMMIT')
    return { success: true, inserted }
  } catch (error) {
    sqlite.exec('ROLLBACK')
    return { success: false, inserted: 0, error: String(error) }
  }
}

/**
 * Batch update with transaction
 */
export function batchUpdate<T extends Record<string, any>>(
  table: string,
  idColumn: string,
  records: T[]
): { success: boolean; updated: number; error?: string } {
  if (records.length === 0) {
    return { success: true, updated: 0 }
  }
  
  try {
    sqlite.exec('BEGIN TRANSACTION')
    
    let updated = 0
    for (const record of records) {
      const { [idColumn]: id, ...data } = record
      const columns = Object.keys(data)
      const setClause = columns.map(col => `${col} = ?`).join(', ')
      const values = [...columns.map(col => (data as any)[col]), id]
      
      sqlite.prepare(`UPDATE ${table} SET ${setClause} WHERE ${idColumn} = ?`).run(...values)
      updated++
    }
    
    sqlite.exec('COMMIT')
    return { success: true, updated }
  } catch (error) {
    sqlite.exec('ROLLBACK')
    return { success: false, updated: 0, error: String(error) }
  }
}

/**
 * Batch delete with transaction
 */
export function batchDelete(
  table: string,
  idColumn: string,
  ids: (string | number)[]
): { success: boolean; deleted: number; error?: string } {
  if (ids.length === 0) {
    return { success: true, deleted: 0 }
  }
  
  try {
    sqlite.exec('BEGIN TRANSACTION')
    
    const placeholders = ids.map(() => '?').join(', ')
    const result = sqlite.prepare(`DELETE FROM ${table} WHERE ${idColumn} IN (${placeholders})`).run(...ids)
    
    sqlite.exec('COMMIT')
    return { success: true, deleted: result.changes }
  } catch (error) {
    sqlite.exec('ROLLBACK')
    return { success: false, deleted: 0, error: String(error) }
  }
}
