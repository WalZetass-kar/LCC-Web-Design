#!/usr/bin/env node
'use strict'

const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.resolve(process.cwd(), 'sistem_pos.db')
console.log(`📁 Database: ${dbPath}`)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = OFF')

// ─── Ensure all new feature tables exist ────────────────────────────
// These mirror the CREATE TABLE IF NOT EXISTS statements from connection.ts
;(function ensureTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS mediasoft_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nik TEXT NOT NULL UNIQUE,
      nama_lengkap TEXT NOT NULL,
      tempat_lahir TEXT, tgl_lahir TEXT, jenis_kelamin TEXT, alamat TEXT,
      no_telp TEXT, email TEXT, agama TEXT, status_perkawinan TEXT,
      pendidikan_terakhir TEXT, jurusan TEXT, nama_ibu TEXT, no_rekening TEXT,
      bank TEXT, bpjs_kesehatan TEXT, bpjs_ketenagakerjaan TEXT, npwp TEXT,
      tgl_masuk TEXT NOT NULL, tgl_keluar TEXT, status_karyawan TEXT DEFAULT 'AKTIF',
      jabatan TEXT, departemen TEXT, gaji_pokok REAL DEFAULT 0,
      tunjangan REAL DEFAULT 0, jam_kerja_per_hari REAL DEFAULT 8,
      foto TEXT, catatan TEXT,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_employee_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL, nomor_kontrak TEXT NOT NULL UNIQUE,
      jenis_kontrak TEXT NOT NULL, tgl_mulai TEXT NOT NULL, tgl_berakhir TEXT,
      durasi_bulan INTEGER, jabatan TEXT NOT NULL, departemen TEXT,
      gaji_pokok REAL DEFAULT 0, tunjangan REAL DEFAULT 0,
      uang_makan REAL DEFAULT 0, uang_transport REAL DEFAULT 0,
      jam_kerja TEXT, hari_kerja TEXT, hak_cuti_tahunan INTEGER DEFAULT 12,
      masa_percobaan_bulan INTEGER DEFAULT 3, status TEXT DEFAULT 'AKTIF',
      lampiran TEXT, catatan TEXT, dibuat_oleh TEXT, tgl_dibuat TEXT NOT NULL,
      diperbarui_oleh TEXT, tgl_diperbarui TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL, tgl TEXT NOT NULL,
      jam_masuk TEXT, jam_keluar TEXT, lokasi_masuk TEXT, lokasi_keluar TEXT,
      foto_masuk TEXT, foto_keluar TEXT, status TEXT DEFAULT 'HADIR',
      keterlambatan_menit INTEGER DEFAULT 0, catatan TEXT,
      approved_by TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL, periode_bulan INTEGER NOT NULL,
      periode_tahun INTEGER NOT NULL, gaji_pokok REAL DEFAULT 0,
      tunjangan REAL DEFAULT 0, uang_makan REAL DEFAULT 0,
      uang_transport REAL DEFAULT 0, lembur REAL DEFAULT 0, bonus REAL DEFAULT 0,
      komisi REAL DEFAULT 0, potongan REAL DEFAULT 0, potongan_bpjs REAL DEFAULT 0,
      potongan_pph REAL DEFAULT 0, potongan_lain REAL DEFAULT 0,
      total_gaji REAL DEFAULT 0, tgl_bayar TEXT, metode_bayar TEXT,
      status TEXT DEFAULT 'DRAFT', catatan TEXT, dibuat_oleh TEXT,
      tgl_dibuat TEXT NOT NULL, disetujui_oleh TEXT, tgl_disetujui TEXT,
      dibayar_oleh TEXT, tgl_dibayar TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_payroll_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_id INTEGER NOT NULL, komponen TEXT NOT NULL,
      tipe TEXT NOT NULL, jumlah REAL DEFAULT 0, keterangan TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_tip_pooling (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tgl TEXT NOT NULL, total_tip REAL DEFAULT 0,
      jumlah_karyawan INTEGER DEFAULT 0, tip_per_orang REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT', catatan TEXT, dibuat_oleh TEXT,
      tgl_dibuat TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_tip_distribution (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip_pooling_id INTEGER NOT NULL, employee_id INTEGER NOT NULL,
      jumlah REAL DEFAULT 0, persentase REAL DEFAULT 0, catatan TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_shift_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL, tgl TEXT NOT NULL,
      shift TEXT NOT NULL, jam_masuk TEXT NOT NULL, jam_keluar TEXT NOT NULL,
      catatan TEXT, dibuat_oleh TEXT, tgl_dibuat TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_kds_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_transaksi TEXT NOT NULL, nomor_meja TEXT, nomor_antrian INTEGER,
      status TEXT DEFAULT 'BARU', prioritas INTEGER DEFAULT 0, catatan TEXT,
      nama_pelanggan TEXT, jenis_order TEXT DEFAULT 'DINE_IN',
      waktu_masuk TEXT NOT NULL, waktu_mulai_masak TEXT, waktu_selesai TEXT,
      waktu_siap TEXT, waktu_disajikan TEXT, dapur TEXT, dibuat_oleh TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_kds_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kds_order_id INTEGER NOT NULL, kd_barang TEXT NOT NULL,
      nama_item TEXT NOT NULL, qty INTEGER DEFAULT 1, catatan TEXT,
      status TEXT DEFAULT 'BARU', waktu_mulai_masak TEXT, waktu_selesai TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_floor_layouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL, kapasitas INTEGER DEFAULT 0,
      width INTEGER DEFAULT 800, height INTEGER DEFAULT 600,
      is_active INTEGER DEFAULT 1, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_layout_id INTEGER, nomor_meja TEXT NOT NULL, label TEXT,
      kapasitas INTEGER DEFAULT 4, posisi_x REAL DEFAULT 0,
      posisi_y REAL DEFAULT 0, bentuk TEXT DEFAULT 'persegi',
      lebar INTEGER DEFAULT 60, tinggi INTEGER DEFAULT 60,
      status TEXT DEFAULT 'KOSONG', qr_code TEXT, catatan TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_reservasi TEXT NOT NULL UNIQUE, nama_pelanggan TEXT NOT NULL,
      no_telp TEXT, email TEXT, jumlah_tamu INTEGER DEFAULT 1,
      tgl_reservasi TEXT NOT NULL, jam_reservasi TEXT NOT NULL,
      jam_berakhir TEXT, table_id INTEGER, catatan TEXT,
      status TEXT DEFAULT 'MENUNGGU', sumber TEXT DEFAULT 'MANUAL',
      deposit REAL DEFAULT 0, dibuat_oleh TEXT,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL, nama_resep TEXT NOT NULL,
      hasil_produksi INTEGER DEFAULT 1, satuan_hasil TEXT,
      biaya_produksi REAL DEFAULT 0, harga_jual REAL DEFAULT 0,
      margin REAL DEFAULT 0, petunjuk TEXT, waktu_produksi_menit INTEGER,
      kategori TEXT, is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL, kd_barang TEXT NOT NULL,
      nama_bahan TEXT NOT NULL, qty REAL DEFAULT 0, satuan TEXT,
      harga_per_unit REAL DEFAULT 0, sub_total REAL DEFAULT 0,
      persentase_terpakai REAL DEFAULT 100
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_delivery_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_delivery TEXT NOT NULL UNIQUE, kd_transaksi TEXT,
      nama_penerima TEXT NOT NULL, no_telp_penerima TEXT,
      alamat TEXT NOT NULL, catatan_alamat TEXT, latitude REAL,
      longitude REAL, jarak_km REAL, biaya_ongkir REAL DEFAULT 0,
      status TEXT DEFAULT 'MENUNGGU', kurir TEXT, estimasi_sampai TEXT,
      tgl_diantar TEXT, tgl_sampai TEXT, bukti_foto TEXT,
      tanda_tangan TEXT, catatan TEXT, dibuat_oleh TEXT,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_delivery_vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_kendaraan TEXT NOT NULL, plat_nomor TEXT NOT NULL,
      jenis TEXT, kapasitas_maks REAL, biaya_per_km REAL DEFAULT 0,
      status TEXT DEFAULT 'TERSEDIA', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_bank TEXT NOT NULL, nomor_rekening TEXT NOT NULL,
      atas_nama TEXT, saldo_awal REAL DEFAULT 0,
      saldo_saat_ini REAL DEFAULT 0, mata_uang TEXT DEFAULT 'IDR',
      is_active INTEGER DEFAULT 1, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_account_id INTEGER NOT NULL, tgl TEXT NOT NULL,
      jenis TEXT NOT NULL, jumlah REAL NOT NULL, keterangan TEXT,
      kategori TEXT, referensi TEXT, is_reconciled INTEGER DEFAULT 0,
      tgl_rekonsiliasi TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_reconciliation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_account_id INTEGER NOT NULL, periode_bulan INTEGER NOT NULL,
      periode_tahun INTEGER NOT NULL, saldo_buku REAL DEFAULT 0,
      saldo_bank REAL DEFAULT 0, selisih REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT', catatan TEXT, tgl_rekonsiliasi TEXT,
      dibuat_oleh TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_fixed_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_aset TEXT NOT NULL UNIQUE, nama_aset TEXT NOT NULL,
      kategori TEXT, deskripsi TEXT, tgl_perolehan TEXT NOT NULL,
      harga_perolehan REAL DEFAULT 0, nilai_residu REAL DEFAULT 0,
      masa_manfaat_tahun INTEGER DEFAULT 5,
      metode_penyusutan TEXT DEFAULT 'GARIS_LURUS',
      nilai_buku REAL DEFAULT 0, akumulasi_penyusutan REAL DEFAULT 0,
      lokasi TEXT, penanggung_jawab TEXT, status TEXT DEFAULT 'AKTIF',
      foto TEXT, catatan TEXT, created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_asset_depreciation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL, periode_bulan INTEGER NOT NULL,
      periode_tahun INTEGER NOT NULL, nilai_awal REAL DEFAULT 0,
      beban_penyusutan REAL DEFAULT 0, akumulasi REAL DEFAULT 0,
      nilai_akhir REAL DEFAULT 0, tgl_dibuat TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL, kategori TEXT, periode_bulan INTEGER,
      periode_tahun INTEGER NOT NULL, jumlah_anggaran REAL DEFAULT 0,
      jumlah_terealisasi REAL DEFAULT 0, selisih REAL DEFAULT 0,
      catatan TEXT, status TEXT DEFAULT 'AKTIF', dibuat_oleh TEXT,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_gift_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode TEXT NOT NULL UNIQUE, nominal REAL DEFAULT 0,
      saldo REAL DEFAULT 0, pembeli TEXT, penerima TEXT, pesan TEXT,
      masa_berlaku TEXT, status TEXT DEFAULT 'AKTIF', tgl_dibeli TEXT,
      tgl_digunakan TEXT, dibuat_oleh TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_gift_card_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gift_card_id INTEGER NOT NULL, kd_transaksi TEXT,
      jumlah REAL DEFAULT 0, sisa_saldo REAL DEFAULT 0, tgl TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_customer_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_customer TEXT, nama TEXT NOT NULL, kd_transaksi TEXT,
      rating INTEGER DEFAULT 5, kategori TEXT, pesan TEXT,
      status TEXT DEFAULT 'BARU', dibalas_oleh TEXT, balasan TEXT,
      tgl_dibuat TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL, tipe TEXT NOT NULL, subjek TEXT,
      konten TEXT NOT NULL, target TEXT, target_kustom TEXT,
      status TEXT DEFAULT 'DRAFT', tgl_terjadwal TEXT, tgl_terkirim TEXT,
      total_target INTEGER DEFAULT 0, total_terkirim INTEGER DEFAULT 0,
      total_gagal INTEGER DEFAULT 0, total_dibuka INTEGER DEFAULT 0,
      dibuat_oleh TEXT, created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_campaign_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL, kd_customer TEXT, no_telp TEXT,
      email TEXT, status TEXT, tgl TEXT NOT NULL, error_message TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_storefront_settings (
      id INTEGER PRIMARY KEY, domain TEXT, nama_toko TEXT,
      deskripsi TEXT, logo TEXT, warna_utama TEXT DEFAULT '#6366f1',
      meta_tags TEXT, google_analytics TEXT, is_active INTEGER DEFAULT 0,
      metode_pengiriman TEXT, metode_pembayaran TEXT,
      kebijakan_privacy TEXT, syarat_ketentuan TEXT,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_storefront_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL, tampilkan INTEGER DEFAULT 1,
      harga_online REAL, stok_online INTEGER, foto_tambahan TEXT,
      deskripsi_online TEXT, seo_title TEXT, seo_description TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_storefront_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_order TEXT NOT NULL UNIQUE, nama_pelanggan TEXT NOT NULL,
      email TEXT, no_telp TEXT, alamat TEXT, catatan TEXT,
      subtotal REAL DEFAULT 0, ongkir REAL DEFAULT 0,
      diskon REAL DEFAULT 0, total REAL DEFAULT 0,
      status TEXT DEFAULT 'BARU', metode_pembayaran TEXT,
      status_pembayaran TEXT DEFAULT 'BELUM_BAYAR', bukti_bayar TEXT,
      kurir TEXT, no_resi TEXT, kd_transaksi TEXT,
      created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_dokumen TEXT, nama TEXT NOT NULL, tipe TEXT NOT NULL,
      kategori TEXT, file_path TEXT, file_size INTEGER, file_type TEXT,
      catatan TEXT, tags TEXT, status TEXT DEFAULT 'AKTIF',
      dibuat_oleh TEXT, created_at TEXT NOT NULL, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_forecast_settings (
      id INTEGER PRIMARY KEY, metode TEXT DEFAULT 'MOVING_AVERAGE',
      periode_hari INTEGER DEFAULT 30, periode_data INTEGER DEFAULT 90,
      is_active INTEGER DEFAULT 0, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_forecast_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kd_barang TEXT NOT NULL, tgl_forecast TEXT NOT NULL,
      prediksi_penjualan REAL DEFAULT 0, confidence_lower REAL DEFAULT 0,
      confidence_upper REAL DEFAULT 0, metode TEXT, tgl_dibuat TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mediasoft_dynamic_pricing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL, kd_barang TEXT, kategori_id INTEGER,
      tipe TEXT NOT NULL, nilai REAL DEFAULT 0, kondisi TEXT,
      prioritas INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      tgl_mulai TEXT, tgl_berakhir TEXT, created_at TEXT NOT NULL
    )`,
  ]
  for (const sql of tables) {
    db.exec(sql)
  }
  console.log('🗂️  All feature tables ensured')
})()

// Add sync metadata columns (copied from connection.ts logic)
;(function ensureSyncMetadataColumns() {
  const tables = [
    'mediasoft_employees', 'mediasoft_employee_contracts', 'mediasoft_attendance',
    'mediasoft_payroll', 'mediasoft_payroll_details', 'mediasoft_tip_pooling',
    'mediasoft_tip_distribution', 'mediasoft_shift_schedules', 'mediasoft_kds_orders',
    'mediasoft_kds_order_items', 'mediasoft_floor_layouts', 'mediasoft_tables',
    'mediasoft_reservations', 'mediasoft_recipes', 'mediasoft_recipe_ingredients',
    'mediasoft_delivery_orders', 'mediasoft_delivery_vehicles', 'mediasoft_bank_accounts',
    'mediasoft_bank_transactions', 'mediasoft_reconciliation', 'mediasoft_fixed_assets',
    'mediasoft_asset_depreciation', 'mediasoft_budgets', 'mediasoft_gift_cards',
    'mediasoft_gift_card_usage', 'mediasoft_customer_feedback', 'mediasoft_campaigns',
    'mediasoft_campaign_logs', 'mediasoft_vendor_portal_settings',
    'mediasoft_storefront_settings', 'mediasoft_storefront_products',
    'mediasoft_storefront_orders', 'mediasoft_documents', 'mediasoft_forecast_settings',
    'mediasoft_forecast_results', 'mediasoft_dynamic_pricing_rules',
  ]
  for (const table of tables) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
    for (const col of ['created_at', 'updated_at', 'synced_at', 'device_id']) {
      if (!cols.includes(col)) {
        try {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT DEFAULT NULL`)
        } catch (_) {}
      }
    }
  }
})()

