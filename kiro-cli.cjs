#!/usr/bin/env node

/**
 * MediaSoft POS - Kiro CLI Tool
 * Tool untuk mengelola user, password, dan database
 */

const Database = require('better-sqlite3')
const crypto = require('crypto')
const readline = require('readline')
const path = require('path')
const fs = require('fs')

// Database path
const DB_PATH = path.join(__dirname, 'sistem_pos.db')

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function header(text) {
  console.log('\n' + '='.repeat(60))
  log(text, 'cyan')
  console.log('='.repeat(60) + '\n')
}

// Hash password dengan SHA1 (sesuai database MediaSoft)
function hashPassword(password) {
  return crypto.createHash('sha1').update(password).digest('hex')
}

// Buka koneksi database
function openDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    log('❌ Database tidak ditemukan: ' + DB_PATH, 'red')
    process.exit(1)
  }
  return new Database(DB_PATH)
}

// Tampilkan semua user
function listUsers() {
  const db = openDatabase()
  
  header('📋 DAFTAR USER')
  
  const users = db.prepare(`
    SELECT 
      nama_pengguna,
      nama_lengkap,
      hak_akses,
      status_user,
      terakhir_login,
      tgl_wkt_simpan
    FROM mediasoft_pengguna
    ORDER BY nama_pengguna
  `).all()
  
  if (users.length === 0) {
    log('Tidak ada user di database', 'yellow')
    db.close()
    return
  }
  
  console.table(users.map(u => ({
    'Username': u.nama_pengguna,
    'Nama Lengkap': u.nama_lengkap || '-',
    'Hak Akses': u.hak_akses || 'kasir',
    'Status': u.status_user,
    'Last Login': u.terakhir_login || 'Belum pernah',
  })))
  
  log(`\nTotal: ${users.length} user`, 'cyan')
  db.close()
}

// Reset password user
function resetPassword(username, newPassword) {
  const db = openDatabase()
  
  // Cek apakah user ada
  const user = db.prepare('SELECT * FROM mediasoft_pengguna WHERE nama_pengguna = ?').get(username)
  
  if (!user) {
    log(`❌ User '${username}' tidak ditemukan`, 'red')
    db.close()
    return
  }
  
  // Hash password baru
  const hashedPassword = hashPassword(newPassword)
  
  // Update password
  db.prepare(`
    UPDATE mediasoft_pengguna 
    SET kata_sandi = ?,
        password_hash_type = 'sha1',
        tgl_wkt_edit = datetime('now')
    WHERE nama_pengguna = ?
  `).run(hashedPassword, username)
  
  log(`✅ Password user '${username}' berhasil direset`, 'green')
  log(`   Password baru: ${newPassword}`, 'yellow')
  
  db.close()
}

// Buat user baru
function createUser(username, password, namaLengkap, hakAkses = 'kasir') {
  const db = openDatabase()
  
  // Cek apakah username sudah ada
  const existing = db.prepare('SELECT nama_pengguna FROM mediasoft_pengguna WHERE nama_pengguna = ?').get(username)
  
  if (existing) {
    log(`❌ Username '${username}' sudah digunakan`, 'red')
    db.close()
    return
  }
  
  // Hash password
  const hashedPassword = hashPassword(password)
  
  // Insert user baru
  db.prepare(`
    INSERT INTO mediasoft_pengguna (
      nama_pengguna,
      kata_sandi,
      nama_lengkap,
      hak_akses,
      status_user,
      password_hash_type,
      tgl_wkt_simpan
    ) VALUES (?, ?, ?, ?, 'Aktif', 'sha1', datetime('now'))
  `).run(username, hashedPassword, namaLengkap, hakAkses)
  
  log(`✅ User '${username}' berhasil dibuat`, 'green')
  log(`   Nama: ${namaLengkap}`, 'cyan')
  log(`   Hak Akses: ${hakAkses}`, 'cyan')
  log(`   Password: ${password}`, 'yellow')
  
  db.close()
}

// Hapus user
function deleteUser(username) {
  const db = openDatabase()
  
  // Cek apakah user ada
  const user = db.prepare('SELECT * FROM mediasoft_pengguna WHERE nama_pengguna = ?').get(username)
  
  if (!user) {
    log(`❌ User '${username}' tidak ditemukan`, 'red')
    db.close()
    return
  }
  
  // Hapus user
  db.prepare('DELETE FROM mediasoft_pengguna WHERE nama_pengguna = ?').run(username)
  
  log(`✅ User '${username}' berhasil dihapus`, 'green')
  
  db.close()
}

// Ubah status user
function toggleUserStatus(username) {
  const db = openDatabase()
  
  const user = db.prepare('SELECT * FROM mediasoft_pengguna WHERE nama_pengguna = ?').get(username)
  
  if (!user) {
    log(`❌ User '${username}' tidak ditemukan`, 'red')
    db.close()
    return
  }
  
  const newStatus = user.status_user === 'Aktif' ? 'Nonaktif' : 'Aktif'
  
  db.prepare(`
    UPDATE mediasoft_pengguna 
    SET status_user = ?,
        tgl_wkt_edit = datetime('now')
    WHERE nama_pengguna = ?
  `).run(newStatus, username)
  
  log(`✅ Status user '${username}' diubah menjadi: ${newStatus}`, 'green')
  
  db.close()
}

