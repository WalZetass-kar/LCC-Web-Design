/**
 * Database Initialization
 * Creates all tables needed for the application
 */

import { sqlite } from '../../database/connection.js'

export function initDatabase() {
  console.log('🔧 Initializing database tables...')
  
  try {
    // Tax/PPN
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_tax_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rate REAL NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Promo
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_promos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Loyalty
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_loyalty_tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        min_points INTEGER NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        benefits TEXT,
        color TEXT DEFAULT '#FFD700'
      )
    `).run()
    
    // Tutorials
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_tutorials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Insert default data if empty
    const taxCount = sqlite.prepare('SELECT COUNT(*) as count FROM mediasoft_tax_settings').get() as any
    if (taxCount?.count === 0) {
      sqlite.prepare('INSERT INTO mediasoft_tax_settings (name, rate, is_active) VALUES (?, ?, ?)').run('PPN 10%', 10, 1)
      console.log('✅ Default tax created')
    }
    
    const loyaltyCount = sqlite.prepare('SELECT COUNT(*) as count FROM mediasoft_loyalty_tiers').get() as any
    if (loyaltyCount?.count === 0) {
      const tiers = [
        { name: 'Bronze', min_points: 0, discount_percent: 0, benefits: '1 point per Rp 10.000', color: '#CD7F32' },
        { name: 'Silver', min_points: 500, discount_percent: 2, benefits: '1.2x point + 2% diskon', color: '#C0C0C0' },
        { name: 'Gold', min_points: 2000, discount_percent: 5, benefits: '1.5x point + 5% diskon', color: '#FFD700' },
        { name: 'Platinum', min_points: 5000, discount_percent: 10, benefits: '2x point + 10% diskon', color: '#E5E4E2' },
      ]
      for (const t of tiers) {
        sqlite.prepare('INSERT INTO mediasoft_loyalty_tiers (name, min_points, discount_percent, benefits, color) VALUES (?, ?, ?, ?, ?)').run(t.name, t.min_points, t.discount_percent, t.benefits, t.color)
      }
      console.log('✅ Default loyalty tiers created')
    }
    
    console.log('✅ Database initialization complete')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
  }
}