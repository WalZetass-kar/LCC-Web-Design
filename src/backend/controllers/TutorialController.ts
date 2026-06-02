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
          title: 'Mengelola Cabang dan Gudang',
          content: `## Cabang dan Gudang (Multi-branch)

Fitur ini digunakan untuk mengelola beberapa cabang toko dan gudang.

### Jenis Lokasi:
- **Cabang Toko** - Lokasi penjualan retail
- **Gudang** - Lokasi penyimpanan stok

### Cara Menambah Cabang/Gudang:
- Buka menu **Cabang/Gudang** dari sidebar
- Klik **Tambah Cabang**
- Masukkan kode dan nama lokasi
- Pilih tipe (Cabang atau Gudang)
- Klik **Simpan**

### Transfer Stok Antar Cabang:
- Klik tombol **Transfer Stok**
- Pilih lokasi asal dan tujuan
- Masukkan kode produk dan jumlah
- Klik **Transfer**

### Tips:
- Stok di setiap cabang dapat dilihat secara terpisah
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

function ensureExtendedTutorials() {
  try {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS mediasoft_tutorials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    const tutorials = [
      {
        title: 'Mulai Cepat: Setup Toko dan Login',
        content: `## Mulai Cepat

Tutorial ini membantu menyiapkan aplikasi dari kondisi awal sampai siap dipakai transaksi.

### Langkah Awal
1. Login sebagai developer/admin pertama.
2. Lengkapi identitas toko: nama toko, alamat, nomor telepon, dan email.
3. Cek data satuan dan kategori barang.
4. Tambahkan produk pertama.
5. Buka kas/shift sebelum mulai transaksi.

### Hal yang Wajib Dicek
- Pastikan akun developer memakai password kuat.
- Pastikan tanggal dan jam komputer benar.
- Buat backup setelah data awal selesai dimasukkan.
- Jika memakai lisensi online, buka Developer Panel lalu sinkronkan paket dan pembeli.`
      },
      {
        title: 'Dashboard dan Ringkasan Operasional',
        content: `## Dashboard

Dashboard menampilkan kondisi toko secara ringkas agar pemilik toko cepat membaca performa harian.

### Informasi Utama
- Total penjualan hari ini.
- Jumlah transaksi.
- Produk stok menipis.
- Grafik penjualan.
- Ringkasan kas dan aktivitas terbaru.

### Cara Membaca
- Nilai penjualan membantu cek omzet.
- Stok menipis dipakai untuk menentukan pembelian ulang.
- Grafik membantu melihat jam atau hari ramai.
- Aktivitas terbaru membantu audit tindakan user.`
      },
      {
        title: 'Produk, Kategori, Satuan, dan Barcode',
        content: `## Produk

Produk adalah data utama untuk transaksi kasir, pembelian, laporan stok, dan HPP.

### Data yang Perlu Diisi
- Kode barang atau barcode.
- Nama barang.
- Kategori dan satuan.
- Harga beli, harga jual, dan stok awal.
- Stok minimum untuk notifikasi.

### Alur yang Disarankan
1. Buat satuan terlebih dahulu, misalnya pcs, box, dus.
2. Buat kategori, misalnya makanan, minuman, aksesoris.
3. Tambahkan produk.
4. Cetak atau scan barcode jika toko memakai scanner.

### Tips
- Gunakan kode barang yang konsisten.
- Aktifkan stok minimum untuk barang cepat habis.
- Jangan menghapus produk yang sudah punya transaksi; nonaktifkan atau ubah stoknya jika perlu.`
      },
      {
        title: 'Transaksi Kasir dan Cetak Struk',
        content: `## Transaksi Kasir

Menu transaksi dipakai untuk menjual barang ke pelanggan.

### Cara Transaksi
1. Buka menu Transaksi.
2. Cari produk atau scan barcode.
3. Masukkan qty.
4. Pilih pelanggan jika transaksi ingin tercatat ke customer.
5. Terapkan promo atau diskon jika ada.
6. Pilih metode pembayaran.
7. Simpan transaksi dan cetak struk.

### Catatan Penting
- Stok akan berkurang setelah transaksi berhasil.
- Struk bisa disesuaikan dari pengaturan struk.
- Jika transaksi salah, gunakan return/refund sesuai aturan toko.`
      },
      {
        title: 'Cara Menggunakan Fitur Pajak/PPN',
        content: `## Pengaturan Pajak/PPN

Fitur pajak digunakan untuk menambahkan pajak ke transaksi.

### Cara Membuat Pajak
1. Buka menu Pajak.
2. Klik Tambah Pajak.
3. Isi nama pajak, misalnya PPN 11%.
4. Isi rate pajak.
5. Simpan.

