import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const pengguna = sqliteTable('mediasoft_pengguna', {
  nama_pengguna: text('nama_pengguna').primaryKey(),
  kata_sandi: text('kata_sandi'),
  nama_lengkap: text('nama_lengkap'),
  tgl_wkt_simpan: text('tgl_wkt_simpan'),
  tgl_wkt_edit: text('tgl_wkt_edit'),
  status_user: text('status_user').default('Aktif').notNull(),
  terakhir_login: text('terakhir_login'),
  hak_akses: text('hak_akses').default('kasir').notNull(), // developer, operator, kasir, superadmin, admin
  email: text('email'),
  no_telp: text('no_telp'),
  password_hash_type: text('password_hash_type').default('sha1'), // sha1, bcrypt
})

export const satuan = sqliteTable('mediasoft_satuan', {
  kd_satuan: integer('kd_satuan').primaryKey({ autoIncrement: true }),
  nama_satuan: text('nama_satuan'),
})

export const kategoriBarang = sqliteTable('mediasoft_kategori_barang', {
  kd_kategori_barang: integer('kd_kategori_barang').primaryKey({ autoIncrement: true }),
  kategori_barang: text('kategori_barang'),
})

export const barang = sqliteTable('mediasoft_barang', {
  kd_barang: text('kd_barang').primaryKey(),
  nama_barang: text('nama_barang'),
  tgl_wkt_simpan: text('tgl_wkt_simpan'),
  tgl_wkt_ubah: text('tgl_wkt_ubah'),
  foto_barang: text('foto_barang'),
  deskripsi_barang: text('deskripsi_barang'),
  nama_pengguna: text('nama_pengguna'),
  stok: integer('stok').default(0),
  stok_minimum: integer('stok_minimum').default(5),
  kd_satuan: integer('kd_satuan').default(0),
  jenis_transaksi: text('jenis_transaksi').default('INCOME'),
  kd_kategori_barang: integer('kd_kategori_barang').default(0),
  barcode: text('barcode'),
  expired_date: text('expired_date'),
})

export const harga = sqliteTable('mediasoft_harga', {
  kd_barang: text('kd_barang').primaryKey(),
  harga_barang: real('harga_barang').default(0),
  potongan: integer('potongan').default(0),
  harga_modal: real('harga_modal').default(0),
})

export const penjualan = sqliteTable('mediasoft_penjualan', {
  kd_tansaksi_jual: text('kd_tansaksi_jual').primaryKey(),
  tgl_wkt_transaksi: text('tgl_wkt_transaksi'),
  deskripsi: text('deskripsi'),
  username_transaksi: text('username_transaksi'),
  total_qty: integer('total_qty').default(0),
  sub_total: real('sub_total').default(0),
  pajak: real('pajak').default(0),
  yang_dibayar: real('yang_dibayar').default(0),
  kembalian: real('kembalian').default(0),
  jenis_pembayaran: text('jenis_pembayaran').default('TUNAI'),
  kd_customer: text('kd_customer'),
})

export const penjualanDetail = sqliteTable('mediasoft_penjualan_detail', {
  kd_trans_jual_detail: integer('kd_trans_jual_detail').primaryKey({ autoIncrement: true }),
  kd_tansaksi_jual: text('kd_tansaksi_jual'),
  kd_barang: text('kd_barang'),
  harga_modal: integer('harga_modal').default(0),
  harga_jual: integer('harga_jual').default(0),
  qty: integer('qty').default(0),
  disc: integer('disc').default(0),
  harga_disc: real('harga_disc').default(0),
  total_harga_jual: real('total_harga_jual').default(0),
  nama_pengguna: text('nama_pengguna'),
  tgl_waktu_input: text('tgl_waktu_input'),
})

export const identitas = sqliteTable('mediasoft_identitas', {
  kode: integer('kode').primaryKey(),
  namatoko: text('namatoko'),
  alamattoko: text('alamattoko'),
  nomortelptoko: text('nomortelptoko'),
  nomorwaowner: text('nomorwaowner'),
  alamatemailowner: text('alamatemailowner'),
  logo: text('logo'),
  npwp: text('npwp'),
  pajak_persen: real('pajak_persen').default(0),
  auto_barcode: integer('auto_barcode').default(1),
  barcode_prefix: text('barcode_prefix').default('POS'),
  auto_print: integer('auto_print').default(0),
  struk_footer: text('struk_footer').default('Terima kasih atas kunjungan Anda'),
  auto_backup: integer('auto_backup').default(1),
  backup_retention: integer('backup_retention').default(7),
  notif_stok: integer('notif_stok').default(1),
  min_stok: integer('min_stok').default(5),
})

