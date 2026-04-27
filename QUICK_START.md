# 🚀 Quick Start Guide - MediaSoft POS

## 📋 Prerequisites

- Node.js v18+
- npm atau yarn
- SQLite3

---

## ⚡ Quick Setup (5 Menit)

### 1. Install Dependencies
```bash
npm install
```

### 2. Rebuild Native Modules
```bash
npx electron-rebuild
```

### 3. Run Development
```bash
npm run dev
```

**Done! Aplikasi akan terbuka otomatis** 🎉

---

## 🔐 Default Login

```
Username: admin
Password: admin
```

> ⚠️ **PENTING**: Ubah password setelah login pertama!

---

## 📚 Dokumentasi Lengkap

### 1. **SUMMARY_IMPLEMENTASI.md**
   - Overview semua fitur yang sudah ditambahkan
   - Statistik implementasi
   - Progress tracking

### 2. **IMPLEMENTASI_LENGKAP.md**
   - Detail lengkap setiap controller & model
   - API documentation
   - Usage examples

### 3. **INSTALASI_DEPENDENCIES.md**
   - Panduan install dependencies
   - Troubleshooting
   - Verifikasi instalasi

### 4. **FRONTEND_CHECKLIST.md**
   - Checklist halaman yang perlu dibuat
   - Component list
   - Integration guide

---

## 🎯 Fitur yang Sudah Siap (Backend)

### ✅ Customer Management
```typescript
// Get all customers
await window.api.invoke('customer:getAll')

// Create customer
await window.api.invoke('customer:create', {
  nama_customer: 'John Doe',
  no_telp: '08123456789',
  email: 'john@example.com'
})
```

### ✅ Notifikasi System
```typescript
// Get unread count
await window.api.invoke('notifikasi:getUnreadCount', username)

// Mark as read
await window.api.invoke('notifikasi:markAsRead', kd_notifikasi)
```

### ✅ Kas Management
```typescript
// Buka kas
await window.api.invoke('kas:bukaKas', username, 100000, 'Modal awal')

// Tutup kas
await window.api.invoke('kas:tutupKas', kd_kas, 150000, 'Tutup kas')
```

### ✅ Pembelian/PO
```typescript
// Create purchase order
await window.api.invoke('pembelian:create', {
  kd_suplier: 'SUP001',
  username: 'admin',
  items: [
    { kd_barang: 'BRG001', qty: 10, harga_beli: 5000 }
  ],
  yang_dibayar: 50000
})
```

### ✅ Backup & Restore
```typescript
// Create backup
await window.api.invoke('backup:create', username, 'Backup manual')

// Restore
await window.api.invoke('backup:restore', kd_backup)
```

### ✅ Laporan
```typescript
// Laporan penjualan
await window.api.invoke('laporan:penjualan', '2024-01-01', '2024-12-31')

// Laporan laba rugi
await window.api.invoke('laporan:labaRugi', '2024-01-01', '2024-12-31')
```

### ✅ Export
```typescript
// Export to Excel
await window.api.invoke('export:penjualanExcel', '2024-01-01', '2024-12-31')

// Export to PDF
await window.api.invoke('export:penjualanPDF', '2024-01-01', '2024-12-31')
```

### ✅ Activity Log
```typescript
// Log activity
await window.api.invoke('activityLog:log', username, 'Login', 'AUTH', 'User login')

// Get all logs
await window.api.invoke('activityLog:getAll')
```

---

## 🔧 Troubleshooting

### Error: NODE_MODULE_VERSION mismatch
```bash
npx electron-rebuild
```

### Error: Cannot find module 'bcrypt'
```bash
npm rebuild bcrypt
```

### Error: Cannot find module 'better-sqlite3'
```bash
npm rebuild better-sqlite3
```

### Error: window.api is undefined
- Pastikan `preload.cjs` ada di `src/main/`
- Restart aplikasi

### Database locked
- Tutup semua instance aplikasi
- Restart aplikasi

---

## 📁 Struktur Project

```
mediasoft-pos/
├── src/
│   ├── backend/
│   │   ├── controllers/     # 13 controllers ✅
│   │   ├── models/          # 11 models ✅
│   │   └── services/        # 4 services ✅
│   ├── database/
│   │   ├── connection.ts
│   │   └── schema.ts
│   ├── main/
│   │   ├── index.ts
│   │   ├── ipcHandlers.ts   # 100+ handlers ✅
│   │   └── preload.cjs
│   ├── renderer/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── utils/
│   └── shared/
│       └── types.ts
├── sistem_pos.db            # Database
├── backups/                 # Auto backup folder
├── exports/                 # Export folder
└── package.json
```

---

## 🎨 Next Steps

### 1. Buat Halaman Frontend
Lihat **FRONTEND_CHECKLIST.md** untuk detail lengkap:
- Customer Management
- Kas Management
- Pembelian/PO
- Notifikasi
- Backup
- Laporan
- Activity Log

### 2. Integrate IPC Handlers
Semua backend sudah siap, tinggal panggil dari frontend:
```typescript
import { api } from '@/utils/api'

const result = await api('module:action', ...params)
```

### 3. Add UI Components
- DateRangePicker
- NotificationBell
- ExportButton
- Charts
- Filters

### 4. Testing
- Test setiap fitur
- Test error handling
- Test edge cases

---

## 📊 Progress Tracking

### Backend: ✅ 100%
- [x] Controllers
- [x] Models
- [x] Services
- [x] IPC Handlers
- [x] Validation
- [x] Export
- [x] Scheduler

### Frontend: 🔄 0%
- [ ] Pages
- [ ] Components
- [ ] Integration
- [ ] Testing

---

## 🎯 Target

**Aplikasi POS lengkap siap pakai untuk toko retail**

### Fitur Utama:
✅ Transaksi penjualan
✅ Manajemen produk
✅ Manajemen customer (loyalty)
✅ Manajemen supplier
✅ Kas harian
✅ Purchase order
✅ Notifikasi real-time
✅ Backup otomatis
✅ Laporan lengkap
✅ Export Excel & PDF
✅ Activity log
✅ User management
✅ Multi-role (Admin, Kasir, Owner)

---

## 💡 Tips

### Development:
- Gunakan `npm run dev` untuk development
- Hot reload otomatis untuk Vite
- DevTools terbuka otomatis

### Production:
- Gunakan `npm run build` untuk build
- Executable ada di folder `release/`
- Database & backups otomatis ter-copy

### Best Practices:
- Selalu backup sebelum update
- Test di development dulu
- Gunakan activity log untuk audit
- Set stok minimum untuk alert
- Enable auto backup

---

## 📞 Support

### Dokumentasi:
- **SUMMARY_IMPLEMENTASI.md** - Overview
- **IMPLEMENTASI_LENGKAP.md** - Detail lengkap
- **FRONTEND_CHECKLIST.md** - Frontend guide
- **INSTALASI_DEPENDENCIES.md** - Setup guide

### Troubleshooting:
1. Check dokumentasi
2. Check error message
3. Rebuild native modules
4. Restart aplikasi

---

## 🎉 Selamat!

Backend sudah 100% lengkap dan siap digunakan!

**Tinggal buat UI frontend dan aplikasi POS siap dipakai! 🚀**

---

**Happy Coding! 💻**
