# Setup Guide - MediaSoft POS WalDevelop

Panduan lengkap untuk setup dan menjalankan aplikasi.

## 📋 Prerequisites

Pastikan sudah terinstall:
- **Node.js** v18 atau lebih tinggi
- **npm** v9 atau lebih tinggi

Cek versi:
```bash
node --version
npm --version
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

Proses ini akan menginstall semua dependencies yang dibutuhkan:
- React & React Router
- Electron
- Tailwind CSS
- TanStack Table
- SQLite & Drizzle ORM
- Dan lainnya...

### 2. Setup Database

Jalankan migration untuk membuat tabel database:

```bash
node backend/database/migrate.js
```

Output yang diharapkan:
```
🔄 Creating database tables...
✅ Tables created successfully
🎉 Migration completed!
```

File database `sistem_pos.db` akan dibuat di root project.

### 3. Run Development Mode

```bash
npm run dev
```

Perintah ini akan:
1. Menjalankan Vite dev server (React) di port 5173
2. Menjalankan Electron app
3. Membuka aplikasi secara otomatis
4. Hot reload aktif untuk development

## 🔧 Development Commands

### Run Vite Only (Frontend)
```bash
npm run dev:vite
```

### Run Electron Only
```bash
npm run dev:electron
```

### Build Production
```bash
npm run build
npm run build:electron
```

## 📊 Database Management

### Reset Database
Jika ingin reset database ke kondisi awal:

1. Hapus file `sistem_pos.db`
2. Jalankan migration lagi:
```bash
node backend/database/migrate.js
```

### Seed Data
Data awal (users, categories, products) akan otomatis di-seed saat aplikasi pertama kali dijalankan.

Atau manual via aplikasi:
- Login sebagai admin
- Buka menu **Pengaturan**
- Klik **Reset Database**

## 🐛 Troubleshooting

### Error: Cannot find module 'better-sqlite3'

**Solusi:**
```bash
npm install better-sqlite3 --save
npm rebuild better-sqlite3
```

### Error: Port 5173 already in use

**Solusi 1:** Kill process yang menggunakan port
```bash
# Linux/Mac
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Solusi 2:** Ubah port di `vite.config.js`

### Electron window tidak muncul

**Solusi:**
1. Pastikan Vite dev server sudah running
2. Tunggu beberapa detik
3. Cek console untuk error

### Database error saat startup

**Solusi:**
```bash
# Hapus database lama
rm sistem_pos.db

# Buat ulang
node backend/database/migrate.js
```

## 📱 Testing

### Login Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`

**Kasir:**
- Username: `kasir1`
- Password: `kasir123`

### Test Flow

1. **Login** dengan credentials di atas
2. **Dashboard** - Cek statistik (awalnya kosong)
3. **Produk** - Lihat produk yang sudah di-seed
4. **Transaksi** - Buat transaksi test
5. **Riwayat** - Lihat transaksi yang baru dibuat
6. **Pengaturan** - Ubah tema warna

## 🏗️ Project Structure

```
mediasoft-pos-waldevelop/
├── backend/              # Backend logic
│   ├── controllers/      # Business logic
│   ├── models/          # Database schema
│   └── database/        # DB config & migration
├── main/                # Electron main process
│   ├── ipc/            # IPC handlers
│   ├── main.js         # Entry point
│   └── preload.js      # Context bridge
├── src/                 # React frontend
│   ├── components/     # Reusable components
│   ├── pages/          # Application pages
│   ├── context/        # React context
│   └── App.jsx         # Main component
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎨 Customization

### Ubah Tema Default

Edit `src/context/ThemeContext.jsx`:
```jsx
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('theme') || 'purple'; // Ubah di sini
});
```

### Tambah Kategori Produk

Edit `backend/database/seed.js` di array `defaultCategories`.

### Ubah Port

Edit `vite.config.js`:
```js
server: {
  port: 5174 // Ubah port
}
```

## 📦 Build untuk Production

### Windows
```bash
npm run build
npm run build:electron
```

Output: `dist-electron/win-unpacked/`

### macOS
```bash
npm run build
npm run build:electron
```

Output: `dist-electron/mac/`

### Linux
```bash
npm run build
npm run build:electron
```

Output: `dist-electron/linux-unpacked/`

## 🔐 Security Notes

- Password di-store plain text (untuk demo)
- Untuk production, gunakan bcrypt untuk hash password
- Implementasi JWT untuk session management
- Tambahkan rate limiting untuk login

## 📚 Next Steps

Setelah setup berhasil:

1. ✅ Explore semua fitur aplikasi
2. ✅ Baca dokumentasi di README.md
3. ✅ Customize sesuai kebutuhan
4. ✅ Deploy untuk production

## 💡 Tips

- Gunakan **Ctrl+Shift+I** untuk buka DevTools
- Database file ada di root project
- Hot reload aktif saat development
- Gunakan theme switcher di Settings

## 🆘 Need Help?

Jika mengalami masalah:
1. Cek error di console
2. Baca troubleshooting guide di atas
3. Pastikan semua dependencies terinstall
4. Cek versi Node.js dan npm

---

**Happy Coding! 🚀**

MediaSoft POS WalDevelop v1.0.0