export const supplier = sqliteTable('mediasoft_supplier', {
  kd_suplier: text('kd_suplier').primaryKey(),
  nama_suplier: text('nama_suplier'),
  alamat_suplier: text('alamat_suplier'),
  no_telp_hp: text('no_telp_hp'),
  tgl_wkt_simpan: text('tgl_wkt_simpan'),
  tgl_wkt_edit: text('tgl_wkt_edit'),
  nama_pengguna: text('nama_pengguna'),
  email: text('email'),
  status: text('status').default('Aktif'),
})

// NEW TABLES

export const customer = sqliteTable('mediasoft_customer', {
  kd_customer: text('kd_customer').primaryKey(),
  nama_customer: text('nama_customer').notNull(),
  no_telp: text('no_telp'),
  email: text('email'),
  alamat: text('alamat'),
  tgl_lahir: text('tgl_lahir'),
  poin: integer('poin').default(0),
  total_belanja: real('total_belanja').default(0),
  tgl_daftar: text('tgl_daftar'),
  status: text('status').default('Aktif'),
})

export const kasDrawer = sqliteTable('mediasoft_kas_drawer', {
  kd_kas: text('kd_kas').primaryKey(),
  tgl_buka: text('tgl_buka').notNull(),
  tgl_tutup: text('tgl_tutup'),
  username: text('username').notNull(),
  modal_awal: real('modal_awal').default(0),
  total_penjualan: real('total_penjualan').default(0),
  total_pemasukan: real('total_pemasukan').default(0),
  total_pengeluaran: real('total_pengeluaran').default(0),
  saldo_akhir: real('saldo_akhir').default(0),
  selisih: real('selisih').default(0),
  status: text('status').default('OPEN'), // OPEN, CLOSED
  catatan: text('catatan'),
})

export const kasTransaksi = sqliteTable('mediasoft_kas_transaksi', {
  kd_kas_transaksi: integer('kd_kas_transaksi').primaryKey({ autoIncrement: true }),
  kd_kas: text('kd_kas').notNull(),
  tgl_transaksi: text('tgl_transaksi').notNull(),
  jenis: text('jenis').notNull(), // MASUK, KELUAR
  jumlah: real('jumlah').notNull(),
  keterangan: text('keterangan'),
  username: text('username'),
})

export const notifikasi = sqliteTable('mediasoft_notifikasi', {
  kd_notifikasi: integer('kd_notifikasi').primaryKey({ autoIncrement: true }),
  judul: text('judul').notNull(),
  pesan: text('pesan').notNull(),
  jenis: text('jenis').notNull(), // STOK, EXPIRED, SYSTEM, INFO
  tgl_dibuat: text('tgl_dibuat').notNull(),
  dibaca: integer('dibaca').default(0), // 0 = belum, 1 = sudah
  username: text('username'),
  link: text('link'),
})

export const backup = sqliteTable('mediasoft_backup', {
  kd_backup: integer('kd_backup').primaryKey({ autoIncrement: true }),
  nama_file: text('nama_file').notNull(),
  ukuran: integer('ukuran'),
  tgl_backup: text('tgl_backup').notNull(),
  username: text('username'),
  keterangan: text('keterangan'),
})

export const pembelian = sqliteTable('mediasoft_pembelian', {
  kd_pembelian: text('kd_tansaksi_beli').primaryKey(),
  tgl_pembelian: text('tgl_wkt_transaksi'),
  deskripsi: text('deskripsi'),
  kd_suplier: text('kd_suplier'),
  username: text('username_transaksi'),
  total_qty: integer('total_qty').default(0),
  sub_total: real('sub_total').default(0),
  yang_dibayar: real('yang_dibayar').default(0),
  kembalian: real('kembalian').default(0),
  sisa_hutang: real('sisa_hutang').default(0),
  status: text('status').default('LUNAS'),
  catatan: text('catatan'),
})

export const pembelianDetail = sqliteTable('mediasoft_pembelian_detail', {
  kd_pembelian_detail: integer('kd_trans_beli_detail').primaryKey({ autoIncrement: true }),
  kd_pembelian: text('kd_tansaksi_beli').notNull(),
  kd_barang: text('kd_barang').notNull(),
  qty: integer('qty').default(0),
  harga_beli: integer('harga_beli').default(0),
  disc: integer('disc').default(0),
  harga_disc: real('harga_disc').default(0),
  total: real('total_harga_beli').default(0),
  nama_pengguna: text('nama_pengguna'),
  tgl_waktu_input: text('tgl_waktu_input'),
})

