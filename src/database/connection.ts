
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import { app } from 'electron'
import * as schema from './schema.js'

// Resolve DB path: use app resources in production, project root in dev
function getDbPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sistem_pos.db')
  }
  return path.join(process.cwd(), 'sistem_pos.db')
}

const sqlite = new Database(getDbPath())
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Run migrations on startup
function runMigrations() {
  try {
    // Check if password_hash_type column exists
    const columns = sqlite.prepare("PRAGMA table_info(mediasoft_pengguna)").all() as Array<{ name: string }>
    const hasPasswordHashType = columns.some(col => col.name === 'password_hash_type')
    
    if (!hasPasswordHashType) {
      console.log('⚠️  CRITICAL: password_hash_type column is missing!')
      console.log('Adding password_hash_type column...')
      try {
        sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';`)
        sqlite.exec(`UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;`)
        console.log('✓ password_hash_type column added successfully')
      } catch (err: any) {
        if (err.message?.includes('duplicate column')) {
          console.log('✓ password_hash_type column already exists')
        } else {
          console.error('❌ Failed to add password_hash_type column:', err.message)
          console.error('Please close all database connections and restart the app')
          throw new Error('Database migration failed: password_hash_type column is required but could not be added')
        }
      }
    } else {
      console.log('✓ password_hash_type column exists')
    }
    
    const hasEmail = columns.some(col => col.name === 'email')
    if (!hasEmail) {
      console.log('Adding email column...')
      try {
        sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN email TEXT;`)
        console.log('✓ email column added successfully')
      } catch (err: any) {
        if (!err.message?.includes('duplicate column')) {
          console.error('Failed to add email column:', err.message)
        }
      }
    }
    
    const hasNoTelp = columns.some(col => col.name === 'no_telp')
    if (!hasNoTelp) {
      console.log('Adding no_telp column...')
      try {
        sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN no_telp TEXT;`)
        console.log('✓ no_telp column added successfully')
      } catch (err: any) {
        if (!err.message?.includes('duplicate column')) {
          console.error('Failed to add no_telp column:', err.message)
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Migration error:', error.message)
    throw error // Throw critical errors to prevent app from starting with broken schema
  }

  // ── Subscription Plans table ──
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_subscription_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        duration_days INTEGER NOT NULL,
        features TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        is_recommended INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `)
    // Seed default plans if table is empty
    const count = sqlite.prepare('SELECT COUNT(*) as cnt FROM mediasoft_subscription_plans').get() as { cnt: number }
    if (count.cnt === 0) {
      const now = new Date().toISOString()
      sqlite.prepare(`INSERT INTO mediasoft_subscription_plans (name, price, duration_days, features, is_active, is_recommended, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run('Harian', 15000, 1, JSON.stringify(['Transaksi tak terbatas', 'Export laporan dasar', 'Support email']), 1, 0, now)
      sqlite.prepare(`INSERT INTO mediasoft_subscription_plans (name, price, duration_days, features, is_active, is_recommended, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run('Bulanan', 299000, 30, JSON.stringify(['Semua fitur Harian', 'Multi-user (3 akun)', 'Export Excel & PDF', 'Laporan lanjutan', 'Backup otomatis', 'Support prioritas']), 1, 1, now)
      sqlite.prepare(`INSERT INTO mediasoft_subscription_plans (name, price, duration_days, features, is_active, is_recommended, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run('Tahunan', 2899000, 365, JSON.stringify(['Semua fitur Bulanan', 'Multi-user (unlimited)', 'Stok opname', 'Manajemen hutang', 'Shift management', 'API access', 'Support 24/7']), 1, 0, now)
      console.log('✓ Seeded default subscription plans')
    }
  } catch (err: any) {
    console.error('⚠️ Subscription plans migration:', err.message)
  }
}

// Run migrations before creating drizzle instance
runMigrations()

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
export { sqlite }