const now = new Date()
const today = now.toISOString().slice(0, 10)

// ─── Helpers ────────────────────────────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min, max, dec = 2) => +(Math.random() * (max - min) + min).toFixed(dec)
const randBool = () => Math.random() > 0.5
const pick = (arr) => arr[randInt(0, arr.length - 1)]
const formatDate = (d) => d.toISOString().slice(0, 10)
const formatDateTime = (d) => d.toISOString().replace('T', ' ').slice(0, 19)

const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const isEmpty = (table) => {
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get()
  return row.cnt === 0
}

const isoNow = () => now.toISOString()

// ─── Reference Data ────────────────────────────────────────────────
const existingBarang = db.prepare('SELECT kd_barang, nama_barang, kd_satuan FROM mediasoft_barang').all()
const existingUsers = db.prepare("SELECT nama_pengguna, nama_lengkap FROM mediasoft_pengguna WHERE status_user = 'Aktif'").all()
const existingCustomers = db.prepare('SELECT kd_customer, nama_customer FROM mediasoft_customer').all()
const existingSuppliers = db.prepare('SELECT kd_suplier, nama_suplier FROM mediasoft_supplier').all()

const defaultUser = existingUsers[0]?.nama_pengguna || 'Developer'
const defaultCustomer = existingCustomers[0]?.kd_customer || 'CUST0001'

