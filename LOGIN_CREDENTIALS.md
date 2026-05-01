# 🔐 Login Credentials - MediaSoft POS

## 📋 Semua Akun yang Tersedia

### 1. Admin (Administrator)
```
Username: admin
Password: admin123
Hak Akses: admin
Nama: Admin Super
Status: Aktif
```
**Akses**: Manage users, products, reports, settings

---

### 2. Developer (Programmer)
```
Username: Developer
Password: dev123
Hak Akses: developer
Nama: Jean Riko Kurniawan Putra
Status: Aktif
```
**Akses**: Full access + development tools

---

### 3. Operator
```
Username: OP
Password: operator123
Hak Akses: operator
Nama: OPERATOR
Status: Aktif
```
**Akses**: Manage products, transactions, inventory

---

### 4. Kasir (Cashier)
```
Username: KASIR
Password: kasir123
Hak Akses: kasir
Nama: KASIR
Status: Aktif
```
**Akses**: Basic POS operations, transactions

---

### 5. Super Admin
```
Username: superadmin
Password: super123
Hak Akses: superadmin
Nama: SUPERMAN
Status: Aktif
```
**Akses**: Full access to all features

---

## 🎯 Quick Login Guide

### Untuk Testing
Gunakan akun **admin** untuk testing umum:
- Username: `admin`
- Password: `admin123`

### Untuk Development
Gunakan akun **Developer** untuk development:
- Username: `Developer`
- Password: `dev123`

### Untuk Demo Kasir
Gunakan akun **KASIR** untuk demo kasir:
- Username: `KASIR`
- Password: `kasir123`

---

## 🔄 Cara Reset Password

Jika lupa password, gunakan Kiro CLI:

```bash
# Reset password admin
node kiro-cli.cjs reset admin admin123

# Reset password developer
node kiro-cli.cjs reset Developer dev123

# Reset password operator
node kiro-cli.cjs reset OP operator123

# Reset password kasir
node kiro-cli.cjs reset KASIR kasir123

# Reset password superadmin
node kiro-cli.cjs reset superadmin super123
```

---

## 🆕 Cara Buat User Baru

```bash
# Syntax
node kiro-cli.cjs create <username> <password> <nama> [hak_akses]

# Contoh buat kasir baru
node kiro-cli.cjs create kasir2 kasir123 "Kasir Dua" kasir

# Contoh buat admin baru
node kiro-cli.cjs create admin2 admin123 "Admin Dua" admin
```

---

## 📊 Hierarki Hak Akses

```
developer (Level 5) - Highest
    ↓
superadmin (Level 4)
    ↓
admin (Level 3)
    ↓
operator (Level 2)
    ↓
kasir (Level 1) - Default
```

---

## ⚠️ Keamanan

### Password Policy
- ✅ Minimal 8 karakter
- ✅ Kombinasi huruf dan angka
- ✅ Ganti password secara berkala
- ❌ Jangan share password

### Best Practices
1. Gunakan password yang kuat
2. Logout setelah selesai
3. Jangan tinggalkan aplikasi dalam keadaan login
4. Ganti password default setelah first login

---

## 🚀 Cara Login

1. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

2. Buka browser di: `http://localhost:5174`

3. Masukkan username dan password dari list di atas

4. Klik **Login**

---

## 📝 Catatan

- Semua password sudah direset menggunakan SHA1 hash
- Password akan otomatis di-upgrade ke bcrypt saat login pertama kali
- Session timeout: 30 menit
- Auto logout saat inactive

---

**Last Updated**: 2026-05-01
**Status**: ✅ All Passwords Reset
**Total Users**: 5

---

**⚠️ PENTING**: Simpan file ini dengan aman dan jangan commit ke repository public!
