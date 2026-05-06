/**
 * ═══════════════════════════════════════════════════════════════════════
 * Setup Demo User — Creates the demo account with proper bcrypt hash
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Usage: node setup_demo_user.js
 * 
 * This script:
 * 1. Opens the SQLite database
 * 2. Creates a demo user with bcrypt-hashed password
 * 3. Sets hak_akses = 'demo'
 */

const Database = require('better-sqlite3')
const bcrypt = require('bcrypt')
const path = require('path')

const DB_PATH = path.join(__dirname, 'sistem_pos.db')
const DEMO_USERNAME = 'demo'
const DEMO_PASSWORD = 'demo'
const BCRYPT_ROUNDS = 10

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  SETUP DEMO USER')
  console.log('═══════════════════════════════════════════════')
  console.log()

  // Open database
  const db = new Database(DB_PATH)
  console.log('✅ Database opened:', DB_PATH)

  // Hash the password
  console.log('🔐 Hashing password with bcrypt...')
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS)
  console.log('✅ Password hashed successfully')

  // Check if demo user exists
  const existing = db.prepare('SELECT nama_pengguna, hak_akses FROM mediasoft_pengguna WHERE nama_pengguna = ?').get(DEMO_USERNAME)

  if (existing) {
    console.log(`⚠️  User "${DEMO_USERNAME}" already exists (role: ${existing.hak_akses})`)
    console.log('   Updating to demo role...')
    
    db.prepare(`
      UPDATE mediasoft_pengguna 
      SET kata_sandi = ?, 
          hak_akses = 'demo', 
          status_user = 'Aktif', 
          nama_lengkap = 'Demo User',
          password_hash_type = 'bcrypt',
          tgl_wkt_edit = datetime('now')
      WHERE nama_pengguna = ?
    `).run(hashedPassword, DEMO_USERNAME)
    
    console.log('✅ Demo user updated successfully')
  } else {
    console.log(`📝 Creating new user "${DEMO_USERNAME}"...`)
    
    db.prepare(`
      INSERT INTO mediasoft_pengguna (
        nama_pengguna, kata_sandi, nama_lengkap, hak_akses, 
        status_user, password_hash_type, tgl_wkt_simpan
      ) VALUES (?, ?, 'Demo User', 'demo', 'Aktif', 'bcrypt', datetime('now'))
    `).run(DEMO_USERNAME, hashedPassword)
    
    console.log('✅ Demo user created successfully')
  }

  // Verify
  const verified = db.prepare('SELECT nama_pengguna, nama_lengkap, hak_akses, status_user, password_hash_type FROM mediasoft_pengguna WHERE nama_pengguna = ?').get(DEMO_USERNAME)
  
  console.log()
  console.log('═══════════════════════════════════════════════')
  console.log('  DEMO USER DETAILS')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Username  : ${verified.nama_pengguna}`)
  console.log(`  Full Name : ${verified.nama_lengkap}`)
  console.log(`  Role      : ${verified.hak_akses}`)
  console.log(`  Status    : ${verified.status_user}`)
  console.log(`  Hash Type : ${verified.password_hash_type}`)
  console.log('═══════════════════════════════════════════════')
  console.log()
  console.log('🔒 Demo user is ready! Login with:')
  console.log('   Username: demo')
  console.log('   Password: demo')
  console.log()
  console.log('   All write operations will be BLOCKED.')
  console.log()

  db.close()
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