export const activityLog = sqliteTable('mediasoft_activity_log', {
  kd_log: integer('kd_log').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  aktivitas: text('aktivitas').notNull(),
  modul: text('modul').notNull(), // LOGIN, PRODUK, TRANSAKSI, dll
  tgl_aktivitas: text('tgl_aktivitas').notNull(),
  ip_address: text('ip_address'),
  detail: text('detail'),
})

export const subscriptionPlans = sqliteTable('mediasoft_subscription_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  duration_days: integer('duration_days').notNull(),
  features: text('features').default('[]'), // JSON array of strings
  is_active: integer('is_active').default(1), // 1 = active, 0 = inactive
  is_recommended: integer('is_recommended').default(0),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at'),
})

export const tutorials = sqliteTable('mediasoft_tutorials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  created_at: text('created_at').notNull(),
})

export const hppCalculations = sqliteTable('mediasoft_hpp_calculations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  nama_produk: text('nama_produk').notNull(),
  modal: real('modal').default(0),
  biaya_lain: real('biaya_lain').default(0),
  total_hpp: real('total_hpp').default(0),
  created_at: text('created_at').notNull(),
})

// --- ADVANCED FEATURES TABLES ---

export const strukSettings = sqliteTable('mediasoft_struk_settings', {
  id: integer('id').primaryKey(),
  printer_type: text('printer_type').default('thermal'),
  paper_size: text('paper_size').default('58mm'), // 58mm, 80mm
  layout_type: text('layout_type').default('classic'), // classic, modern, minimal
  show_logo: integer('show_logo').default(1),
  show_alamat: integer('show_alamat').default(1),
  show_telepon: integer('show_telepon').default(1),
  show_email: integer('show_email').default(1),
  show_kasir: integer('show_kasir').default(1),
  show_customer: integer('show_customer').default(1),
  footer_text: text('footer_text').default('Terima kasih atas kunjungan Anda'),
  qris_image: text('qris_image'),
  qris_enabled: integer('qris_enabled').default(0),
  updated_at: text('updated_at'),
})

export const currencies = sqliteTable('mediasoft_currencies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(), // USD, EUR, IDR
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  exchange_rate: real('exchange_rate').default(1),
  is_default: integer('is_default').default(0),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').notNull(),
})

export const barangBatches = sqliteTable('mediasoft_barang_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kd_barang: text('kd_barang').notNull(),
  batch_no: text('batch_no').notNull(),
  stok: integer('stok').default(0),
  expired_date: text('expired_date'),
  warehouse_id: integer('warehouse_id'),
  created_at: text('created_at').notNull(),
})

export const barangSerials = sqliteTable('mediasoft_barang_serials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kd_barang: text('kd_barang').notNull(),
  serial_no: text('serial_no').notNull(),
  status: text('status').default('AVAILABLE'), // AVAILABLE, SOLD, RETURNED
  warehouse_id: integer('warehouse_id'),
  created_at: text('created_at').notNull(),
})

export const warehouses = sqliteTable('mediasoft_warehouses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location'),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').notNull(),
})

export const stockTransfers = sqliteTable('mediasoft_stock_transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kd_barang: text('kd_barang').notNull(),
  from_warehouse_id: integer('from_warehouse_id').notNull(),
  to_warehouse_id: integer('to_warehouse_id').notNull(),
  qty: integer('qty').default(0),
  username: text('username').notNull(),
  created_at: text('created_at').notNull(),
})

export const promos = sqliteTable('mediasoft_promos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // PERCENTAGE, FIXED, BUY_X_GET_Y, BUNDLE, HAPPY_HOUR
  value: real('value').default(0),
  min_purchase: real('min_purchase').default(0),
  max_discount: real('max_discount'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  start_time: text('start_time'), // For happy hour
  end_time: text('end_time'), // For happy hour
  usage_limit: integer('usage_limit'),
  usage_count: integer('usage_count').default(0),
  is_active: integer('is_active').default(1),
  conditions: text('conditions'), // JSON
  created_at: text('created_at').notNull(),
})

export const auditTrail = sqliteTable('mediasoft_audit_trail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  action: text('action').notNull(),
  table_name: text('table_name'),
  record_id: text('record_id'),
  old_values: text('old_values'), // JSON
  new_values: text('new_values'), // JSON
  ip_address: text('ip_address'),
  created_at: text('created_at').notNull(),
})
