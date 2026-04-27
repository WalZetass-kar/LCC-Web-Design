# 📦 Instalasi Dependencies Baru

## 🚀 Quick Start

### 1. Install Semua Dependencies

```bash
npm install
```

### 2. Rebuild Native Modules (Penting!)

```bash
npx electron-rebuild
```

Atau jika ada error:

```bash
npm rebuild better-sqlite3
npm rebuild bcrypt
```

---

## 📋 Dependencies Baru yang Ditambahkan

### Production Dependencies:

#### 1. **bcrypt** (Password Hashing)
```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```
**Kegunaan**: Password hashing yang lebih aman dari SHA1

#### 2. **date-fns** (Date Manipulation)
```bash
npm install date-fns
```
**Kegunaan**: Manipulasi tanggal & waktu

#### 3. **jsbarcode** & **react-barcode** (Barcode)
```bash
npm install jsbarcode react-barcode
```
**Kegunaan**: Generate & display barcode

#### 4. **jspdf** & **jspdf-autotable** (PDF Export)
```bash
npm install jspdf jspdf-autotable
```
**Kegunaan**: Export laporan ke PDF

#### 5. **node-cron** (Scheduler)
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```
**Kegunaan**: Cron jobs untuk task otomatis

#### 6. **recharts** (Charts)
```bash
npm install recharts
```
**Kegunaan**: Charts untuk dashboard & laporan

#### 7. **xlsx** (Excel Export)
```bash
npm install xlsx
```
**Kegunaan**: Export laporan ke Excel

#### 8. **zod** (Validation)
```bash
npm install zod
```
**Kegunaan**: Schema validation

### Dev Dependencies:

#### 1. **Testing Libraries**
```bash
npm install --save-dev vitest @testing-library/react
```

#### 2. **Linting & Formatting**
```bash
npm install --save-dev eslint prettier
```

---

## 🔧 Troubleshooting

### Error: NODE_MODULE_VERSION mismatch

```bash
npx electron-rebuild
```

### Error: bcrypt not found

```bash
npm rebuild bcrypt
```

### Error: better-sqlite3 not found

```bash
npm rebuild better-sqlite3
```

### Error: Cannot find module

```bash
rm -rf node_modules package-lock.json
npm install
npx electron-rebuild
```

---

## ✅ Verifikasi Instalasi

Jalankan command ini untuk memastikan semua dependencies terinstall:

```bash
npm list bcrypt
npm list xlsx
npm list jspdf
npm list node-cron
npm list zod
npm list recharts
```

---

## 🚀 Run Development

Setelah semua dependencies terinstall:

```bash
npm run dev
```

---

## 📝 Notes

- **bcrypt** memerlukan rebuild karena native module
- **better-sqlite3** juga native module, pastikan sudah di-rebuild
- Jika ada error saat build, coba hapus `node_modules` dan install ulang
- Pastikan Node.js versi 18+ terinstall

---

## 🎯 Next Steps

Setelah dependencies terinstall:

1. ✅ Backend sudah lengkap
2. 🔄 Buat halaman frontend
3. 🔄 Integrate IPC handlers
4. 🔄 Testing
5. 🔄 Build production

---

**Happy Coding! 🚀**
