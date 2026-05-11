
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
      } catch (err: unknown) {
        if (err instanceof Error && err.message?.includes('duplicate column')) {
          console.log('✓ password_hash_type column already exists')
        } else {
          const message = err instanceof Error ? err.message : String(err)
          console.error('❌ Failed to add password_hash_type column:', message)
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error('Failed to add email column:', message)
          }
        }
      }
      
      const hasNoTelp = columns.some(col => col.name === 'no_telp')
      if (!hasNoTelp) {
        console.log('Adding no_telp column...')
        try {
          sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN no_telp TEXT;`)
          console.log('✓ no_telp column added successfully')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error('Failed to add no_telp column:', message)
          }
        }
      }
      
      const kasCols = sqlite.prepare("PRAGMA table_info(mediasoft_kas_drawer)").all() as Array<{ name: string }>
      if (!kasCols.some(col => col.name === 'total_pemasukan')) {
        console.log('Adding total_pemasukan column to kas_drawer...')
        try {
          sqlite.exec(`ALTER TABLE mediasoft_kas_drawer ADD COLUMN total_pemasukan REAL DEFAULT 0;`)
          console.log('✓ total_pemasukan column added successfully')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error('Failed to add total_pemasukan column:', message)
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

  // ── Advanced Features Migration ──
  try {
  // 1. Struk Settings
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_struk_settings (
      id INTEGER PRIMARY KEY,
      printer_type TEXT DEFAULT 'thermal',
      paper_size TEXT DEFAULT '58mm',
      layout_type TEXT DEFAULT 'classic',
      show_logo INTEGER DEFAULT 1,
      show_alamat INTEGER DEFAULT 1,
      show_telepon INTEGER DEFAULT 1,
      show_email INTEGER DEFAULT 1,
      show_kasir INTEGER DEFAULT 1,
      show_customer INTEGER DEFAULT 1,
      footer_text TEXT DEFAULT 'Terima kasih atas kunjungan Anda',
      qris_image TEXT,
      qris_enabled INTEGER DEFAULT 0,
      updated_at TEXT
    )
  `)
  // Check for missing columns in existing struk_settings
  const strukCols = sqlite.prepare("PRAGMA table_info(mediasoft_struk_settings)").all() as Array<{ name: string }>
  if (!strukCols.some(col => col.name === 'paper_size')) {
    sqlite.exec("ALTER TABLE mediasoft_struk_settings ADD COLUMN paper_size TEXT DEFAULT '58mm'")
  }
  if (!strukCols.some(col => col.name === 'layout_type')) {
    sqlite.exec("ALTER TABLE mediasoft_struk_settings ADD COLUMN layout_type TEXT DEFAULT 'classic'")
  }

  // 2. Currencies
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      exchange_rate REAL DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `)

  // 3. Warehouses
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `)

  // 4. Batches
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_barang_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL,
      batch_no TEXT NOT NULL,
      stok INTEGER DEFAULT 0,
      expired_date TEXT,
      warehouse_id INTEGER,
      created_at TEXT NOT NULL
    )
  `)

  // 5. Serials
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_barang_serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL,
      serial_no TEXT NOT NULL,
      status TEXT DEFAULT 'AVAILABLE',
      warehouse_id INTEGER,
      created_at TEXT NOT NULL
    )
  `)

  // 6. Stock Transfers
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL,
      from_warehouse_id INTEGER,
      to_warehouse_id INTEGER,
      from_branch_id INTEGER,
      to_branch_id INTEGER,
      qty INTEGER DEFAULT 0,
      notes TEXT,
      username TEXT,
      transferred_by TEXT,
      created_at TEXT NOT NULL
    )
  `)
  // Add missing columns for existing databases
  const stCols = sqlite.prepare("PRAGMA table_info(mediasoft_stock_transfers)").all() as Array<{ name: string }>
  if (!stCols.some(col => col.name === 'from_branch_id')) {
    sqlite.exec("ALTER TABLE mediasoft_stock_transfers ADD COLUMN from_branch_id INTEGER")
  }
  if (!stCols.some(col => col.name === 'to_branch_id')) {
    sqlite.exec("ALTER TABLE mediasoft_stock_transfers ADD COLUMN to_branch_id INTEGER")
  }
  if (!stCols.some(col => col.name === 'notes')) {
    sqlite.exec("ALTER TABLE mediasoft_stock_transfers ADD COLUMN notes TEXT")
  }
  if (!stCols.some(col => col.name === 'transferred_by')) {
    sqlite.exec("ALTER TABLE mediasoft_stock_transfers ADD COLUMN transferred_by TEXT")
  }

  // 7. Promos (if not already handled)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL DEFAULT 0,
      min_purchase REAL DEFAULT 0,
      max_discount REAL,
      start_date TEXT,
      end_date TEXT,
      start_time TEXT,
      end_time TEXT,
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      conditions TEXT,
      created_at TEXT NOT NULL
    )
  `)

  // 8. Audit Trail
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    )
  `)

  console.log('✓ Advanced features migrations completed')
  } catch (err: any) {
  console.error('⚠️ Advanced features migration error:', err.message)
  }

  // ── Branch Support Migration ──
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_stok (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kd_barang TEXT NOT NULL,
        jumlah INTEGER DEFAULT 0,
        branch_id INTEGER DEFAULT 1,
        UNIQUE(kd_barang, branch_id)
      )
    `)
    const pjCols = sqlite.prepare("PRAGMA table_info(mediasoft_penjualan)").all() as Array<{ name: string }>
    if (!pjCols.some(col => col.name === 'branch_id')) {
      sqlite.exec("ALTER TABLE mediasoft_penjualan ADD COLUMN branch_id INTEGER DEFAULT 1")
    }
    console.log('✓ Branch support migration completed')
  } catch (err: any) {
    console.error('⚠️ Branch support migration:', err.message)
  }
}

// Run migrations before creating drizzle instance
runMigrations()

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
export { sqlite }
