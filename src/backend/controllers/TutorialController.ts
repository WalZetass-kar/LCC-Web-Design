import { sqlite } from '../../database/connection.js'

function initWithDefaultTutorials() {
  try {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_tutorials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    const existing = sqlite.prepare('SELECT COUNT(*) as count FROM mediasoft_tutorials').get() as any
    if (existing?.count === 0) {
      const tutorials = [
        {
          title: 'Cara Menggunakan Fitur Pajak/PPN',
          content: `## Pengaturan Pajak/PPN

Fitur ini digunakan untuk mengelola persentase pajak yang akan diterapkan pada setiap transaksi.

### Cara Menggunakan:
- Buka menu **Pajak** dari sidebar
- Klik tombol **Tambah Pajak** untuk membuat pajak baru
- Masukkan nama pajak (contoh: PPN 10%)
- Masukkan persentase pajak (contoh: 10)
- Klik **Simpan**

### Mengaktifkan Pajak:
- Klik tombol centang pada pajak yang ingin dijadikan aktif
- Pajak aktif akan diterapkan otomatis pada setiap transaksi di kasir

### Tips:
- Hanya 1 pajak yang dapat aktif dalam satu waktu
- Anda dapat membuat beberapa pilihan pajak dan mengganti sesuai kebutuhan`
        },
        {
          title: 'Cara Membuat Promo dan Diskon',
          content: `## Promo dan Diskon

Fitur promo digunakan untuk membuat kode diskon yang dapat digunakan oleh pelanggan.

### Jenis Promo:
1. **Persentase (%)** - Diskon berupa persen
2. **Potongan Tetap (Rp)** - Diskon berupa jumlah tetap
3. **Beli X Gratis Y** - Beli beberapa dapat gratis
4. **Happy Hour** - Promo berdasarkan waktu

### Cara Membuat Promo:
- Buka menu **Promo** dari sidebar
- Klik **Buat Promo**
- Isi kode promo (huruf besar, contoh: DISCOUNT20)
- Pilih tipe promo
- Masukkan nilai diskon
- Tentukan minimum pembelian
- Atur tanggal mulai dan berakhir
- Klik **Simpan**

### Menggunakan Promo:
- Di kasir, masukkan kode promo
- Sistem akan menghitung diskon otomatis`
        },
        {
          title: 'Mengelola Cabin dan Gudang',
          content: `## Cabin dan Gudang (Multi-branch)

Fitur ini digunakan untuk mengelola beberapa cabang toko dan gudang.

### Jenis Lokasi:
- **Cabang Toko** - Lokasi penjualan retail
- **Gudang** - Lokasi penyimpanan stok

### Cara Menambah Cabin/Gudang:
- Buka menu **Cabin/Gudang** dari sidebar
- Klik **Tambah Cabin**
- Masukkan kode dan nama lokasi
- Pilih tipe (Cabang atau Gudang)
- Klik **Simpan**

### Transfer Stok Antar Cabin:
- Klik tombol **Transfer Stok**
- Pilih lokasi asal dan tujuan
- Masukkan kode produk dan jumlah
- Klik **Transfer**

### Tips:
- Stok di setiap cabin dapat dilihat secara terpisah
- Transfer stok akan mengurangi stok di asal dan menambah di tujuan`
        },
        {
          title: 'Program Loyalty dan Poin Pelanggan',
          content: `## Loyalty dan Poin

Fitur ini digunakan untuk memberikan reward kepada pelanggan tetap.

### Cara Kerja:
- Pelanggan mendapatkan poin setiap transaksi
- 1 poin per Rp 10.000
- 1 poin dapat ditukar dengan Rp 1.000 diskon

### Tier/Loyalty Level:
1. **Bronze** - 0 poin (1x poin)
2. **Silver** - 500+ poin (1.2x poin + 2% diskon)
3. **Gold** - 2000+ poin (1.5x poin + 5% diskon)
4. **Platinum** - 5000+ poin (2x poin + 10% diskon)

### Cara Mengelola Tier:
- Buka menu **Loyalty** dari sidebar
- Tambah/Edit/Delete tier
- Atur minimum poin dan diskon per tier

### Pelanggan dapat melihat:
- Total poin yang dimiliki
- Tier saat ini
- Poin yang dibutuhkan untuk naik tier`
        },
        {
          title: 'WhatsApp Notification',
          content: `## WhatsApp Notification

Fitur ini untuk mengirim notifikasi otomatis ke pelanggan via WhatsApp.

### Persiapan:
1. Daftar di fonnte.com untuk mendapatkan API Key
2. Masukkan API Key di pengaturan

### Notifikasi yang Dapat Dikirim:
- Transaksi baru
- Return barang
- Stok menipis
- Pembayaran

### Cara Mengaktifkan:
- Buka menu **WhatsApp** dari sidebar
- Masukkan API Key
- Aktifkan toggle Status
- Pilih notifikasi yang diinginkan
- Klik **Simpan**

### Template Pesan:
Gunakan variabel:
- {customer} - Nama customer
- {total} - Total transaksi
- {invoice} - Nomor invoice`
        },
        {
          title: 'Antrian Print Thermal',
          content: `## Antrian Print

Fitur ini mengelola antrian print untuk printer thermal.

### Cara Menggunakan:
- Buka menu **Antrian Print** dari sidebar
- Tambah pekerjaan print ke antrian
- Klik **Print Next** untuk print pekerjaan berikutnya

### Pengaturan:
- **Default Printer** - Printer yang digunakan
- **Ukuran Kertas** - 58mm atau 80mm
- **Jumlah Salinan** - 1-5 copy
- **Auto Print** - Print otomatis setelah ditambahkan

### Status Print:
- **Menunggu** - Antrian pending
- **Printing** - Sedang dalam proses
- **Selesai** - Print berhasil
- **Gagal** - Print gagal (coba lagi)`

        },
        {
          title: 'E-commerce API',
          content: `## E-commerce API

API untuk integrasi dengan website atau sistem lain.

### Cara Mendapatkan API Key:
- Buka menu **E-commerce API** dari sidebar
- API Key akan digenerate otomatis
- Copy dan simpan dengan aman

### Endpoint yang Tersedia:
- GET /api/v1/products - Daftar produk
- GET /api/v1/categories - Daftar kategori
- GET /api/v1/customers - Daftar customer
- POST /api/v1/orders - Buat pesanan
- GET /api/v1/orders - Daftar pesanan

### Contoh Penggunaan:

\`\`\`
curl -X GET "<BASE_URL_API_PRODUKSI>/api/v1/products" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

### Keamanan:
- Setiap request harus menyertakan API Key
- webhook URL dapat dikonfigurasi untuk notifikasi real-time`
        },
        {
          title: 'Pengaturan Keamanan Sistem',
          content: `## Keamanan Sistem

Fitur untuk mengatur keamanan aplikasi.

### Yang Dapat Dikonfigurasi:
1. **Login Security**
   - Maksimum percobaan login sebelum terkunci
   - Durasi akun terkunci

2. **Session Security**
   - Session timeout
   - Two-Factor Authentication (coming soon)

3. **IP Whitelist**
   - Batasi akses dari IP tertentu

### Fitur Keamanan yang Aktif:
- ✅ Rate Limiting - Batasi request per menit
- ✅ Input Validation - Validasi data dengan Zod
- ✅ SQL Injection Protection - Parameterized queries
- ✅ XSS Protection - Content sanitization

### Cara Menggunakan:
- Buka menu **Keamanan** dari sidebar
- Atur pengaturan sesuai kebutuhan
- Klik **Simpan Perubahan**`
        }
      ]

      for (const t of tutorials) {
        sqlite.prepare('INSERT INTO mediasoft_tutorials (title, content, created_at) VALUES (?, ?, ?)').run(t.title, t.content, new Date().toISOString())
      }
    }
  } catch (e) {
    console.error('Failed to init tutorials:', e)
  }
}
initWithDefaultTutorials()

