import { Capacitor } from '@capacitor/core'
import { secureStorage } from './secureStorage'

const DB_NAME = 'zetass_pos_secure_store'
const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

let dbPromise: Promise<any | null> | null = null

async function openDb() {
  if (!Capacitor.isNativePlatform()) return null

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const sqliteModule = await import('@capacitor-community/sqlite')
        const sqlite = new sqliteModule.SQLiteConnection(sqliteModule.CapacitorSQLite)
        let db: any
        try {
          db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
        } catch {
          db = await sqlite.retrieveConnection(DB_NAME, false)
        }
        await db.open()
        await db.execute(TABLE_SQL)
        return db
      } catch (error) {
        console.warn('SQLite persistence unavailable, falling back to encrypted localStorage:', error)
        return null
      }
    })()
  }

  return dbPromise
}

export async function getPersistentItem(key: string): Promise<string | null> {
  const secureValue = secureStorage.getItem(key)
  if (secureValue) return secureValue

  const db = await openDb()
  if (!db) return secureStorage.getItem(key)
  const result = await db.query('SELECT value FROM app_kv WHERE key = ? LIMIT 1', [key])
  const row = result.values?.[0]
  return row?.value ?? secureStorage.getItem(key)
}

export async function setPersistentItem(key: string, value: string): Promise<void> {
  secureStorage.setItem(key, value)
  const db = await openDb()
  if (!db) return
  await db.run(
    'INSERT OR REPLACE INTO app_kv (key, value, updated_at) VALUES (?, ?, ?)',
    [key, value, new Date().toISOString()]
  )
}

export async function removePersistentItem(key: string): Promise<void> {
  secureStorage.removeItem(key)
  const db = await openDb()
  if (!db) return
  await db.run('DELETE FROM app_kv WHERE key = ?', [key])
}

export async function estimateStorageUsage() {
  const estimate = typeof navigator !== 'undefined' && 'storage' in navigator
    ? await navigator.storage.estimate()
    : {}

  const usage = estimate.usage ?? 0
  const quota = estimate.quota ?? 0
  return {
    usage,
    quota,
    percent: quota ? Math.round((usage / quota) * 100) : 0,
  }
}
