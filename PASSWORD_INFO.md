# Informasi Login MediaSoft POS

## User yang Ada di Database

Berdasarkan database `sistem_pos.db`, berikut adalah user yang tersedia:

| Username | Nama Lengkap | Hash Password |
|----------|--------------|---------------|
| admin | Admin Baru | 0d757843e98cf5fc20849eebca7ff113436d0cf0 |
| Developer | Jean Riko Kurniawan Putra | 07a6ec7703d662f1c3944286075e2342439bece1 |
| OP | OPERATOR | c414b037b8ec0fa57f536de4b3b7b37910b652b5 |
| KASIR | KASIR | 2495471df28aafae46e86add74f3bdfa964827df |
| superadmin | SUPERMAN | 1c971c155acc8571e775782f0edb1cbcb3bd9ed8 |

## Sistem Hash Password

Aplikasi menggunakan **SHA1** untuk hash password (sudah disesuaikan dengan database MediaSoft yang ada).

## Cara Reset Password atau Buat User Baru

### Opsi 1: Update Password User yang Ada

Jalankan command berikut untuk update password user `admin` menjadi `admin123`:

```bash
node -e "const crypto = require('crypto'); const hash = crypto.createHash('sha1').update('admin123').digest('hex'); console.log('UPDATE mediasoft_pengguna SET kata_sandi = \\'' + hash + '\\' WHERE nama_pengguna = \\'admin\\';');" | sqlite3 sistem_pos.db
```

### Opsi 2: Buat User Baru

```bash
sqlite3 sistem_pos.db "INSERT INTO mediasoft_pengguna (nama_pengguna, kata_sandi, nama_lengkap, status_user, tgl_wkt_simpan) VALUES ('newadmin', 'd033e22ae348aeb5660fc2140aec35850c4da997', 'Administrator Baru', 'Aktif', datetime('now'));"
```

Password untuk user `newadmin` adalah: **admin**

## Perbaikan yang Sudah Dilakukan

1. ✅ Rebuild `better-sqlite3` untuk menyesuaikan dengan versi Node.js Electron
2. ✅ Perbaiki path preload script dari `preload.js` ke `../main/preload.js`
3. ✅ Ubah sistem hash password dari chain kompleks ke SHA1 sederhana (sesuai database)
4. ✅ Schema database sudah sesuai dengan tabel `mediasoft_*` yang ada

## Cara Menjalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di http://localhost:5173
