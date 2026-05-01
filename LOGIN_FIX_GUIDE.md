# 🔐 Panduan Mengatasi Masalah Login

## ❌ Masalah: Tidak Bisa Login

Jika Anda tidak bisa login dengan user yang ada di database, ikuti langkah-langkah berikut:

## ✅ Solusi Cepat

### Langkah 1: Lihat User yang Ada

```bash
node kiro-cli.cjs list
```

Output:
```
============================================================
📋 DAFTAR USER
============================================================

┌─────────┬──────────────┬─────────────────────────────┬─────────┬─────────┐
│ (index) │ Username     │ Nama Lengkap                │ Role    │ Status  │
├─────────┼──────────────┼─────────────────────────────┼─────────┼─────────┤
│ 0       │ 'admin'      │ 'Admin Super'               │ 'ADMIN' │ 'Aktif' │
│ 1       │ 'Developer'  │ 'Jean Riko Kurniawan Putra' │ 'KASIR' │ 'Aktif' │
│ 2       │ 'KASIR'      │ 'KASIR'                     │ 'KASIR' │ 'Aktif' │
│ 3       │ 'OP'         │ 'OPERATOR'                  │ 'KASIR' │ 'Aktif' │
│ 4       │ 'superadmin' │ 'SUPERMAN'                  │ 'KASIR' │ 'Aktif' │
└─────────┴──────────────┴─────────────────────────────┴─────────┴─────────┘

Total: 5 user
```

### Langkah 2: Reset Password User

Pilih salah satu user dan reset passwordnya:

```bash
# Reset password user 'admin' menjadi 'admin123'
node kiro-cli.cjs reset admin admin123
```

Output:
```
✅ Password user 'admin' berhasil direset
   Password baru: admin123
```

### Langkah 3: Login ke Aplikasi

Sekarang Anda bisa login dengan:
- **Username**: `admin`
- **Password**: `admin123`

## 🆕 Alternatif: Buat User Baru

Jika Anda ingin membuat user baru:

```bash
node kiro-cli.cjs create myuser mypass123 "Nama Saya" ADMIN
```

Output:
```
✅ User 'myuser' berhasil dibuat
   Nama: Nama Saya
   Role: ADMIN
   Password: mypass123
```

## 📋 Daftar User Default

Berikut user yang ada di database Anda:

| Username | Nama Lengkap | Role | Status |
|----------|--------------|------|--------|
| admin | Admin Super | ADMIN | Aktif |
| Developer | Jean Riko Kurniawan Putra | KASIR | Aktif |
| KASIR | KASIR | KASIR | Aktif |
| OP | OPERATOR | KASIR | Aktif |
| superadmin | SUPERMAN | KASIR | Aktif |

**Catatan**: Password asli dari user-user ini tidak diketahui karena sudah di-hash. Gunakan perintah `reset` untuk mengatur password baru.

## 🔍 Mengapa Ini Terjadi?

1. **Password di-hash dengan SHA1**: Database MediaSoft menggunakan SHA1 untuk hash password
2. **Password asli tidak tersimpan**: Yang tersimpan hanya hash-nya, bukan password aslinya
3. **Tidak ada cara untuk "melihat" password**: Hash adalah one-way function, tidak bisa di-reverse

## 🛠️ Perintah Kiro CLI Lainnya

```bash
# Lihat info database
node kiro-cli.cjs info

# Hapus user
node kiro-cli.cjs delete username

# Toggle status user (Aktif/Nonaktif)
node kiro-cli.cjs toggle username

# Bantuan
node kiro-cli.cjs help
```

## 🚀 Jalankan Aplikasi

Setelah reset password, jalankan aplikasi:

```bash
npm run dev
```

Aplikasi akan berjalan di http://localhost:5173

## ✅ Checklist

- [ ] Rebuild better-sqlite3: `npm rebuild better-sqlite3`
- [ ] Lihat daftar user: `node kiro-cli.cjs list`
- [ ] Reset password user: `node kiro-cli.cjs reset admin admin123`
- [ ] Jalankan aplikasi: `npm run dev`
- [ ] Login dengan username dan password yang baru

## 📚 Dokumentasi Lengkap

Lihat [KIRO_CLI_README.md](./KIRO_CLI_README.md) untuk dokumentasi lengkap Kiro CLI.

---

**Selamat mencoba! 🎉**