interface TutorialRow {
  id: number
  title: string
  content: string
  created_at: string
}

export class TutorialController {
  static getAll() {
    try {
      const rows = sqlite
        .prepare('SELECT * FROM mediasoft_tutorials ORDER BY created_at DESC')
        .all() as TutorialRow[]
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getById(id: number) {
    try {
      const row = sqlite
        .prepare('SELECT * FROM mediasoft_tutorials WHERE id = ?')
        .get(id) as TutorialRow | undefined
      if (!row) return { success: false, message: 'Tutorial tidak ditemukan' }
      return { success: true, data: row }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: { title: string; content: string }) {
    try {
      const now = new Date().toISOString()
      const result = sqlite
        .prepare('INSERT INTO mediasoft_tutorials (title, content, created_at) VALUES (?, ?, ?)')
        .run(data.title, data.content, now)
      return { success: true, message: 'Tutorial berhasil ditambahkan', data: { id: result.lastInsertRowid } }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(id: number, data: { title?: string; content?: string }) {
    try {
      const existing = sqlite
        .prepare('SELECT id FROM mediasoft_tutorials WHERE id = ?')
        .get(id)
      if (!existing) return { success: false, message: 'Tutorial tidak ditemukan' }

      const fields: string[] = []
      const values: unknown[] = []
      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
      if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
      if (fields.length === 0) return { success: false, message: 'Tidak ada data yang diubah' }

      values.push(id)
      sqlite.prepare(`UPDATE mediasoft_tutorials SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      return { success: true, message: 'Tutorial berhasil diupdate' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(id: number) {
    try {
      sqlite.prepare('DELETE FROM mediasoft_tutorials WHERE id = ?').run(id)
      return { success: true, message: 'Tutorial berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
