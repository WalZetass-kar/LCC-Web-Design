
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import * as schema from './schema.js'

function copyBundledDatabaseIfNeeded(targetPath: string) {
  if (fs.existsSync(targetPath)) return

  const bundledPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sistem_pos.db')
    : path.join(process.cwd(), 'sistem_pos.db')

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })

  if (fs.existsSync(bundledPath)) {
    fs.copyFileSync(bundledPath, targetPath)
  }
}

// Resolve DB path: packaged apps must write to userData, not install resources.
function getDbPath(): string {
  if (app.isPackaged) {
    const userDbPath = path.join(app.getPath('userData'), 'sistem_pos.db')
    copyBundledDatabaseIfNeeded(userDbPath)
    return userDbPath
  }
  return path.join(process.cwd(), 'sistem_pos.db')
}

const sqlite = new Database(getDbPath())
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Run migrations on startup
function runMigrations() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_pengguna (
        nama_pengguna TEXT PRIMARY KEY,
        kata_sandi TEXT,
        nama_lengkap TEXT,
        tgl_wkt_simpan TEXT,
        tgl_wkt_edit TEXT,
        status_user TEXT NOT NULL DEFAULT 'Aktif',
        terakhir_login TEXT,
        hak_akses TEXT NOT NULL DEFAULT 'kasir',
        email TEXT,
        no_telp TEXT,
        access_expires_at TEXT,
        password_hash_type TEXT DEFAULT 'sha1',
        must_change_password INTEGER DEFAULT 0,
        pin_hash TEXT,
        pin_hash_type TEXT DEFAULT 'bcrypt',
        pin_enabled INTEGER DEFAULT 0
      )
    `)

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_activity_log (
        kd_log INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        aktivitas TEXT NOT NULL,
        modul TEXT NOT NULL,
        tgl_aktivitas TEXT NOT NULL,
        ip_address TEXT,
        device_id TEXT,
        user_agent TEXT,
        detail TEXT
      )
    `)

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

    const hasMustChangePassword = columns.some(col => col.name === 'must_change_password')
    if (!hasMustChangePassword) {
      console.log('Adding must_change_password column...')
      try {
        sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN must_change_password INTEGER DEFAULT 0;`)
        sqlite.exec(`
          UPDATE mediasoft_pengguna
          SET must_change_password = 1
          WHERE COALESCE(status_user, 'Aktif') = 'Aktif'
        `)
        console.log('✓ must_change_password column added successfully')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (!message.includes('duplicate column')) {
          console.error('Failed to add must_change_password column:', message)
        }
      }
    }

    const ensurePenggunaColumn = (name: string, definition: string) => {
      if (!columns.some(col => col.name === name)) {
        console.log(`Adding ${name} column to mediasoft_pengguna...`)
        try {
          sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN ${name} ${definition};`)
          console.log(`✓ ${name} column added successfully`)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error(`Failed to add ${name} column:`, message)
          }
        }
      }
    }

    ensurePenggunaColumn('pin_hash', 'TEXT')
    ensurePenggunaColumn('pin_hash_type', "TEXT DEFAULT 'bcrypt'")
    ensurePenggunaColumn('pin_enabled', 'INTEGER DEFAULT 0')

    const activityColumns = sqlite.prepare("PRAGMA table_info(mediasoft_activity_log)").all() as Array<{ name: string }>
    const ensureActivityColumn = (name: string, definition: string) => {
      if (!activityColumns.some(col => col.name === name)) {
        console.log(`Adding ${name} column to mediasoft_activity_log...`)
        try {
          sqlite.exec(`ALTER TABLE mediasoft_activity_log ADD COLUMN ${name} ${definition};`)
          console.log(`✓ ${name} column added successfully`)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error(`Failed to add ${name} column:`, message)
          }
        }
      }
    }

    ensureActivityColumn('device_id', 'TEXT')
    ensureActivityColumn('user_agent', 'TEXT')

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mediasoft_auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        issued_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        last_seen_at TEXT,
        ip_address TEXT,
        device_id TEXT,
        device_name TEXT,
        user_agent TEXT
      )
    `)
    
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

      const hasAccessExpiresAt = columns.some(col => col.name === 'access_expires_at')
      if (!hasAccessExpiresAt) {
        console.log('Adding access_expires_at column...')
        try {
          sqlite.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN access_expires_at TEXT;`)
          console.log('✓ access_expires_at column added successfully')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error('Failed to add access_expires_at column:', message)
          }
        }
      }

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS mediasoft_grup_pengguna (
          nama_grup TEXT PRIMARY KEY
        )
      `)
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS mediasoft_grup_pengguna_hak_akses (
          nama_grup TEXT NOT NULL,
          menu_code TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'True',
          PRIMARY KEY (nama_grup, menu_code)
        )
      `)

      const userPrefsSql = sqlite.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'mediasoft_user_preferences'"
      ).get() as { sql?: string } | undefined
      if (userPrefsSql?.sql?.includes('REFERENCES mediasoft_pengguna(id)')) {
        console.log('Rebuilding user preferences table with valid pengguna foreign key...')
        sqlite.pragma('foreign_keys = OFF')
        try {
          sqlite.exec(`
            ALTER TABLE mediasoft_user_preferences RENAME TO mediasoft_user_preferences_old;
            CREATE TABLE mediasoft_user_preferences (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              preference_key TEXT NOT NULL,
              preference_value TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES mediasoft_pengguna(nama_pengguna) ON DELETE CASCADE,
              UNIQUE(user_id, preference_key)
            );
            INSERT OR IGNORE INTO mediasoft_user_preferences (user_id, preference_key, preference_value, created_at, updated_at)
            SELECT CAST(user_id AS TEXT), preference_key, preference_value, created_at, updated_at
            FROM mediasoft_user_preferences_old
            WHERE CAST(user_id AS TEXT) IN (SELECT nama_pengguna FROM mediasoft_pengguna);
            DROP TABLE mediasoft_user_preferences_old;
          `)
        } finally {
          sqlite.pragma('foreign_keys = ON')
        }
        console.log('✓ user preferences foreign key fixed')
      } else {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS mediasoft_user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            preference_key TEXT NOT NULL,
            preference_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES mediasoft_pengguna(nama_pengguna) ON DELETE CASCADE,
            UNIQUE(user_id, preference_key)
          )
        `)
      }

      const paymentDetailsSql = sqlite.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'mediasoft_payment_details'"
      ).get() as { sql?: string } | undefined
      if (paymentDetailsSql?.sql?.includes('REFERENCES mediasoft_penjualan(id)')) {
        console.log('Rebuilding payment details table with valid penjualan foreign key...')
        sqlite.pragma('foreign_keys = OFF')
        try {
          sqlite.exec(`
            ALTER TABLE mediasoft_payment_details RENAME TO mediasoft_payment_details_old;
            CREATE TABLE mediasoft_payment_details (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              penjualan_id TEXT NOT NULL,
              payment_method_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              reference_number TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (penjualan_id) REFERENCES mediasoft_penjualan(kd_tansaksi_jual) ON DELETE CASCADE,
              FOREIGN KEY (payment_method_id) REFERENCES mediasoft_payment_methods(id)
            );
            INSERT OR IGNORE INTO mediasoft_payment_details (penjualan_id, payment_method_id, amount, reference_number, created_at)
            SELECT CAST(penjualan_id AS TEXT), payment_method_id, amount, reference_number, created_at
            FROM mediasoft_payment_details_old
            WHERE CAST(penjualan_id AS TEXT) IN (SELECT kd_tansaksi_jual FROM mediasoft_penjualan)
              AND payment_method_id IN (SELECT id FROM mediasoft_payment_methods);
            DROP TABLE mediasoft_payment_details_old;
          `)
        } finally {
          sqlite.pragma('foreign_keys = ON')
        }
        console.log('✓ payment details foreign key fixed')
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

      const penjualanCols = sqlite.prepare("PRAGMA table_info(mediasoft_penjualan)").all() as Array<{ name: string }>
      if (!penjualanCols.some(col => col.name === 'discount_amount')) {
        console.log('Adding discount_amount column to penjualan...')
        try {
          sqlite.exec(`ALTER TABLE mediasoft_penjualan ADD COLUMN discount_amount REAL DEFAULT 0;`)
          console.log('✓ discount_amount column added successfully')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error('Failed to add discount_amount column:', message)
          }
        }
      }
      if (!penjualanCols.some(col => col.name === 'shift_id')) {
        console.log('Adding shift_id column to penjualan...')
        try {
          sqlite.exec(`ALTER TABLE mediasoft_penjualan ADD COLUMN shift_id INTEGER;`)
          console.log('✓ shift_id column added successfully')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes('duplicate column')) {
            console.error('Failed to add shift_id column:', message)
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
  // Payment gateway settings
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_payment_gateway_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      provider TEXT DEFAULT 'midtrans',
      server_key TEXT DEFAULT '',
      client_key TEXT DEFAULT '',
      is_production INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 0,
      updated_at TEXT
    )
  `)
  sqlite.prepare('INSERT OR IGNORE INTO mediasoft_payment_gateway_settings (id) VALUES (1)').run()

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
  const ensureStrukColumn = (name: string, definition: string) => {
    if (!strukCols.some(col => col.name === name)) {
      sqlite.exec(`ALTER TABLE mediasoft_struk_settings ADD COLUMN ${name} ${definition}`)
    }
  }
  ensureStrukColumn('printer_type', "TEXT DEFAULT 'thermal'")
  ensureStrukColumn('paper_size', "TEXT DEFAULT '58mm'")
  ensureStrukColumn('layout_type', "TEXT DEFAULT 'classic'")
  ensureStrukColumn('show_logo', 'INTEGER DEFAULT 1')
  ensureStrukColumn('show_alamat', 'INTEGER DEFAULT 1')
  ensureStrukColumn('show_telepon', 'INTEGER DEFAULT 1')
  ensureStrukColumn('show_email', 'INTEGER DEFAULT 1')
  ensureStrukColumn('show_kasir', 'INTEGER DEFAULT 1')
  ensureStrukColumn('show_customer', 'INTEGER DEFAULT 1')
  ensureStrukColumn('footer_text', "TEXT DEFAULT 'Terima kasih atas kunjungan Anda'")
  ensureStrukColumn('qris_image', 'TEXT')
  ensureStrukColumn('qris_enabled', 'INTEGER DEFAULT 0')
  ensureStrukColumn('updated_at', 'TEXT')
  sqlite.prepare('INSERT OR IGNORE INTO mediasoft_struk_settings (id, updated_at) VALUES (1, ?)').run(new Date().toISOString())

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

