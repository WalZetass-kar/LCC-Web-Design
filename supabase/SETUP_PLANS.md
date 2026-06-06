# Setup Paket Langganan di Supabase

## Masalah
Modal "Upgrade / Perpanjang" tidak menampilkan opsi paket langganan karena database Supabase belum ada data di tabel `subscription_plans`.

## Solusi

### 1. Buka Supabase Dashboard
1. Login ke https://supabase.com
2. Pilih project Anda (yang sudah dikonfigurasi di aplikasi)
3. Buka menu **SQL Editor** di sidebar kiri

### 2. Jalankan SQL Seed
1. Copy seluruh isi file `supabase/seed-plans.sql`
2. Paste ke SQL Editor
3. Klik tombol **Run** (atau tekan Ctrl+Enter)
4. Tunggu sampai muncul notifikasi "Success"

SQL akan insert 3 paket default:

| Code | Nama | Harga | Durasi | Max Devices | Max Users |
|------|------|-------|--------|-------------|-----------|
| **DAILY** | Paket Harian | Rp 15.000 | 1 hari | 1 | 1 |
| **MONTHLY** | Paket Bulanan ⭐ | Rp 299.000 | 30 hari | 3 | 3 |
| **YEARLY** | Paket Tahunan | Rp 2.899.000 | 365 hari | 999 | 999 |

### 3. Verifikasi Data
1. Buka menu **Table Editor** di sidebar
2. Pilih tabel `subscription_plans`
3. Pastikan ada **3 baris data** dengan status `is_active = true`

### 4. Test di Aplikasi
1. Jalankan aplikasi: `npm run dev`
2. Login ke aplikasi
3. Klik menu **Upgrade / Perpanjang** di sidebar
4. Modal akan muncul dengan **3 pilihan paket**

## Troubleshooting

### Paket masih tidak muncul?
1. **Cek koneksi license server:**
   - Buka Settings → License Center → tab Koneksi
   - Pastikan URL Supabase sudah benar
   - Test koneksi dengan klik tombol "Test Connection"

2. **Cek console browser:**
   - Buka DevTools (F12)
   - Lihat tab Console untuk error message
   - Cek tab Network untuk melihat response dari `/plans`

3. **Cek Supabase logs:**
   - Buka Supabase Dashboard → Logs → Edge Functions
   - Lihat apakah ada error saat request `/plans`

### Error "License server publik belum dikonfigurasi"
Pastikan salah satu dari ini sudah diset:
- Environment variable `ZETASS_POS_LICENSE_SERVER_URL`
- Field `license_server_url` di tabel `mediasoft_identitas`
- Default URL: `https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license`

## Catatan
- Field `is_active = true` wajib agar paket muncul di aplikasi
- Field `is_recommended = true` akan menampilkan badge "Rekomendasi"
- Field `max_devices = -1` artinya unlimited
- Field `max_users = -1` artinya unlimited
- SQL menggunakan `ON CONFLICT` jadi aman dijalankan berulang kali

