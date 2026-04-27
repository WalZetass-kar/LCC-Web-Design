// Shared TypeScript types for renderer ↔ main IPC communication

export interface Barang {
  kd_barang: string
  nama_barang: string | null
  stok: number | null
  stok_minimum: number | null
  foto_barang: string | null
  deskripsi_barang: string | null
  kd_kategori_barang: number | null
  kd_satuan: number | null
  jenis_transaksi: string | null
  harga_barang: number | null
  potongan: number | null
  harga_modal: number | null
  kategori_barang: string | null
  barcode: string | null
  expired_date: string | null
}

export interface Kategori {
  kd_kategori_barang: number
  kategori_barang: string | null
}

export interface Satuan {
  kd_satuan: number
  nama_satuan: string | null
}

export interface Penjualan {
  kd_tansaksi_jual: string
  tgl_wkt_transaksi: string | null
  username_transaksi: string | null
  total_qty: number | null
  sub_total: number | null
  pajak: number | null
  yang_dibayar: number | null
  kembalian: number | null
  jenis_pembayaran: string | null
  kd_customer: string | null
}

export interface PenjualanDetailItem {
  kd_trans_jual_detail: number
  kd_barang: string | null
  nama_barang: string | null
  harga_jual: number | null
  qty: number | null
  disc: number | null
  total_harga_jual: number | null
}

export interface CartItem {
  kd_barang: string
  nama_barang: string
  harga_jual: number
  harga_modal: number
  qty: number
  disc: number
}

export interface DashboardSummary {
  today: { count: number; total: number }
  week: { count: number; total: number }
  month: { count: number; total: number }
  totalBarang: number
  lowStockCount: number
  chartData: { label: string; total: number }[]
}

export interface Identitas {
  kode: number
  namatoko: string | null
  alamattoko: string | null
  nomortelptoko: string | null
  nomorwaowner: string | null
  alamatemailowner: string | null
  logo: string | null
  npwp: string | null
  pajak_persen: number | null
}

export interface Supplier {
  kd_suplier: string
  nama_suplier: string | null
  alamat_suplier: string | null
  no_telp_hp: string | null
  email: string | null
  status: string | null
  tgl_wkt_simpan: string | null
  tgl_wkt_edit: string | null
}

export interface Customer {
  kd_customer: string
  nama_customer: string
  no_telp: string | null
  email: string | null
  alamat: string | null
  tgl_lahir: string | null
  poin: number | null
  total_belanja: number | null
  tgl_daftar: string | null
  status: string | null
}

export interface KasDrawer {
  kd_kas: string
  tgl_buka: string
  tgl_tutup: string | null
  username: string
  modal_awal: number | null
  total_penjualan: number | null
  total_pengeluaran: number | null
  saldo_akhir: number | null
  selisih: number | null
  status: string | null
  catatan: string | null
}

export interface KasTransaksi {
  kd_kas_transaksi: number
  kd_kas: string
  tgl_transaksi: string
  jenis: string
  jumlah: number
  keterangan: string | null
  username: string | null
}

export interface Notifikasi {
  kd_notifikasi: number
  judul: string
  pesan: string
  jenis: string
  tgl_dibuat: string
  dibaca: number | null
  username: string | null
  link: string | null
}

export interface Backup {
  kd_backup: number
  nama_file: string
  ukuran: number | null
  tgl_backup: string
  username: string | null
  keterangan: string | null
}

export interface Pembelian {
  kd_pembelian: string
  tgl_pembelian: string
  kd_suplier: string | null
  nama_suplier: string | null
  total_qty: number | null
  sub_total: number | null
  yang_dibayar: number | null
  sisa_hutang: number | null
  status: string | null
  username: string | null
  catatan: string | null
}

export interface PembelianDetail {
  kd_pembelian_detail: number
  kd_pembelian: string
  kd_barang: string
  nama_barang: string | null
  qty: number | null
  harga_beli: number | null
  total: number | null
}

export interface Pengguna {
  nama_pengguna: string
  nama_lengkap: string | null
  email: string | null
  no_telp: string | null
  role: string | null
  status_user: string | null
  terakhir_login: string | null
  tgl_wkt_simpan: string | null
}

export interface ActivityLog {
  kd_log: number
  username: string
  aktivitas: string
  modul: string
  tgl_aktivitas: string
  ip_address: string | null
  detail: string | null
}

export interface LaporanPenjualan {
  periode: string
  total_transaksi: number
  total_qty: number
  total_penjualan: number
  total_modal: number
  laba_kotor: number
  margin_persen: number
}

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  kd_transaksi?: string
}

export interface UserSession {
  nama_pengguna: string
  nama_lengkap: string | null
  role: string | null
}

// Extend window with our API bridge
declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}