// Add license server config columns to identitas table
;(function addLicenseColumns() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_identitas (
      kode INTEGER PRIMARY KEY,
      namatoko TEXT,
      alamattoko TEXT,
      nomortelptoko TEXT,
      nomorwaowner TEXT,
      alamatemailowner TEXT,
      logo TEXT,
      npwp TEXT,
      pajak_persen REAL DEFAULT 0,
      auto_barcode INTEGER DEFAULT 1,
      barcode_prefix TEXT DEFAULT 'POS',
      auto_print INTEGER DEFAULT 0,
      struk_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda',
      auto_backup INTEGER DEFAULT 1,
      backup_retention INTEGER DEFAULT 7,
      notif_stok INTEGER DEFAULT 1,
      min_stok INTEGER DEFAULT 5
    )
  `)
  const cols = sqlite.prepare('PRAGMA table_info(mediasoft_identitas)').all() as Array<{ name: string }>
  const names = cols.map(c => c.name)
  if (!names.includes('license_server_url')) {
    sqlite.exec(`ALTER TABLE mediasoft_identitas ADD COLUMN license_server_url TEXT`)
  }
  if (!names.includes('license_admin_token')) {
    sqlite.exec(`ALTER TABLE mediasoft_identitas ADD COLUMN license_admin_token TEXT`)
  }
  if (!names.includes('license_admin_refresh_token')) {
    sqlite.exec(`ALTER TABLE mediasoft_identitas ADD COLUMN license_admin_refresh_token TEXT`)
  }
})()

// License integration migration (idempotent)
;(function licenseIntegrationMigration() {
  function addCol(table: string, col: string, def: string) {
    const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    if (!cols.some(c => c.name === col)) {
      try {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
      } catch (err: any) {
        console.error(`⚠️ License migration failed for ${table}.${col}:`, err.message)
      }
    }
  }

  function tableExists(table: string): boolean {
    const row = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table) as { name?: string } | undefined
    return !!row?.name
  }

  function ensureSyncMetadata(table: string) {
    if (!tableExists(table)) return
    addCol(table, 'created_at', 'TEXT DEFAULT NULL')
    addCol(table, 'updated_at', 'TEXT DEFAULT NULL')
    addCol(table, 'synced_at', 'TEXT DEFAULT NULL')
    addCol(table, 'device_id', 'TEXT DEFAULT NULL')
  }

  // mediasoft_pengguna
  addCol('mediasoft_pengguna', 'subscription_plan_id', 'INTEGER DEFAULT NULL')
  addCol('mediasoft_pengguna', 'subscription_expires_at', 'TEXT DEFAULT NULL')
  addCol('mediasoft_pengguna', 'is_buyer', 'INTEGER DEFAULT 0')

  // mediasoft_auth_sessions
  addCol('mediasoft_auth_sessions', 'platform', 'TEXT DEFAULT NULL')
  addCol('mediasoft_auth_sessions', 'os_name', 'TEXT DEFAULT NULL')
  addCol('mediasoft_auth_sessions', 'app_version', 'TEXT DEFAULT NULL')
  addCol('mediasoft_auth_sessions', 'is_revoked', 'INTEGER DEFAULT 0')
  sqlite.exec(`UPDATE mediasoft_auth_sessions SET is_revoked = 0 WHERE is_revoked IS NULL`)

  // mediasoft_subscription_plans
  addCol('mediasoft_subscription_plans', 'max_devices', 'INTEGER DEFAULT 1')
  addCol('mediasoft_subscription_plans', 'max_transactions_per_day', 'INTEGER DEFAULT -1')
  addCol('mediasoft_subscription_plans', 'max_products', 'INTEGER DEFAULT -1')
  addCol('mediasoft_subscription_plans', 'max_users', 'INTEGER DEFAULT 1')
  addCol('mediasoft_subscription_plans', 'feature_flags', "TEXT DEFAULT '{}'")

  sqlite.prepare(`
    UPDATE mediasoft_subscription_plans
    SET max_devices = 1,
        max_transactions_per_day = 20,
        max_products = 30,
        max_users = 1,
        feature_flags = ?
    WHERE name = 'Harian' AND (feature_flags IS NULL OR feature_flags = '{}')
  `).run(JSON.stringify({
    reports: false,
    export_excel: false,
    export_pdf: false,
    multi_user: false,
    backup: false,
    stock_opname: false,
    debt_management: false,
    shift_management: false,
    api_access: false,
  }))
  sqlite.prepare(`
    UPDATE mediasoft_subscription_plans
    SET max_devices = 2,
        max_transactions_per_day = -1,
        max_products = 500,
        max_users = 2,
        feature_flags = ?
    WHERE name = 'Bulanan' AND (feature_flags IS NULL OR feature_flags = '{}')
  `).run(JSON.stringify({
    reports: true,
    export_excel: true,
    export_pdf: true,
    multi_user: true,
    backup: true,
    stock_opname: false,
    debt_management: false,
    shift_management: false,
    api_access: false,
  }))
  sqlite.prepare(`
    UPDATE mediasoft_subscription_plans
    SET max_devices = -1,
        max_transactions_per_day = -1,
        max_products = -1,
        max_users = -1,
        feature_flags = ?
    WHERE name = 'Tahunan' AND (feature_flags IS NULL OR feature_flags = '{}')
  `).run(JSON.stringify({
    reports: true,
    export_excel: true,
    export_pdf: true,
    multi_user: true,
    backup: true,
    restore: true,
    stock_opname: true,
    debt_management: true,
    shift_management: true,
    api_access: true,
    multi_branch: true,
    return_refund: true,
  }))

  const lifetimeFlags = JSON.stringify({
    reports: true,
    export_excel: true,
    export_pdf: true,
    multi_user: true,
    backup: true,
    restore: true,
    stock_opname: true,
    debt_management: true,
    shift_management: true,
    api_access: true,
    multi_branch: true,
    return_refund: true,
  })
  const lifetimePlan = sqlite.prepare(
    `SELECT id FROM mediasoft_subscription_plans WHERE name = 'Sekali Beli Seumur Hidup' LIMIT 1`
  ).get() as { id: number } | undefined
  if (!lifetimePlan) {
    sqlite.prepare(`
      INSERT INTO mediasoft_subscription_plans
        (name, price, duration_days, features, is_active, is_recommended, created_at,
         max_devices, max_transactions_per_day, max_products, max_users, feature_flags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Sekali Beli Seumur Hidup',
      4999000,
      0,
      JSON.stringify([
        'Sekali bayar',
        'Akses permanen tanpa tanggal habis',
        'Semua fitur operasional aktif',
        'Multi-user dan multi cabang',
        'Backup/restore, laporan, retur, hutang/piutang, shift, dan API',
      ]),
      1,
      0,
      new Date().toISOString(),
      5,
      -1,
      -1,
      10,
      lifetimeFlags,
    )
  }

  const trialFlags = JSON.stringify({
    reports: false,
    export_excel: false,
    export_pdf: false,
    multi_user: false,
    backup: false,
    restore: false,
    stock_opname: false,
    debt_management: false,
    shift_management: false,
    api_access: false,
    multi_branch: false,
    return_refund: false,
  })
  const trialPlan = sqlite.prepare(
    `SELECT id FROM mediasoft_subscription_plans WHERE name = 'Trial 3 Hari' LIMIT 1`
  ).get() as { id: number } | undefined
  if (!trialPlan) {
    sqlite.prepare(`
      INSERT INTO mediasoft_subscription_plans
        (name, price, duration_days, features, is_active, is_recommended, created_at,
         max_devices, max_transactions_per_day, max_products, max_users, feature_flags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Trial 3 Hari',
      0,
      3,
      JSON.stringify([
        'Trial terbatas 3 hari',
        '1 device',
        '20 transaksi per hari',
        '30 produk',
        'Fitur premium terkunci',
      ]),
      0,
      0,
      new Date().toISOString(),
      1,
      20,
      30,
      1,
      trialFlags,
    )
  }

  // mediasoft_activity_log
  addCol('mediasoft_activity_log', 'event_type', "TEXT DEFAULT 'general'")

  // mediasoft_ecommerce_api
  addCol('mediasoft_ecommerce_api', 'whatsapp_number', 'TEXT DEFAULT NULL')
  addCol('mediasoft_ecommerce_api', 'payment_link', 'TEXT DEFAULT NULL')
  addCol('mediasoft_ecommerce_api', 'auto_activate', 'INTEGER DEFAULT 0')
  addCol('mediasoft_ecommerce_api', 'activation_plan_id', 'INTEGER DEFAULT NULL')

  // Tabel baru: user_devices
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_user_devices (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL,
      device_id     TEXT NOT NULL,
      device_name   TEXT,
      platform      TEXT,
      os_name       TEXT,
      app_version   TEXT,
      ip_address    TEXT,
      last_seen_at  TEXT,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      status        TEXT NOT NULL DEFAULT 'active',
      revoked_at    TEXT,
      revoked_by    TEXT,
      UNIQUE(username, device_id)
    )
  `)
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_user_devices_username ON mediasoft_user_devices(username)`)
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_user_devices_status ON mediasoft_user_devices(status)`)
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON mediasoft_user_devices(last_seen_at)`)
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_device ON mediasoft_auth_sessions(username, device_id)`)
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON mediasoft_activity_log(event_type, tgl_aktivitas)`)

  // Tabel baru: popup_rules
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mediasoft_popup_rules (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      code            TEXT NOT NULL UNIQUE,
      title           TEXT NOT NULL,
      description     TEXT,
      cta_text        TEXT DEFAULT 'Upgrade Sekarang',
      cta_url         TEXT,
      whatsapp_number TEXT,
      pricing_html    TEXT,
      is_active       INTEGER DEFAULT 1,
      trigger_on      TEXT DEFAULT '{}',
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `)

  // Seed popup rules
  const popups = [
    ['DEMO_LIMIT',    'Batas Demo Tercapai',   'Anda telah mencapai batas akun demo. Upgrade untuk akses penuh.'],
    ['ACCESS_EXPIRING', 'Trial Hampir Habis', 'Trial Anda segera berakhir. Upgrade sekarang agar transaksi dan data toko tetap berjalan.'],
    ['EXPIRED',       'Langganan Habis',        'Masa langganan Anda sudah berakhir. Perpanjang untuk melanjutkan.'],
    ['FEATURE_LOCKED','Fitur Ini Terkunci',     'Fitur ini tidak tersedia di paket Anda saat ini.'],
    ['DEVICE_LIMIT',  'Batas Device Tercapai',  'Anda telah mencapai batas jumlah device untuk paket ini.'],
    ['TRANSACTION_LIMIT', 'Limit Transaksi Tercapai', 'Limit transaksi harian paket Anda sudah habis. Upgrade paket untuk melanjutkan transaksi.'],
    ['PRODUCT_LIMIT', 'Limit Produk Tercapai', 'Limit jumlah produk paket Anda sudah habis. Upgrade paket untuk menambah produk.'],
  ]
  const insertPopup = sqlite.prepare(
    `INSERT OR IGNORE INTO mediasoft_popup_rules (code, title, description) VALUES (?, ?, ?)`
  )
  for (const [code, title, desc] of popups) insertPopup.run(code, title, desc)

  for (const table of [
    'mediasoft_pengguna',
    'mediasoft_barang',
    'mediasoft_harga',
    'mediasoft_kategori_barang',
    'mediasoft_satuan',
    'mediasoft_supplier',
    'mediasoft_customer',
    'mediasoft_penjualan',
    'mediasoft_penjualan_detail',
    'mediasoft_payment_details',
    'mediasoft_payment_methods',
    'mediasoft_tax_rates',
    'mediasoft_returns',
    'mediasoft_return_items',
    'mediasoft_pembelian',
    'mediasoft_pembelian_detail',
    'mediasoft_kas_drawer',
    'mediasoft_kas_transaksi',
    'mediasoft_stock_opnames',
    'mediasoft_stock_opname_items',
    'mediasoft_backup',
    'mediasoft_activity_log',
    'mediasoft_identitas',
    'mediasoft_subscription_plans',
    'mediasoft_struk_settings',
    'mediasoft_popup_rules',
    'mediasoft_branches',
    'mediasoft_warehouses',
    'mediasoft_promos',
  ]) {
    ensureSyncMetadata(table)
  }
})()

;(function normalizeLocalDeveloperRole() {
  try {
    sqlite.prepare(`
      UPDATE mediasoft_pengguna
      SET hak_akses = 'developer'
      WHERE hak_akses = 'superadmin'
    `).run()
  } catch (err: any) {
    console.error('⚠️ Developer role normalization:', err.message)
  }
})()

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
export { sqlite }
