# 🚀 Kiro CLI - MediaSoft POS User Management Tool

Tool command-line untuk mengelola user, password, dan database MediaSoft POS dengan mudah.

## 📋 Fitur

- ✅ Lihat semua user di database
- ✅ Reset password user (SHA1 hash)
- ✅ Buat user baru
- ✅ Hapus user
- ✅ Toggle status user (Aktif/Nonaktif)
- ✅ Info database dan statistik
- ✅ Mode interaktif dan command-line

## 🔧 Cara Menggunakan

### Mode Command Line (Cepat)

```bash
# Lihat semua user
node kiro-cli.cjs list

# Reset password user
node kiro-cli.cjs reset admin admin123

# Buat user baru
node kiro-cli.cjs create kasir1 pass123 "Kasir Satu" KASIR

# Hapus user
node kiro-cli.cjs delete kasir1

# Toggle status user
node kiro-cli.cjs toggle admin

# Info database
node kiro-cli.cjs info

# Bantuan
node kiro-cli.cjs help
```

### Mode Interaktif

Jalankan tanpa parameter untuk menu interaktif:

```bash
node kiro-cli.cjs
```

Kemudian pilih menu yang tersedia:
1. Lihat semua user
2. Reset password user
3. Buat user baru
4. Hapus user
5. Toggle status user
6. Info database
0. Keluar

## 📝 Contoh Penggunaan

### 1. Melihat Semua User

```bash
$ node kiro-cli.cjs list

============================================================
📋 DAFTAR USER
============================================================

┌─────────┬──────────────┬────────────────────────┬────────┬────────┬─────────────────────┐
│ (index) │   Username   │     Nama Lengkap       │  Role  │ Status │     Last Login      │
├─────────┼──────────────┼────────────────────────┼────────┼────────┼─────────────────────┤
│    0    │   'admin'    │    'Admin Baru'        │ 'ADMIN'│ 'Aktif'│ '2026-04-27 10:30'  │
│    1    │  'Developer' │ 'Jean Riko Kurniawan'  │ 'ADMIN'│ 'Aktif'│ 'Belum pernah'      │
│    2    │    'KASIR'   │      'KASIR'           │ 'KASIR'│ 'Aktif'│ 'Belum pernah'      │
└─────────┴──────────────┴────────────────────────┴────────┴────────┴─────────────────────┘

Total: 3 user
```

### 2. Reset Password User yang Sudah Ada

```bash
$ node kiro-cli.cjs reset admin admin123

✅ Password user 'admin' berhasil direset
   Password baru: admin123
```

Sekarang Anda bisa login dengan:
- **Username**: `admin`
- **Password**: `admin123`

### 3. Membuat User Baru

```bash
$ node kiro-cli.cjs create kasir1 kasir123 "Kasir Pertama" KASIR

✅ User 'kasir1' berhasil dibuat
   Nama: Kasir Pertama
   Role: KASIR
   Password: kasir123
```

### 4. Info Database

```bash
$ node kiro-cli.cjs info

============================================================
📊 INFORMASI DATABASE
============================================================

Database: /path/to/sistem_pos.db
Ukuran: 2.45 MB

Statistik:
  • User: 5
  • Produk: 150
  • Transaksi: 1234
  • Total Tabel: 25
```

## 🔐 Solusi Masalah Login

### Masalah: Tidak Bisa Login dengan User yang Ada

**Penyebab**: Password di database menggunakan hash SHA1, dan mungkin password yang Anda coba tidak sesuai.

**Solusi**:

1. **Reset password user yang ada**:
   ```bash
   node kiro-cli.cjs reset admin admin123
   ```

2. **Atau buat user baru**:
   ```bash
   node kiro-cli.cjs create newadmin admin123 "Administrator Baru" ADMIN
   ```

3. **Login ke aplikasi** dengan username dan password yang baru Anda set.

### User Default di Database

Berdasarkan database, user yang ada:

| Username | Nama Lengkap | Role |
|----------|--------------|------|
| admin | Admin Baru | ADMIN |
| Developer | Jean Riko Kurniawan Putra | ADMIN |
| OP | OPERATOR | KASIR |
| KASIR | KASIR | KASIR |
| superadmin | SUPERMAN | ADMIN |

**Catatan**: Password asli dari user-user ini tidak diketahui karena sudah di-hash. Gunakan perintah `reset` untuk mengatur password baru.

## 🎯 Tips

1. **Selalu gunakan password yang kuat** untuk user ADMIN
2. **Backup database** sebelum melakukan perubahan besar
3. **Jangan hapus semua user ADMIN** - pastikan minimal ada 1 admin aktif
4. **Role yang tersedia**: ADMIN, KASIR, OWNER

## 🔍 Troubleshooting

### Error: Database tidak ditemukan

Pastikan file `sistem_pos.db` ada di folder yang sama dengan `kiro-cli.cjs`.

### Error: SQLITE_BUSY

Database sedang digunakan oleh aplikasi lain. Tutup aplikasi MediaSoft POS terlebih dahulu.

### Password tidak cocok setelah reset

Pastikan Anda menggunakan password yang sama persis dengan yang Anda set (case-sensitive).

## 📚 Referensi

- Password di-hash menggunakan **SHA1** (sesuai dengan database MediaSoft yang ada)
- Sistem akan otomatis migrasi ke **bcrypt** saat user login pertama kali
- Kolom `password_hash_type` menandakan jenis hash yang digunakan

## 🤝 Bantuan

Jika mengalami masalah, jalankan:

```bash
node kiro-cli.cjs help
```

Atau buka issue di repository GitHub.

---

**Dibuat dengan ❤️ untuk MediaSoft POS**
