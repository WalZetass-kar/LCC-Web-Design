const { hashPassword } = require('../dist-electron/backend/services/crypto.js')
const Database = require('better-sqlite3')
const path = require('path')

async function seed() {
  const sqlite = new Database(path.join(process.cwd(), 'sistem_pos.db'))
  const hash = await hashPassword('admin123')
  
  sqlite.prepare(`
    INSERT INTO mediasoft_pengguna (nama_pengguna, nama_lengkap, kata_sandi, hak_akses, status_user, password_hash_type, must_change_password)
    VALUES ('developer', 'Super Admin', ?, 'developer', 'Aktif', 'bcrypt', 0)
  `).run(hash)
  
  console.log("Seeded developer account")
}

seed().catch(console.error)