### Mengaktifkan Pajak
- Pilih pajak yang akan dipakai.
- Hanya satu pajak aktif yang dipakai sebagai default transaksi.
- Nonaktifkan pajak jika toko belum menggunakan pajak.

### Tips
- Pastikan rate mengikuti aturan bisnis toko.
- Cek struk setelah pajak diaktifkan agar total sesuai.`
      },
      {
        title: 'Cara Membuat Promo dan Diskon',
        content: `## Promo dan Diskon

Promo membantu membuat potongan harga yang terkontrol.

### Jenis Promo
1. Persentase, misalnya diskon 10%.
2. Potongan tetap, misalnya Rp 10.000.
3. Minimum pembelian.
4. Periode tanggal atau jam tertentu.

### Cara Membuat
1. Buka menu Promo.
2. Buat kode promo.
3. Pilih tipe promo.
4. Isi nilai diskon dan batas pemakaian.
5. Simpan dan aktifkan.

### Tips
- Gunakan kode singkat seperti HEMAT10.
- Batasi periode promo agar tidak terpakai di luar jadwal.
- Cek laporan promo untuk melihat dampaknya ke omzet.`
      },
      {
        title: 'Customer, Loyalty, dan Poin',
        content: `## Customer dan Loyalty

Data customer membantu melihat riwayat belanja dan menjalankan program loyalty.

### Customer
- Tambahkan nama, nomor WhatsApp, alamat, dan status customer.
- Hubungkan customer saat transaksi agar riwayat belanja tercatat.

### Loyalty
- Buat tier seperti Bronze, Silver, Gold, Platinum.
- Tentukan minimum poin, multiplier poin, dan diskon.
- Poin dapat dipakai untuk reward sesuai kebijakan toko.

### Tips
- Pastikan nomor WhatsApp customer benar jika notifikasi transaksi aktif.
- Gunakan tier untuk memberi reward pelanggan tetap.`
      },
      {
        title: 'Pembelian, Supplier, dan Stok Masuk',
        content: `## Pembelian dan Supplier

Menu pembelian digunakan untuk mencatat barang masuk dari supplier.

### Langkah Pembelian
1. Buat data supplier.
2. Buka menu Pembelian.
3. Pilih supplier.
4. Masukkan produk dan qty barang masuk.
5. Isi harga beli dan pembayaran.
6. Simpan.

### Dampak Sistem
- Stok produk bertambah.
- Harga beli dapat dipakai untuk perhitungan HPP.
- Jika belum lunas, data bisa masuk ke hutang supplier.

### Tips
- Cocokkan faktur supplier dengan data yang dimasukkan.
- Catat pembayaran sebagian agar sisa hutang jelas.`
      },
      {
        title: 'HPP dan Perhitungan Laba',
        content: `## HPP

HPP membantu menghitung biaya pokok produk dan margin keuntungan.

### Data yang Dibutuhkan
- Harga beli.
- Biaya tambahan, misalnya ongkir atau packing.
- Jumlah barang.
- Harga jual.

### Cara Menggunakan
1. Buka menu HPP.
2. Pilih produk atau isi data perhitungan.
3. Masukkan biaya yang relevan.
4. Simpan hasil perhitungan.

### Tips
- Update HPP saat harga supplier berubah.
- Gunakan HPP untuk menentukan harga jual yang tetap menguntungkan.`
      },
      {
        title: 'Kas, Shift, dan Tutup Kasir',
        content: `## Kas dan Shift

Kas dan shift membantu mencatat uang masuk/keluar selama operasional kasir.

### Alur Harian
1. Buka kas atau buka shift.
2. Masukkan saldo awal.
3. Jalankan transaksi.
4. Catat pemasukan atau pengeluaran tambahan.
5. Tutup kas/shift di akhir hari.

### Yang Perlu Dicek Saat Tutup
- Total sistem.
- Uang fisik di kas.
- Selisih kas.
- Catatan pengeluaran.

### Tips
- Tutup shift setiap pergantian kasir.
- Gunakan catatan jika ada selisih kas.`
      },
      {
        title: 'Return dan Refund',
        content: `## Return dan Refund

Return dipakai saat pelanggan mengembalikan barang atau transaksi perlu dikoreksi.

### Cara Membuat Return
1. Buka menu Return.
2. Cari transaksi asal.
3. Pilih item yang dikembalikan.
4. Isi qty dan alasan.
5. Simpan sebagai request return.

### Approval
- Admin/operator dapat approve atau reject.
- Jika return disetujui, stok bisa dikembalikan sesuai aturan.

### Tips
- Selalu isi alasan return.
- Cocokkan barang fisik sebelum approve.`
      },
      {
        title: 'Stock Opname',
        content: `## Stock Opname

Stock opname dipakai untuk mencocokkan stok sistem dengan stok fisik.