console.log(`📦 Ditemukan ${existingBarang.length} barang, ${existingUsers.length} pengguna, ${existingCustomers.length} customer`)

// ═══════════════════════════════════════════════════════════════════════
// 1. EMPLOYEES
// ═══════════════════════════════════════════════════════════════════════
;(function seedEmployees() {
  if (!isEmpty('mediasoft_employees')) {
    console.log('⏭️  Employees already seeded')
    return
  }

  const employees = [
    { nik: '20240001', nama: 'Rudi Hartono', tmpt: 'Jakarta', tgl: '1990-03-15', jk: 'L', alamat: 'Jl. Merdeka No. 10, Jakarta', telp: '081234567890', email: 'rudi@email.com', agama: 'Islam', kawin: 'Kawin', pend: 'S1', jurusan: 'Manajemen', ibu: 'Siti Aminah', norek: '1234567890', bank: 'BCA', bpjs_kes: 'BPJS001', bpjs_ket: 'BPJSK001', npwp: 'NPWP001', tgl_masuk: '2023-01-15', status: 'AKTIF', jabatan: 'Manajer', departemen: 'Operasional', gaji: 7500000, tunjangan: 1500000 },
    { nik: '20240002', nama: 'Siti Nurhaliza', tmpt: 'Bandung', tgl: '1995-07-22', jk: 'P', alamat: 'Jl. Braga No. 25, Bandung', telp: '081234567891', email: 'siti@email.com', agama: 'Islam', kawin: 'Belum Kawin', pend: 'D3', jurusan: 'Akuntansi', ibu: 'Dewi Sartika', norek: '1234567891', bank: 'Mandiri', bpjs_kes: 'BPJS002', bpjs_ket: 'BPJSK002', npwp: 'NPWP002', tgl_masuk: '2023-06-01', status: 'AKTIF', jabatan: 'Kasir', departemen: 'Keuangan', gaji: 3500000, tunjangan: 500000 },
    { nik: '20240003', nama: 'Bambang Supriyadi', tmpt: 'Surabaya', tgl: '1988-11-08', jk: 'L', alamat: 'Jl. Tunjungan No. 5, Surabaya', telp: '081234567892', email: 'bambang@email.com', agama: 'Islam', kawin: 'Kawin', pend: 'SMA', jurusan: '', ibu: 'Suparmi', norek: '1234567892', bank: 'BRI', bpjs_kes: 'BPJS003', bpjs_ket: 'BPJSK003', npwp: 'NPWP003', tgl_masuk: '2024-01-10', status: 'AKTIF', jabatan: 'Koki', departemen: 'Dapur', gaji: 4000000, tunjangan: 700000 },
    { nik: '20240004', nama: 'Dewi Lestari', tmpt: 'Yogyakarta', tgl: '1997-04-30', jk: 'P', alamat: 'Jl. Malioboro No. 12, Yogyakarta', telp: '081234567893', email: 'dewi@email.com', agama: 'Islam', kawin: 'Belum Kawin', pend: 'S1', jurusan: 'Ilmu Komputer', ibu: 'Sumiyati', norek: '1234567893', bank: 'BCA', bpjs_kes: 'BPJS004', bpjs_ket: 'BPJSK004', npwp: 'NPWP004', tgl_masuk: '2024-02-15', status: 'AKTIF', jabatan: 'Admin', departemen: 'IT', gaji: 4500000, tunjangan: 800000 },
    { nik: '20240005', nama: 'Ahmad Fauzi', tmpt: 'Semarang', tgl: '1993-09-12', jk: 'L', alamat: 'Jl. Pandanaran No. 8, Semarang', telp: '081234567894', email: 'ahmad@email.com', agama: 'Islam', kawin: 'Kawin', pend: 'SMA', jurusan: '', ibu: 'Fatimah', norek: '1234567894', bank: 'Mandiri', bpjs_kes: 'BPJS005', bpjs_ket: 'BPJSK005', npwp: 'NPWP005', tgl_masuk: '2023-03-20', status: 'AKTIF', jabatan: 'Waiter', departemen: 'Pelayanan', gaji: 2800000, tunjangan: 400000 },
    { nik: '20240006', nama: 'Putu Ayu', tmpt: 'Denpasar', tgl: '1996-12-05', jk: 'P', alamat: 'Jl. Raya Kuta No. 3, Bali', telp: '081234567895', email: 'putu@email.com', agama: 'Hindu', kawin: 'Belum Kawin', pend: 'D3', jurusan: 'Perhotelan', ibu: 'Ketut Sari', norek: '1234567895', bank: 'BRI', bpjs_kes: 'BPJS006', bpjs_ket: 'BPJSK006', npwp: 'NPWP006', tgl_masuk: '2024-05-01', status: 'AKTIF', jabatan: 'Supervisor', departemen: 'Pelayanan', gaji: 5000000, tunjangan: 1000000 },
    { nik: '20240007', nama: 'Hendra Gunawan', tmpt: 'Medan', tgl: '1985-08-20', jk: 'L', alamat: 'Jl. Diponegoro No. 7, Medan', telp: '081234567896', email: 'hendra@email.com', agama: 'Kristen', kawin: 'Kawin', pend: 'S1', jurusan: 'Ekonomi', ibu: 'Maria Simanjuntak', norek: '1234567896', bank: 'BCA', bpjs_kes: 'BPJS007', bpjs_ket: 'BPJSK007', npwp: 'NPWP007', tgl_masuk: '2022-11-01', tgl_keluar: '2024-06-30', status: 'RESIGN', jabatan: 'Koki', departemen: 'Dapur', gaji: 3800000, tunjangan: 600000 },
    { nik: '20240008', nama: 'Rina Marlina', tmpt: 'Bogor', tgl: '1998-02-14', jk: 'P', alamat: 'Jl. Pajajaran No. 15, Bogor', telp: '081234567897', email: 'rina@email.com', agama: 'Islam', kawin: 'Belum Kawin', pend: 'SMA', jurusan: '', ibu: 'Tuti Nurhayati', norek: '1234567897', bank: 'Mandiri', bpjs_kes: 'BPJS008', bpjs_ket: 'BPJSK008', npwp: 'NPWP008', tgl_masuk: '2024-08-10', status: 'AKTIF', jabatan: 'Kasir', departemen: 'Keuangan', gaji: 3200000, tunjangan: 400000 },
  ]

  const stmt = db.prepare(`INSERT INTO mediasoft_employees
    (nik, nama_lengkap, tempat_lahir, tgl_lahir, jenis_kelamin, alamat, no_telp, email, agama,
     status_perkawinan, pendidikan_terakhir, jurusan, nama_ibu, no_rekening, bank,
     bpjs_kesehatan, bpjs_ketenagakerjaan, npwp, tgl_masuk, tgl_keluar, status_karyawan,
     jabatan, departemen, gaji_pokok, tunjangan, jam_kerja_per_hari, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 8, ?)`)

  for (const e of employees) {
    stmt.run(e.nik, e.nama, e.tmpt, e.tgl, e.jk, e.alamat, e.telp, e.email, e.agama,
      e.kawin, e.pend, e.jurusan, e.ibu, e.norek, e.bank,
      e.bpjs_kes, e.bpjs_ket, e.npwp, e.tgl_masuk, e.tgl_keluar || null, e.status,
      e.jabatan, e.departemen, e.gaji, e.tunjangan, isoNow())
  }
  console.log(`✅ Seeded ${employees.length} employees`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 2. EMPLOYEE CONTRACTS
// ═══════════════════════════════════════════════════════════════════════
;(function seedContracts() {
  if (!isEmpty('mediasoft_employee_contracts')) {
    console.log('⏭️  Employee contracts already seeded')
    return
  }

  const employees = db.prepare("SELECT id, nama_lengkap, jabatan, departemen, gaji_pokok, tunjangan, tgl_masuk, status_karyawan FROM mediasoft_employees WHERE status_karyawan = 'AKTIF'").all()

  const stmt = db.prepare(`INSERT INTO mediasoft_employee_contracts
    (employee_id, nomor_kontrak, jenis_kontrak, tgl_mulai, tgl_berakhir, durasi_bulan,
     jabatan, departemen, gaji_pokok, tunjangan, uang_makan, uang_transport,
     jam_kerja, hari_kerja, hak_cuti_tahunan, masa_percobaan_bulan, status, catatan,
     dibuat_oleh, tgl_dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 12, 3, 'AKTIF', ?, ?, ?)`)

  for (let i = 0; i < employees.length; i++) {
    const e = employees[i]
    const jenis = i === 0 ? 'PKWTT' : 'PKWT'
    const durasi = i === 0 ? null : 12
    const tglBerakhir = i === 0 ? null : addDays(new Date(e.tgl_masuk), 365).toISOString().slice(0, 10)

    stmt.run(e.id, `CTR-${String(e.id).padStart(4, '0')}`, jenis,
      e.tgl_masuk, tglBerakhir, durasi,
      e.jabatan, e.departemen, e.gaji_pokok, e.tunjangan, 500000, 300000,
      '08:00-17:00', 'Senin-Sabtu',
      `Kontrak ${jenis} untuk ${e.nama_lengkap}`, defaultUser, isoNow())
  }
  console.log(`✅ Seeded ${employees.length} employee contracts`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 3. ATTENDANCE (today + past 7 days)
// ═══════════════════════════════════════════════════════════════════════
;(function seedAttendance() {
  if (!isEmpty('mediasoft_attendance')) {
    console.log('⏭️  Attendance already seeded')
    return
  }

  const activeEmp = db.prepare("SELECT id FROM mediasoft_employees WHERE status_karyawan = 'AKTIF'").all()
  const statuses = ['HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'IZIN', 'SAKIT', 'ALPA']

  const stmt = db.prepare(`INSERT INTO mediasoft_attendance
    (employee_id, tgl, jam_masuk, jam_keluar, status, keterlambatan_menit, catatan, approved_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  let count = 0
  for (const emp of activeEmp) {
    for (let d = 7; d >= 0; d--) {
      const tgl = formatDate(addDays(now, -d))
      const s = d === 0 ? pick(['HADIR', 'HADIR', 'HADIR', 'IZIN']) : pick(statuses)
      if (s === 'ALPA') {
        stmt.run(emp.id, tgl, null, null, s, 0, 'Tanpa keterangan', defaultUser, isoNow())
      } else if (s === 'IZIN' || s === 'SAKIT') {
        stmt.run(emp.id, tgl, null, null, s, 0, s === 'IZIN' ? 'Izin keluarga' : 'Sakit', defaultUser, isoNow())
      } else {
        const jamMasuk = `0${randInt(7, 9)}:${randInt(0, 59).toString().padStart(2, '0')}:00`
        const jamKeluar = `${randInt(16, 18)}:${randInt(0, 59).toString().padStart(2, '0')}:00`
        const telat = randInt(0, 30)
        stmt.run(emp.id, tgl, jamMasuk, jamKeluar, s, telat, null, defaultUser, isoNow())
      }
      count++
    }
  }
  console.log(`✅ Seeded ${count} attendance records`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 4. PAYROLL (current month)
// ═══════════════════════════════════════════════════════════════════════
;(function seedPayroll() {
  if (!isEmpty('mediasoft_payroll')) {
    console.log('⏭️  Payroll already seeded')
    return
  }

  const activeEmp = db.prepare("SELECT id, nama_lengkap, gaji_pokok, tunjangan FROM mediasoft_employees WHERE status_karyawan = 'AKTIF'").all()
  const bulan = now.getMonth() + 1
  const tahun = now.getFullYear()

  const stmt = db.prepare(`INSERT INTO mediasoft_payroll
    (employee_id, periode_bulan, periode_tahun, gaji_pokok, tunjangan, uang_makan, uang_transport,
     lembur, bonus, potongan, total_gaji, status, catatan, dibuat_oleh, tgl_dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  for (let i = 0; i < activeEmp.length; i++) {
    const e = activeEmp[i]
    const uangMakan = 500000
    const uangTransport = 300000
    const lembur = randBool() ? randInt(100000, 500000) : 0
    const bonus = i === 0 ? 1000000 : (randBool() ? randInt(200000, 500000) : 0)
    const potongan = randInt(50000, 200000)
    const total = e.gaji_pokok + e.tunjangan + uangMakan + uangTransport + lembur + bonus - potongan

    let status = 'DIBAYAR'
    let tglBayar = isoNow()
    if (i < 2) {
      status = 'DRAFT'
      tglBayar = null
    } else if (i < 4) {
      status = 'DISETUJUI'
      tglBayar = null
    }

    stmt.run(e.id, bulan, tahun, e.gaji_pokok, e.tunjangan, uangMakan, uangTransport,
      lembur, bonus, potongan, total, status, status === 'DRAFT' ? 'Menunggu persetujuan' : null,
      defaultUser, isoNow())

    if (status === 'DIBAYAR') {
      db.prepare(`UPDATE mediasoft_payroll SET tgl_bayar = ?, dibayar_oleh = ?, tgl_dibayar = ? WHERE id = ?`)
        .run(tglBayar, defaultUser, isoNow(), db.prepare('SELECT last_insert_rowid() as id').get().id)
    }
  }
  console.log(`✅ Seeded ${activeEmp.length} payroll records`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 5. TIP POOLING
// ═══════════════════════════════════════════════════════════════════════
;(function seedTipPooling() {
  if (!isEmpty('mediasoft_tip_pooling')) {
    console.log('⏭️  Tip pooling already seeded')
    return
  }

  const activeEmp = db.prepare("SELECT id FROM mediasoft_employees WHERE status_karyawan = 'AKTIF'").all()

  const poolStmt = db.prepare(`INSERT INTO mediasoft_tip_pooling
    (tgl, total_tip, jumlah_karyawan, tip_per_orang, status, dibuat_oleh, tgl_dibuat)
    VALUES (?, ?, ?, ?, 'DIBAYAR', ?, ?)`)

  const distStmt = db.prepare(`INSERT INTO mediasoft_tip_distribution
    (tip_pooling_id, employee_id, jumlah, persentase)
    VALUES (?, ?, ?, ?)`)

  for (let d = 1; d >= 0; d--) {
    const tgl = formatDate(addDays(now, -d))
    const totalTip = randInt(200000, 500000)
    const perOrang = Math.floor(totalTip / activeEmp.length)
    const pct = +(100 / activeEmp.length).toFixed(2)

    poolStmt.run(tgl, totalTip, activeEmp.length, perOrang, defaultUser, isoNow())
    const poolId = db.prepare('SELECT last_insert_rowid() as id').get().id

    for (const emp of activeEmp) {
      distStmt.run(poolId, emp.id, perOrang, pct)
    }
  }
  console.log('✅ Seeded tip pooling for 2 days')
})()

// ═══════════════════════════════════════════════════════════════════════
// 6. SHIFT SCHEDULES (this week)
// ═══════════════════════════════════════════════════════════════════════
;(function seedShiftSchedules() {
  if (!isEmpty('mediasoft_shift_schedules')) {
    console.log('⏭️  Shift schedules already seeded')
    return
  }

  const activeEmp = db.prepare("SELECT id FROM mediasoft_employees WHERE status_karyawan = 'AKTIF'").all()

  const stmt = db.prepare(`INSERT INTO mediasoft_shift_schedules
    (employee_id, tgl, shift, jam_masuk, jam_keluar, dibuat_oleh, tgl_dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)

  let count = 0
  for (let d = 0; d < 7; d++) {
    const tgl = formatDate(addDays(now, d))
    for (let i = 0; i < activeEmp.length; i++) {
      const shift = i < 5 ? 'PAGI' : 'SIANG'
      const jamMasuk = shift === 'PAGI' ? '07:00' : '14:00'
      const jamKeluar = shift === 'PAGI' ? '16:00' : '22:00'
      stmt.run(activeEmp[i].id, tgl, shift, jamMasuk, jamKeluar, defaultUser, isoNow())
      count++
    }
  }
  console.log(`✅ Seeded ${count} shift schedules`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 7. KDS ORDERS
// ═══════════════════════════════════════════════════════════════════════
;(function seedKdsOrders() {
  if (!isEmpty('mediasoft_kds_orders')) {
    console.log('⏭️  KDS orders already seeded')
    return
  }

  const foodItems = existingBarang.filter(b =>
    ['Makanan', 'Snack', 'Minuman'].some(k => k.toLowerCase()) || randBool()
  ).slice(0, 8)
  if (foodItems.length < 3) {
    foodItems.push(...existingBarang.slice(0, 5))
  }

  const orderStatuses = ['BARU', 'DIMASAK', 'SIAP', 'DISAJIKAN']
  const itemStatuses = ['BARU', 'DIMASAK', 'SELESAI']
  const menuItems = [
    { nama: 'Nasi Goreng', kd: 'BRG025' },
    { nama: 'Mie Goreng', kd: 'BRG026' },
    { nama: 'Es Teh Manis', kd: 'BRG005' },
    { nama: 'Kopi Hitam', kd: 'BRG027' },
    { nama: 'Air Mineral', kd: 'BRG004' },
    { nama: 'Jus Jeruk', kd: 'BRG029' },
  ]

  const orderStmt = db.prepare(`INSERT INTO mediasoft_kds_orders
    (kd_transaksi, nomor_meja, nomor_antrian, status, prioritas, catatan, nama_pelanggan,
     jenis_order, waktu_masuk, waktu_mulai_masak, waktu_selesai, waktu_siap, waktu_disajikan,
     dapur, dibuat_oleh)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'DINE_IN', ?, ?, ?, ?, ?, 'HOT_KITCHEN', ?)`)

  const itemStmt = db.prepare(`INSERT INTO mediasoft_kds_order_items
    (kds_order_id, kd_barang, nama_item, qty, catatan, status, waktu_mulai_masak, waktu_selesai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)

  const count = randInt(5, 10)
  for (let i = 0; i < count; i++) {
    const kdTrans = `KDS-${today.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
    const status = pick(orderStatuses)
    const meja = String(randInt(1, 12))
    const antrian = i + 1
    const waktuMasuk = formatDateTime(addDays(now, 0))
    const waktuMulai = status !== 'BARU' ? formatDateTime(addDays(now, 0)) : null
    const waktuSelesai = (status === 'SIAP' || status === 'DISAJIKAN') ? formatDateTime(addDays(now, 0)) : null
    const waktuSiap = (status === 'SIAP' || status === 'DISAJIKAN') ? formatDateTime(addDays(now, 0)) : null
    const waktuSaji = status === 'DISAJIKAN' ? formatDateTime(addDays(now, 0)) : null
    const catatan = randBool() ? pick(['Tidak pedas', 'Extra sambal', 'Porsi besar', null]) : null
    const pelanggan = pick(['Budi', 'Ani', 'Doni', 'Rini', 'Agus', null])

    orderStmt.run(kdTrans, meja, antrian, status, randInt(0, 2), catatan, pelanggan,
      waktuMasuk, waktuMulai, waktuSelesai, waktuSiap, waktuSaji, defaultUser)

    const orderId = db.prepare('SELECT last_insert_rowid() as id').get().id
    const numItems = randInt(1, 4)

    for (let j = 0; j < numItems; j++) {
      const item = pick(menuItems)
      const qty = randInt(1, 3)
      const itemCatatan = randBool() ? pick(['Tidak pedas', 'Extra sambal', null]) : null
      const itemStatus = pick(itemStatuses)
      const mulaiMasak = itemStatus !== 'BARU' ? formatDateTime(addDays(now, 0)) : null
      const selesai = itemStatus === 'SELESAI' ? formatDateTime(addDays(now, 0)) : null

      itemStmt.run(orderId, item.kd, item.nama, qty, itemCatatan, itemStatus, mulaiMasak, selesai)
    }
  }
  console.log(`✅ Seeded ${count} KDS orders with items`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 8. FLOOR LAYOUTS
// ═══════════════════════════════════════════════════════════════════════
;(function seedFloorLayouts() {
  if (!isEmpty('mediasoft_floor_layouts')) {
    console.log('⏭️  Floor layouts already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_floor_layouts
    (nama, kapasitas, width, height, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)`)

  stmt.run('Lantai 1', 40, 800, 600, isoNow())
  stmt.run('Lantai 2', 30, 800, 600, isoNow())
  console.log('✅ Seeded 2 floor layouts')
})()

// ═══════════════════════════════════════════════════════════════════════
// 9. TABLES
// ═══════════════════════════════════════════════════════════════════════
;(function seedTables() {
  if (!isEmpty('mediasoft_tables')) {
    console.log('⏭️  Tables already seeded')
    return
  }

  const layouts = db.prepare('SELECT id, nama, kapasitas FROM mediasoft_floor_layouts').all()

  const stmt = db.prepare(`INSERT INTO mediasoft_tables
    (floor_layout_id, nomor_meja, label, kapasitas, posisi_x, posisi_y, bentuk, lebar, tinggi, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const statuses = ['KOSONG', 'KOSONG', 'KOSONG', 'TERISI', 'RESERVASI']
  let tableCount = 0

  for (const layout of layouts) {
    const numTables = layout.id === 1 ? 8 : 6
    for (let i = 1; i <= numTables; i++) {
      const nomor = `${layout.id === 1 ? '1' : '2'}.${String(i).padStart(2, '0')}`
      const label = `Meja ${nomor}`
      const kapasitas = pick([2, 4, 4, 4, 6, 8])
      const x = 50 + ((i - 1) % 4) * 180
      const y = 50 + Math.floor((i - 1) / 4) * 180
      const status = pick(statuses)

      stmt.run(layout.id, nomor, label, kapasitas, x, y, 'persegi', 60, 60, status, isoNow())
      tableCount++
    }
  }
  console.log(`✅ Seeded ${tableCount} tables`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 10. RESERVATIONS
// ═══════════════════════════════════════════════════════════════════════
;(function seedReservations() {
  if (!isEmpty('mediasoft_reservations')) {
    console.log('⏭️  Reservations already seeded')
    return
  }

  const availableTables = db.prepare("SELECT id, nomor_meja FROM mediasoft_tables WHERE status IN ('KOSONG', 'RESERVASI')").all()

  const stmt = db.prepare(`INSERT INTO mediasoft_reservations
    (nomor_reservasi, nama_pelanggan, no_telp, email, jumlah_tamu, tgl_reservasi,
     jam_reservasi, jam_berakhir, table_id, catatan, status, sumber, dibuat_oleh, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?)`)

  const guests = [
    { nama: 'Andi Pratama', telp: '085611223344', email: 'andi@email.com' },
    { nama: 'Ratna Dewi', telp: '085622334455', email: 'ratna@email.com' },
    { nama: 'Dimas Aditya', telp: '085633445566', email: 'dimas@email.com' },
    { nama: 'Fitri Handayani', telp: '085644556677', email: 'fitri@email.com' },
    { nama: 'Gilang Ramadan', telp: '085655667788', email: 'gilang@email.com' },
  ]

  for (let i = 0; i < guests.length; i++) {
    const g = guests[i]
    const tglReservasi = formatDate(addDays(now, i < 3 ? 0 : 1))
    const jam = `${10 + i * 2}:00`
    const jamAkhir = `${12 + i * 2}:00`
    const table = availableTables[i % availableTables.length]
    const status = pick(['MENUNGGU', 'KONFIRMASI', 'HADIR'])

    stmt.run(
      `RES-${today.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
      g.nama, g.telp, g.email, randInt(2, 6),
      tglReservasi, jam, jamAkhir, table?.id || null,
      randBool() ? 'Meja dekat jendela' : null,
      status, defaultUser, isoNow()
    )
  }
  console.log(`✅ Seeded ${guests.length} reservations`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 11. RECIPES
// ═══════════════════════════════════════════════════════════════════════
;(function seedRecipes() {
  if (!isEmpty('mediasoft_recipes')) {
    console.log('⏭️  Recipes already seeded')
    return
  }

  const ingredientMap = {
    'BRG003': 'Oreo Vanilla 137g',
    'BRG004': 'Aqua 600ml',
    'BRG005': 'Teh Botol Sosro 450ml',
    'BRG006': 'Coca Cola 390ml',
    'BRG010': 'Pulpen Pilot Hitam',
    'BRG025': 'Biskuit Roma Kelapa 300g',
    'BRG026': 'Wafer Tango Coklat',
    'BRG027': 'Kopi Kapal Api Special Mix',
    'BRG028': 'Susu Ultra Milk Coklat 250ml',
    'BRG029': 'Pocari Sweat 350ml',
  }

  const recipes = [
    {
      kd_barang: 'BRG025',
      nama_resep: 'Nasi Goreng Spesial',
      hasil: 1, satuan: 'Porsi',
      bahan: [
        { kd: 'BRG003', nama: 'Oreo Vanilla 137g', qty: 0.5, satuan: 'Kg', harga: 15000 },
        { kd: 'BRG004', nama: 'Aqua 600ml', qty: 0.2, satuan: 'Liter', harga: 4000 },
        { kd: 'BRG006', nama: 'Coca Cola 390ml', qty: 0.1, satuan: 'Liter', harga: 6000 },
      ]
    },
    {
      kd_barang: 'BRG026',
      nama_resep: 'Mie Goreng Jawa',
      hasil: 1, satuan: 'Porsi',
      bahan: [
        { kd: 'BRG025', nama: 'Biskuit Roma Kelapa 300g', qty: 0.3, satuan: 'Kg', harga: 12000 },
        { kd: 'BRG010', nama: 'Pulpen Pilot Hitam', qty: 0.05, satuan: 'Liter', harga: 3000 },
        { kd: 'BRG004', nama: 'Aqua 600ml', qty: 0.1, satuan: 'Liter', harga: 4000 },
      ]
    },
    {
      kd_barang: 'BRG027',
      nama_resep: 'Es Campur Spesial',
      hasil: 1, satuan: 'Gelas',
      bahan: [
        { kd: 'BRG028', nama: 'Susu Ultra Milk Coklat 250ml', qty: 0.25, satuan: 'Liter', harga: 8000 },
        { kd: 'BRG027', nama: 'Kopi Kapal Api Special Mix', qty: 0.1, satuan: 'Kg', harga: 3500 },
        { kd: 'BRG029', nama: 'Pocari Sweat 350ml', qty: 0.1, satuan: 'Liter', harga: 7000 },
        { kd: 'BRG003', nama: 'Oreo Vanilla 137g', qty: 0.05, satuan: 'Kg', harga: 15000 },
      ]
    },
    {
      kd_barang: 'BRG028',
      nama_resep: 'Susu Cappuccino',
      hasil: 1, satuan: 'Gelas',
      bahan: [
        { kd: 'BRG027', nama: 'Kopi Kapal Api Special Mix', qty: 0.15, satuan: 'Kg', harga: 3500 },
        { kd: 'BRG028', nama: 'Susu Ultra Milk Coklat 250ml', qty: 0.3, satuan: 'Liter', harga: 8000 },
        { kd: 'BRG006', nama: 'Coca Cola 390ml', qty: 0.05, satuan: 'Liter', harga: 6000 },
      ]
    },
    {
      kd_barang: 'BRG029',
      nama_resep: 'Jus Campur Segar',
      hasil: 1, satuan: 'Gelas',
      bahan: [
        { kd: 'BRG029', nama: 'Pocari Sweat 350ml', qty: 0.3, satuan: 'Liter', harga: 7000 },
        { kd: 'BRG005', nama: 'Teh Botol Sosro 450ml', qty: 0.2, satuan: 'Liter', harga: 5000 },
        { kd: 'BRG004', nama: 'Aqua 600ml', qty: 0.1, satuan: 'Liter', harga: 4000 },
        { kd: 'BRG003', nama: 'Oreo Vanilla 137g', qty: 0.03, satuan: 'Kg', harga: 15000 },
      ]
    },
  ]

  const recipeStmt = db.prepare(`INSERT INTO mediasoft_recipes
    (kd_barang, nama_resep, hasil_produksi, satuan_hasil, biaya_produksi, harga_jual, margin, petunjuk,
     waktu_produksi_menit, kategori, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`)

  const ingredientStmt = db.prepare(`INSERT INTO mediasoft_recipe_ingredients
    (recipe_id, kd_barang, nama_bahan, qty, satuan, harga_per_unit, sub_total, persentase_terpakai)
    VALUES (?, ?, ?, ?, ?, ?, ?, 100)`)

  for (const r of recipes) {
    const biaya = r.bahan.reduce((sum, b) => sum + b.qty * b.harga, 0)
    const hargaJual = Math.round(biaya * 1.8)
    const margin = hargaJual - biaya

    recipeStmt.run(r.kd_barang, r.nama_resep, r.hasil, r.satuan, biaya, hargaJual, margin,
      `1. Siapkan bahan\n2. Campurkan semua bahan\n3. Sajikan`, randInt(10, 30), 'Makanan', isoNow())

    const recipeId = db.prepare('SELECT last_insert_rowid() as id').get().id

    for (const b of r.bahan) {
      const subTotal = b.qty * b.harga
      ingredientStmt.run(recipeId, b.kd, b.nama, b.qty, b.satuan, b.harga, subTotal)
    }
  }
  console.log(`✅ Seeded ${recipes.length} recipes with ingredients`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 12. DELIVERY ORDERS
// ═══════════════════════════════════════════════════════════════════════
;(function seedDeliveries() {
  if (!isEmpty('mediasoft_delivery_orders')) {
    console.log('⏭️  Delivery orders already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_delivery_orders
    (nomor_delivery, kd_transaksi, nama_penerima, no_telp_penerima, alamat, catatan_alamat,
     latitude, longitude, jarak_km, biaya_ongkir, status, kurir, estimasi_sampai,
     tgl_diantar, tgl_sampai, catatan, dibuat_oleh, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const deliveries = [
    { penerima: 'Budi Santoso', telp: '081111222333', alamat: 'Jl. Sudirman No. 45, Jakarta', ongkir: 15000, status: 'TERKIRIM', km: 5.2 },
    { penerima: 'Sari Dewi', telp: '081222333444', alamat: 'Jl. Gatot Subroto No. 78, Jakarta', ongkir: 20000, status: 'DIANTAR', km: 7.8 },
    { penerima: 'Agus Wijaya', telp: '081333444555', alamat: 'Jl. Thamrin No. 12, Jakarta', ongkir: 12000, status: 'DIPROSES', km: 3.5 },
    { penerima: 'Dian Permata', telp: '081444555666', alamat: 'Jl. Kuningan No. 33, Jakarta', ongkir: 25000, status: 'DIPROSES', km: 10.1 },
  ]

  for (let i = 0; i < deliveries.length; i++) {
    const d = deliveries[i]
    const noDelivery = `DEL-${today.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
    const estimasi = formatDate(addDays(now, 1))
    const tglDiantar = d.status === 'TERKIRIM' || d.status === 'DIANTAR' ? formatDateTime(addDays(now, 0)) : null
    const tglSampai = d.status === 'TERKIRIM' ? formatDateTime(addDays(now, 0)) : null

    stmt.run(noDelivery, null, d.penerima, d.telp, d.alamat,
      randBool() ? 'Pintu samping' : null,
      -6.2 + Math.random() * 0.1, 106.8 + Math.random() * 0.1,
      d.km, d.ongkir, d.status, 'Joko', estimasi,
      tglDiantar, tglSampai, null, defaultUser, isoNow())
  }
  console.log(`✅ Seeded ${deliveries.length} delivery orders`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 13. BANK ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════
;(function seedBankAccounts() {
  if (!isEmpty('mediasoft_bank_accounts')) {
    console.log('⏭️  Bank accounts already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_bank_accounts
    (nama_bank, nomor_rekening, atas_nama, saldo_awal, saldo_saat_ini, mata_uang, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 'IDR', 1, ?)`)

  stmt.run('Bank BCA', '1234567890', 'PT Warung Sejahtera', 50000000, 75000000, isoNow())
  stmt.run('Bank Mandiri', '9876543210', 'PT Warung Sejahtera', 30000000, 25000000, isoNow())
  stmt.run('Bank BRI', '5556667777', 'PT Warung Sejahtera', 20000000, 35000000, isoNow())
  console.log('✅ Seeded 3 bank accounts')
})()

// ═══════════════════════════════════════════════════════════════════════
// 14. BANK TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════
;(function seedBankTransactions() {
  if (!isEmpty('mediasoft_bank_transactions')) {
    console.log('⏭️  Bank transactions already seeded')
    return
  }

  const accounts = db.prepare('SELECT id, nama_bank FROM mediasoft_bank_accounts').all()

  const stmt = db.prepare(`INSERT INTO mediasoft_bank_transactions
    (bank_account_id, tgl, jenis, jumlah, keterangan, kategori, referensi, is_reconciled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`)

  let count = 0
  for (const acct of accounts) {
    const numTx = randInt(10, 15)
    for (let i = 0; i < numTx; i++) {
      const tgl = formatDate(addDays(now, -randInt(0, 30)))
      const jenis = pick(['DEBIT', 'DEBIT', 'KREDIT'])
      const jumlah = jenis === 'KREDIT'
        ? randInt(100000, 5000000)
        : randInt(50000, 2000000)
      const kategori = pick(['Penjualan', 'Pembelian', 'Operasional', 'Gaji', 'Lainnya'])
      const keterangan = `${kategori} - ${tgl}`

      stmt.run(acct.id, tgl, jenis, jumlah, keterangan, kategori, `REF-${tgl.replace(/-/g, '')}-${i}`, isoNow())
      count++
    }
  }
  console.log(`✅ Seeded ${count} bank transactions`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 15. FIXED ASSETS
// ═══════════════════════════════════════════════════════════════════════
;(function seedFixedAssets() {
  if (!isEmpty('mediasoft_fixed_assets')) {
    console.log('⏭️  Fixed assets already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_fixed_assets
    (kode_aset, nama_aset, kategori, deskripsi, tgl_perolehan, harga_perolehan, nilai_residu,
     masa_manfaat_tahun, metode_penyusutan, nilai_buku, akumulasi_penyusutan, lokasi,
     penanggung_jawab, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AKTIF', ?)`)

  const assets = [
    { kode: 'AST-001', nama: 'Komputer Kasir', kategori: 'Elektronik', desc: 'CPU + Monitor 19 inch', tgl: '2023-06-01', harga: 8500000, residu: 500000, manfaat: 5, metode: 'GARIS_LURUS', lokasi: 'Kantor Depan', pic: 'Dewi Lestari' },
    { kode: 'AST-002', nama: 'Mesin Kasir (Printer+Drawer)', kategori: 'Elektronik', desc: 'POS Printer Epson + Laci Uang', tgl: '2023-06-01', harga: 4500000, residu: 300000, manfaat: 5, metode: 'GARIS_LURUS', lokasi: 'Kasir', pic: 'Siti Nurhaliza' },
    { kode: 'AST-003', nama: 'Motor Delivery', kategori: 'Kendaraan', desc: 'Honda Beat 2023', tgl: '2023-08-15', harga: 18000000, residu: 3000000, manfaat: 8, metode: 'GARIS_LURUS', lokasi: 'Parkir Belakang', pic: 'Ahmad Fauzi' },
    { kode: 'AST-004', nama: 'AC Split 2 PK', kategori: 'Elektronik', desc: 'AC Daikin untuk ruang tamu', tgl: '2024-01-10', harga: 7500000, residu: 500000, manfaat: 5, metode: 'GARIS_LURUS', lokasi: 'Ruang Tamu', pic: 'Rudi Hartono' },
    { kode: 'AST-005', nama: 'Meja & Kursi Tamu', kategori: 'Furniture', desc: 'Set meja kursi kayu jati', tgl: '2023-06-01', harga: 5000000, residu: 500000, manfaat: 10, metode: 'GARIS_LURUS', lokasi: 'Ruang Tamu', pic: 'Rudi Hartono' },
  ]

  for (const a of assets) {
    const akumulasi = Math.round((a.harga - a.residu) / a.manfaat * 1000000 / 12 / 1000000 * 12) // simplified
    const nilaiBuku = a.harga - akumulasi
    stmt.run(a.kode, a.nama, a.kategori, a.desc, a.tgl, a.harga, a.residu,
      a.manfaat, a.metode, nilaiBuku, akumulasi, a.lokasi, a.pic, isoNow())
  }
  console.log(`✅ Seeded ${assets.length} fixed assets`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 16. BUDGETS
// ═══════════════════════════════════════════════════════════════════════
;(function seedBudgets() {
  if (!isEmpty('mediasoft_budgets')) {
    console.log('⏭️  Budgets already seeded')
    return
  }

  const tahun = now.getFullYear()

  const stmt = db.prepare(`INSERT INTO mediasoft_budgets
    (nama, kategori, periode_bulan, periode_tahun, jumlah_anggaran, jumlah_terealisasi, selisih, catatan, status, dibuat_oleh, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AKTIF', ?, ?)`)

  const budgets = [
    { nama: 'Operasional Bulanan', kategori: 'Operasional', bulan: now.getMonth() + 1, anggaran: 15000000, teralisasi: 12000000, catatan: 'Listrik, air, internet, ATK' },
    { nama: 'Gaji Karyawan', kategori: 'SDM', bulan: now.getMonth() + 1, anggaran: 35000000, teralisasi: 34500000, catatan: 'Gaji pokok + tunjangan' },
    { nama: 'Stok Barang', kategori: 'Inventori', bulan: now.getMonth() + 1, anggaran: 50000000, teralisasi: 42000000, catatan: 'Pembelian barang dagang' },
    { nama: 'Promosi & Marketing', kategori: 'Marketing', bulan: now.getMonth() + 1, anggaran: 5000000, teralisasi: 3200000, catatan: 'Sosmed, brosur' },
    { nama: 'Perawatan & Perbaikan', kategori: 'Operasional', bulan: now.getMonth() + 1, anggaran: 3000000, teralisasi: 1500000, catatan: 'AC, komputer, dll' },
    { nama: 'Anggaran Tahunan', kategori: 'Strategis', bulan: null, anggaran: 500000000, teralisasi: 250000000, catatan: 'Renovasi & ekspansi' },
  ]

  for (const b of budgets) {
    const selisih = b.anggaran - b.teralisasi
    stmt.run(b.nama, b.kategori, b.bulan, tahun, b.anggaran, b.teralisasi, selisih, b.catatan, defaultUser, isoNow())
  }
  console.log(`✅ Seeded ${budgets.length} budgets`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 17. GIFT CARDS
// ═══════════════════════════════════════════════════════════════════════
;(function seedGiftCards() {
  if (!isEmpty('mediasoft_gift_cards')) {
    console.log('⏭️  Gift cards already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_gift_cards
    (kode, nominal, saldo, pembeli, penerima, pesan, masa_berlaku, status, tgl_dibeli, dibuat_oleh, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const cards = [
    { kode: 'GC-001', nominal: 100000, pembeli: 'Budi Santoso', penerima: 'Ani', pesan: 'Selamat ulang tahun!', status: 'AKTIF' },
    { kode: 'GC-002', nominal: 200000, pembeli: 'Citra Dewi', penerima: 'Ibu', pesan: 'Terima kasih, Ma', status: 'AKTIF' },
    { kode: 'GC-003', nominal: 50000, pembeli: 'Doni Prasetyo', penerima: 'Teman', pesan: 'Makasih bantuannya', status: 'HABIS' },
    { kode: 'GC-004', nominal: 300000, pembeli: 'Eka Fitriani', penerima: 'Suami', pesan: 'Untuk kamu sayang', status: 'AKTIF' },
  ]

  for (const c of cards) {
    const berlaku = formatDate(addDays(now, 365))
    stmt.run(c.kode, c.nominal, c.nominal, c.pembeli, c.penerima, c.pesan, berlaku, c.status, formatDate(addDays(now, -randInt(0, 30))), defaultUser, isoNow())
  }
  console.log(`✅ Seeded ${cards.length} gift cards`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 18. CUSTOMER FEEDBACK
// ═══════════════════════════════════════════════════════════════════════
;(function seedFeedback() {
  if (!isEmpty('mediasoft_customer_feedback')) {
    console.log('⏭️  Customer feedback already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_customer_feedback
    (kd_customer, nama, rating, kategori, pesan, status, tgl_dibuat)
    VALUES (?, ?, ?, ?, ?, 'BARU', ?)`)

  const feedbacks = [
    { nama: 'Budi Santoso', rating: 5, kategori: 'PELAYANAN', pesan: 'Pelayanan sangat ramah dan cepat. Terima kasih!' },
    { nama: 'Sari Dewi', rating: 4, kategori: 'MAKANAN', pesan: 'Makanan enak, tapi agak lama penyajiannya' },
    { nama: 'Agus Wijaya', rating: 5, kategori: 'SUASANA', pesan: 'Tempat nyaman, cocok untuk kumpul keluarga' },
    { nama: 'Dian Permata', rating: 3, kategori: 'MAKANAN', pesan: 'Rasa biasa saja, harga agak mahal' },
    { nama: 'Rini Andriani', rating: 4, kategori: 'PELAYANAN', pesan: 'Kasir ramah, tempat bersih' },
    { nama: 'Hendra Gunawan', rating: 5, kategori: 'MAKANAN', pesan: 'Nasi gorengnya enak banget! Recommended!' },
    { nama: 'Fitri Handayani', rating: 3, kategori: 'HARGA', pesan: 'Minuman terlalu manis, harga agak tinggi untuk porsi kecil' },
    { nama: 'Dimas Aditya', rating: 4, kategori: 'PELAYANAN', pesan: 'Waiter fast response, good service' },
  ]

  for (const f of feedbacks) {
    stmt.run(defaultCustomer, f.nama, f.rating, f.kategori, f.pesan, formatDateTime(addDays(now, -randInt(0, 14))))
  }
  console.log(`✅ Seeded ${feedbacks.length} customer feedback`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 19. CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════
;(function seedCampaigns() {
  if (!isEmpty('mediasoft_campaigns')) {
    console.log('⏭️  Campaigns already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_campaigns
    (nama, tipe, subjek, konten, target, status, tgl_terjadwal, tgl_terkirim, total_target, total_terkirim, dibuat_oleh, created_at)
    VALUES (?, ?, ?, ?, 'SEMUA', ?, ?, ?, ?, ?, ?, ?)`)

  const campaigns = [
    {
      nama: 'Promo Akhir Pekan',
      tipe: 'WHATSAPP',
      subjek: 'Promo Spesial Akhir Pekan!',
      konten: 'Halo! Dapatkan diskon 10% untuk semua menu setiap hari Sabtu dan Minggu. Kunjungi kami sekarang!',
      status: 'TERKIRIM',
      terjadwal: formatDate(addDays(now, -3)),
      terkirim: formatDate(addDays(now, -3)),
      target: 50,
      kirim: 48,
    },
    {
      nama: 'Diskon Ulang Tahun',
      tipe: 'EMAIL',
      subjek: 'Selamat Ulang Tahun! Dapatkan Voucher Spesial',
      konten: 'Selamat ulang tahun! Sebagai bentuk apresiasi, kami memberikan voucher diskon 20% untuk kunjungan Anda berikutnya.',
      status: 'DRAFT',
      terjadwal: formatDate(addDays(now, 7)),
      terkirim: null,
      target: 100,
      kirim: 0,
    },
    {
      nama: 'Menu Baru',
      tipe: 'WHATSAPP',
      subjek: 'Ada Menu Baru nih!',
      konten: 'Halo! Kami baru saja meluncurkan menu baru yang pastinya lezat. Yuk cobain sekarang! Nasi Goreng Special dan Es Campur Segar.',
      status: 'DRAFT',
      terjadwal: formatDate(addDays(now, 14)),
      terkirim: null,
      target: 75,
      kirim: 0,
    },
  ]

  for (const c of campaigns) {
    stmt.run(c.nama, c.tipe, c.subjek, c.konten, c.status, c.terjadwal, c.terkirim, c.target, c.kirim, defaultUser, isoNow())
  }
  console.log(`✅ Seeded ${campaigns.length} campaigns`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 20. STOREFRONT SETTINGS
// ═══════════════════════════════════════════════════════════════════════
;(function seedStorefront() {
  const exists = db.prepare('SELECT COUNT(*) as cnt FROM mediasoft_storefront_settings').get().cnt > 0
  if (exists) {
    console.log('⏭️  Storefront settings already seeded')
    return
  }

  db.prepare(`INSERT INTO mediasoft_storefront_settings
    (id, domain, nama_toko, deskripsi, warna_utama, is_active, metode_pengiriman, metode_pembayaran, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).run(
    'tokokami.store',
    'Warung Sejahtera',
    'Toko kelontong online terlengkap dengan harga terjangkau. Belanja mudah, cepat, dan aman.',
    '#6366f1',
    JSON.stringify([{ nama: 'Gojek', biaya: 15000 }, { nama: 'Grab', biaya: 15000 }]),
    JSON.stringify([{ nama: 'Transfer Bank', icon: 'bank' }, { nama: 'GoPay', icon: 'gopay' }]),
    isoNow(), isoNow()
  )

  // Seed some storefront products
  if (isEmpty('mediasoft_storefront_products')) {
    const spStmt = db.prepare(`INSERT INTO mediasoft_storefront_products
      (kd_barang, tampilkan, harga_online, stok_online, created_at)
      VALUES (?, 1, ?, ?, ?)`)

    const onlineProducts = existingBarang.filter(b => b.kd_barang !== 'B09' && b.kd_barang !== 'brg 2').slice(0, 10)
    for (const p of onlineProducts) {
      const harga = db.prepare('SELECT harga_barang FROM mediasoft_harga WHERE kd_barang = ?').get(p.kd_barang)
      spStmt.run(p.kd_barang, harga ? Math.round(harga.harga_barang * 1.1) : 10000, randInt(5, 50), isoNow())
    }
    console.log(`✅ Seeded storefront settings + ${onlineProducts.length} products`)
  } else {
    console.log('✅ Seeded storefront settings')
  }
})()

// ═══════════════════════════════════════════════════════════════════════
// 21. DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════
;(function seedDocuments() {
  if (!isEmpty('mediasoft_documents')) {
    console.log('⏭️  Documents already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_documents
    (nomor_dokumen, nama, tipe, kategori, file_path, file_size, file_type, catatan, tags, status, dibuat_oleh, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AKTIF', ?, ?)`)

  const docs = [
    { nomor: 'KONTRAK-001', nama: 'Kontrak Sewa Gedung', tipe: 'KONTRAK', kategori: 'Legal', path: '/documents/sewa_gedung.pdf', size: 2500000, ftype: 'application/pdf', catatan: 'Sewa 1 tahun', tags: 'sewa,gedung,kontrak' },
    { nomor: 'INV-2024-001', nama: 'Invoice PT Supplier', tipe: 'INVOICE', kategori: 'Keuangan', path: '/documents/invoice_001.pdf', size: 500000, ftype: 'application/pdf', catatan: 'Pembelian stok bulanan', tags: 'invoice,pembelian' },
    { nomor: null, nama: 'Foto Produk Unggulan', tipe: 'GAMBAR', kategori: 'Marketing', path: '/documents/produk.jpg', size: 1200000, ftype: 'image/jpeg', catatan: 'Untuk katalog online', tags: 'foto,produk' },
    { nomor: 'LAPORAN-2024-Q1', nama: 'Laporan Keuangan Q1 2024', tipe: 'LAPORAN', kategori: 'Keuangan', path: '/documents/laporan_q1.xlsx', size: 800000, ftype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', catatan: 'Laporan laba rugi', tags: 'laporan,keuangan' },
    { nomor: 'NPWP-PT', nama: 'NPWP Perusahaan', tipe: 'DOKUMEN_PAJAK', kategori: 'Legal', path: '/documents/npwp.pdf', size: 350000, ftype: 'application/pdf', catatan: 'NPWP PT Warung Sejahtera', tags: 'npwp,pajak' },
  ]

  for (const d of docs) {
    stmt.run(d.nomor, d.nama, d.tipe, d.kategori, d.path, d.size, d.ftype, d.catatan, d.tags, defaultUser, isoNow())
  }
  console.log(`✅ Seeded ${docs.length} documents`)
})()

// ═══════════════════════════════════════════════════════════════════════
// 22. FORECAST SETTINGS
// ═══════════════════════════════════════════════════════════════════════
;(function seedForecast() {
  const exists = db.prepare('SELECT COUNT(*) as cnt FROM mediasoft_forecast_settings').get().cnt > 0
  if (exists) {
    console.log('⏭️  Forecast settings already seeded')
    return
  }

  db.prepare(`INSERT INTO mediasoft_forecast_settings
    (id, metode, periode_hari, periode_data, is_active, updated_at)
    VALUES (1, 'MOVING_AVERAGE', 30, 90, 1, ?)`).run(isoNow())

  console.log('✅ Seeded forecast settings')
})()

// ═══════════════════════════════════════════════════════════════════════
// 23. DYNAMIC PRICING RULES
// ═══════════════════════════════════════════════════════════════════════
;(function seedPricingRules() {
  if (!isEmpty('mediasoft_dynamic_pricing_rules')) {
    console.log('⏭️  Dynamic pricing rules already seeded')
    return
  }

  const stmt = db.prepare(`INSERT INTO mediasoft_dynamic_pricing_rules
    (nama, kd_barang, tipe, nilai, kondisi, prioritas, is_active, tgl_mulai, tgl_berakhir, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`)

  const rules = [
    {
      nama: 'Diskon Malam',
      barang: null,
      tipe: 'DISKON_PERSEN',
      nilai: 15,
      kondisi: JSON.stringify({ jam_mulai: '18:00', jam_selesai: '22:00', hari: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] }),
      prioritas: 1,
      mulai: formatDate(addDays(now, -30)),
      akhir: formatDate(addDays(now, 365)),
    },
    {
      nama: 'Diskon Akhir Pekan',
      barang: null,
      tipe: 'DISKON_PERSEN',
      nilai: 10,
      kondisi: JSON.stringify({ jam_mulai: '08:00', jam_selesai: '22:00', hari: ['Sabtu', 'Minggu'] }),
      prioritas: 2,
      mulai: formatDate(addDays(now, -30)),
      akhir: formatDate(addDays(now, 365)),
    },
    {
      nama: 'Harga Spesial Minuman',
      barang: 'BRG004',
      tipe: 'HARGA_TETAP',
      nilai: 3000,
      kondisi: JSON.stringify({ jam_mulai: '10:00', jam_selesai: '17:00', hari: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] }),
      prioritas: 1,
      mulai: formatDate(addDays(now, -15)),
      akhir: formatDate(addDays(now, 30)),
    },
  ]

  for (const r of rules) {
    stmt.run(r.nama, r.barang, r.tipe, r.nilai, r.kondisi, r.prioritas, r.mulai, r.akhir, isoNow())
  }
  console.log(`✅ Seeded ${rules.length} dynamic pricing rules`)
})()

// ─── Cleanup ─────────────────────────────────────────────────────────
db.pragma('foreign_keys = ON')
db.close()

console.log('✅ Seed data selesai!')
process.exit(0)