// Tampilkan info database
function databaseInfo() {
  const db = openDatabase()
  
  header('📊 INFORMASI DATABASE')
  
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM mediasoft_pengguna').get()
    const productCount = db.prepare('SELECT COUNT(*) as count FROM mediasoft_barang').get()
    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM mediasoft_penjualan').get()
    
    // Get table count
    const tableCountResult = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get()
    
    log(`Database: ${DB_PATH}`, 'cyan')
    log(`Ukuran: ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2)} MB`, 'cyan')
    log(`\nStatistik:`, 'bright')
    log(`  • User: ${userCount.count}`, 'green')
    log(`  • Produk: ${productCount.count}`, 'green')
    log(`  • Transaksi: ${transactionCount.count}`, 'green')
    log(`  • Total Tabel: ${tableCountResult.count}`, 'green')
  } catch (error) {
    log(`Error: ${error.message}`, 'red')
  }
  
  db.close()
}

// Menu interaktif
function showMenu() {
  header('🚀 MEDIASOFT POS - KIRO CLI')
  
  console.log('Pilih aksi:')
  console.log('  1. Lihat semua user')
  console.log('  2. Reset password user')
  console.log('  3. Buat user baru')
  console.log('  4. Hapus user')
  console.log('  5. Toggle status user (Aktif/Nonaktif)')
  console.log('  6. Info database')
  console.log('  0. Keluar')
  console.log()
}

// Main CLI
async function main() {
  const args = process.argv.slice(2)
  
  // Mode command line
  if (args.length > 0) {
    const command = args[0]
    
    switch (command) {
      case 'list':
      case 'ls':
        listUsers()
        break
        
      case 'reset':
        if (args.length < 3) {
          log('Usage: node kiro-cli.cjs reset <username> <new-password>', 'yellow')
          break
        }
        resetPassword(args[1], args[2])
        break
        
      case 'create':
        if (args.length < 4) {
          log('Usage: node kiro-cli.cjs create <username> <password> <nama-lengkap> [hak_akses]', 'yellow')
          log('Hak Akses: developer, operator, kasir, superadmin, admin', 'cyan')
          break
        }
        createUser(args[1], args[2], args[3], args[4] || 'kasir')
        break
        
      case 'delete':
        if (args.length < 2) {
          log('Usage: node kiro-cli.cjs delete <username>', 'yellow')
          break
        }
        deleteUser(args[1])
        break
        
      case 'toggle':
        if (args.length < 2) {
          log('Usage: node kiro-cli.cjs toggle <username>', 'yellow')
          break
        }
        toggleUserStatus(args[1])
        break
        
      case 'info':
        databaseInfo()
        break
        
      case 'help':
      case '--help':
      case '-h':
        header('📖 BANTUAN')
        console.log('Perintah yang tersedia:')
        console.log('  list, ls              - Tampilkan semua user')
        console.log('  reset <user> <pass>   - Reset password user')
        console.log('  create <user> <pass> <nama> [hak_akses] - Buat user baru')
        console.log('  delete <user>         - Hapus user')
        console.log('  toggle <user>         - Toggle status user')
        console.log('  info                  - Info database')
        console.log('  help                  - Tampilkan bantuan')
        console.log('\nHak Akses yang tersedia:')
        console.log('  developer, operator, kasir, superadmin, admin')
        console.log('\nContoh:')
        console.log('  node kiro-cli.cjs list')
        console.log('  node kiro-cli.cjs reset admin admin123')
        console.log('  node kiro-cli.cjs create kasir1 pass123 "Kasir Satu" kasir')
        break
        
      default:
        log(`❌ Perintah tidak dikenal: ${command}`, 'red')
        log('Gunakan: node kiro-cli.cjs help', 'yellow')
    }
    
    return
  }
  
  // Mode interaktif
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve))
  
  while (true) {
    showMenu()
    const choice = await question('Pilih menu (0-6): ')
    
    switch (choice.trim()) {
      case '1':
        listUsers()
        break
        
      case '2': {
        const username = await question('Username: ')
        const password = await question('Password baru: ')
        resetPassword(username.trim(), password.trim())
        break
      }
        
      case '3': {
        const username = await question('Username: ')
        const password = await question('Password: ')
        const nama = await question('Nama Lengkap: ')
        const hakAkses = await question('Hak Akses (developer/operator/kasir/superadmin/admin) [kasir]: ')
        createUser(username.trim(), password.trim(), nama.trim(), hakAkses.trim() || 'kasir')
        break
      }
        
      case '4': {
        const username = await question('Username yang akan dihapus: ')
        const confirm = await question(`Yakin hapus user '${username}'? (y/n): `)
        if (confirm.toLowerCase() === 'y') {
          deleteUser(username.trim())
        } else {
          log('Dibatalkan', 'yellow')
        }
        break
      }
        
      case '5': {
        const username = await question('Username: ')
        toggleUserStatus(username.trim())
        break
      }
        
      case '6':
        databaseInfo()
        break
        
      case '0':
        log('\n👋 Terima kasih!', 'green')
        rl.close()
        return
        
      default:
        log('❌ Pilihan tidak valid', 'red')
    }
    
    await question('\nTekan Enter untuk melanjutkan...')
  }
}

// Run
main().catch(err => {
  log(`❌ Error: ${err.message}`, 'red')
  process.exit(1)
})