### Cara Opname
1. Buka menu Stock Opname.
2. Buat sesi opname.
3. Masukkan produk dan stok fisik.
4. Sistem menghitung selisih.
5. Approve jika data sudah benar.

### Tips
- Lakukan opname saat toko tidak terlalu ramai.
- Cek ulang barang dengan selisih besar.
- Simpan catatan alasan penyesuaian stok.`
      },
      {
        title: 'Hutang dan Piutang',
        content: `## Hutang dan Piutang

Fitur ini dipakai untuk mencatat pembayaran yang belum lunas.

### Piutang
- Terjadi saat customer belum melunasi transaksi.
- Catat pembayaran cicilan sampai lunas.

### Hutang
- Terjadi saat toko belum melunasi pembelian ke supplier.
- Catat pembayaran ke supplier agar saldo hutang berkurang.

### Tips
- Cek jatuh tempo secara rutin.
- Gunakan laporan hutang/piutang untuk follow up pembayaran.`
      },
      {
        title: 'Laporan, Export Excel, dan PDF',
        content: `## Laporan

Laporan membantu melihat performa toko berdasarkan periode.

### Jenis Laporan
- Penjualan.
- Pembelian.
- Stok.
- Kas.
- Laba rugi.
- Return.

### Cara Export
1. Pilih periode tanggal.
2. Klik tampilkan laporan.
3. Gunakan Export Excel atau PDF jika paket mengizinkan.

### Tips
- Gunakan periode harian untuk cek kasir.
- Gunakan periode bulanan untuk evaluasi bisnis.`
      },
      {
        title: 'Backup, Restore, dan Import Database',
        content: `## Backup dan Restore

Backup melindungi data toko dari kerusakan perangkat atau kesalahan input.

### Backup Manual
1. Buka menu Backup.
2. Klik Buat Backup.
3. Simpan file backup di lokasi aman.

### Restore
- Pilih file backup yang valid.
- Restore akan mengganti database aktif.
- Restart aplikasi setelah restore.

### Tips
- Buat backup sebelum import massal atau reset data.
- Simpan backup di cloud atau drive eksternal.
- Jangan mematikan komputer saat proses backup/restore.`
      },
      {
        title: 'WhatsApp Notification',
        content: `## WhatsApp Notification

Fitur WhatsApp dipakai untuk mengirim pesan otomatis ke customer.

### Persiapan
1. Siapkan provider API WhatsApp.
2. Masukkan API key di menu WhatsApp.
3. Atur template pesan.
4. Aktifkan notifikasi yang dibutuhkan.

### Notifikasi Umum
- Transaksi berhasil.
- Return.
- Pembayaran.
- Promo atau broadcast.

### Tips
- Gunakan template singkat dan jelas.
- Uji kirim pesan sebelum dipakai ke customer.`
      },
      {
        title: 'E-commerce API dan Integrasi',
        content: `## E-commerce API

API e-commerce dipakai untuk menghubungkan POS dengan website atau sistem lain.

### Yang Bisa Diintegrasikan
- Daftar produk.
- Kategori.
- Order masuk.
- Update stok.
- Link pembayaran atau WhatsApp.

### Cara Mengaktifkan
1. Buka menu E-commerce API.
2. Aktifkan integrasi.
3. Salin API key.
4. Pasang endpoint dan key di sistem eksternal.

### Tips
- Jangan membagikan API key ke publik.
- Regenerate key jika dicurigai bocor.`
      },
      {
        title: 'Pengaturan Struk dan Print Thermal',
        content: `## Struk dan Printer

Pengaturan struk menentukan tampilan bukti transaksi.

### Yang Bisa Diatur
- Jenis printer.
- Ukuran kertas 58mm atau 80mm.
- Logo toko.
- Alamat, telepon, email.
- Kasir dan customer.
- Footer struk.
- QRIS pada struk.

### Tips
- Cetak test struk setelah mengubah layout.
- Pastikan printer thermal terdeteksi di sistem operasi.`
      },
      {
        title: 'Keamanan, User, PIN Kasir, dan Hak Akses',
        content: `## Keamanan Sistem

Keamanan mengatur siapa yang boleh membuka menu dan menjalankan aksi tertentu.

### User
- Developer: akses penuh.
- Admin/operator: mengelola operasional.
- Kasir: transaksi dan fitur terbatas.

### PIN Kasir
- PIN cocok untuk login cepat kasir.
- Gunakan 4-8 digit.
- Tetap gunakan password kuat untuk akun utama.

### Hak Akses
- Atur permission per user/grup.
- Batasi fitur sensitif seperti backup, laporan, user, dan developer panel.

### Tips
- Nonaktifkan user yang sudah tidak bekerja.
- Reset password jika akun dicurigai dipakai orang lain.`
      },
      {
        title: 'Developer Panel: Koneksi License Server',
        content: `## Koneksi License Server

Developer Panel dipakai untuk mengelola akun pembeli, paket, device, popup, dan persetujuan lisensi.

### Langkah Koneksi
1. Buka Developer Panel.
2. Masuk ke tab Koneksi.
3. Isi URL license server.
4. Login memakai akun admin/developer license server.
5. Klik sync untuk menarik paket, fitur, dan popup.

### Tips
- Gunakan URL production saat aplikasi dipakai pembeli.
- Gunakan sync setelah mengubah paket atau popup di server.`
      },
      {
        title: 'Developer Panel: Paket dan Fitur Lisensi',
        content: `## Paket dan Fitur Lisensi

Paket menentukan fitur apa saja yang bisa dibuka pembeli.

### Paket Umum
- Trial 3 Hari: akses terbatas untuk mencoba aplikasi.
- Basic Bulanan: laporan dasar, backup, dan return/refund.
- Pro Bulanan: export, multi-user, restore, stock opname, hutang/piutang, shift, dan API.
- Tahunan: akses satu tahun dengan fitur lengkap, termasuk multi cabang.

### Cara Mengatur
1. Buka Developer Panel > Paket.
2. Pilih paket.
3. Klik Fitur.
4. Centang fitur yang dibuka untuk paket tersebut.
5. Simpan.

### Dampak ke Pembeli
- Saat akun pembeli dibuat atau paket diubah, fitur yang terbuka mengikuti paket aktif.
- Jika fitur tidak aktif, pembeli akan melihat popup upgrade.`
      },
      {
        title: 'Developer Panel: Buat Akun Pembeli',
        content: `## Buat Akun Pembeli

Tab Pembeli digunakan untuk membuat akun yang akan login di aplikasi POS.

### Data yang Diisi
- Nama toko/pembeli.
- Email login.
- Password awal.
- Nomor WhatsApp.
- Paket langganan.
- Durasi langganan.

### Fitur Berdasarkan Paket
- Pilih paket untuk melihat fitur yang terbuka.
- Basic membuka fitur dasar.
- Pro membuka fitur operasional lengkap.
- Tahunan membuka fitur lengkap selama 365 hari.

### Tips
- Berikan password awal ke pembeli melalui channel aman.
- Minta pembeli mengganti password setelah login pertama.`
      },
      {
        title: 'Developer Panel: Persetujuan Lisensi',
        content: `## Persetujuan Lisensi

Persetujuan lisensi dipakai setelah pembeli memilih paket dari popup langganan.

### Alur Pembeli
1. Pembeli melihat popup langganan saat trial habis atau fitur terkunci.
2. Pembeli memilih paket.
3. Sistem membuat request pembayaran/persetujuan dengan status pending.
4. Developer membuka Developer Panel > Persetujuan Lisensi.
5. Klik Setujui untuk mengaktifkan atau memperpanjang lisensi.

### Dampak Approval
- Status pembayaran menjadi paid.
- Subscription pembeli dibuat atau diperpanjang.
- Fitur paket aktif di device pembeli setelah login/sync berikutnya.

### Tips
- Cocokkan invoice, email, paket, dan nominal sebelum menyetujui.
- Hapus hanya request yang salah atau duplikat.`
      },
      {
        title: 'Developer Panel: Device, Broadcast, Update, dan Error',
        content: `## Operasional Developer

Developer Panel juga menyediakan kontrol device dan monitoring aplikasi.

### Device
- Lihat device yang login.
- Block/unblock device.
- Suspend atau aktifkan lisensi device.
- Perpanjang lisensi dari detail device.

### Broadcast
- Kirim pengumuman ke semua pembeli, paket tertentu, platform tertentu, atau user tertentu.

### Update
- Atur minimum version dan latest version.
- Gunakan force update jika aplikasi lama wajib diperbarui.

### Error
- Lihat laporan error dari aplikasi pembeli untuk investigasi.`
      },
    ]

    const find = sqlite.prepare('SELECT id FROM mediasoft_tutorials WHERE title = ? ORDER BY id LIMIT 1')
    const update = sqlite.prepare('UPDATE mediasoft_tutorials SET content = ? WHERE id = ?')
    const insert = sqlite.prepare('INSERT INTO mediasoft_tutorials (title, content, created_at) VALUES (?, ?, ?)')

    for (const tutorial of tutorials) {
      const existing = find.get(tutorial.title) as { id: number } | undefined
      if (existing?.id) update.run(tutorial.content, existing.id)
      else insert.run(tutorial.title, tutorial.content, new Date().toISOString())
    }
  } catch (e) {
    console.error('Failed to ensure extended tutorials:', e)
  }
}

initWithDefaultTutorials()
ensureExtendedTutorials()

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
