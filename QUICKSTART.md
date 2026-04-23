# 🚀 Quick Start Guide - MediaSoft POS WalDevelop

Panduan cepat untuk menjalankan aplikasi dalam 5 menit!

## ⚡ Super Quick Start (3 Commands)

```bash
npm install
node backend/database/migrate.js
npm run dev
```

Selesai! Aplikasi akan terbuka otomatis. 🎉

## 📋 Prerequisites Check

Pastikan sudah terinstall:

```bash
node --version    # Should be v18+
npm --version     # Should be v9+
```

Jika belum, download dari [nodejs.org](https://nodejs.org)

## 🎯 Step-by-Step Guide

### Step 1: Install Dependencies (2-3 menit)

```bash
npm install
```

Tunggu hingga selesai. Anda akan melihat:
```
added 538 packages
```

### Step 2: Setup Database (5 detik)

```bash
node backend/database/migrate.js
```

Output yang benar:
```
🔄 Creating database tables...
✅ Tables created successfully
🎉 Migration completed!
```

File `sistem_pos.db` akan dibuat di root folder.

### Step 3: Run Application (10 detik)

```bash
npm run dev
```

Tunggu hingga muncul:
```
VITE v5.0.11  ready in 1234 ms
➜  Local:   http://localhost:5173/
```

Electron window akan terbuka otomatis!

## 🔑 Login

Gunakan credentials berikut:

**Admin:**
```
Username: admin
Password: admin123
```

**Kasir:**
```
Username: kasir1
Password: kasir123
```

## 🎮 First Steps

### 1. Explore Dashboard
- Lihat statistik penjualan
- Cek produk terlaris

### 2. Check Products
- Klik menu "Produk"
- Lihat daftar produk yang sudah ada
- Coba tambah produk baru

### 3. Make a Transaction
- Klik menu "Transaksi"
- Pilih beberapa produk
- Klik "Checkout"
- Input pembayaran
- Lihat invoice yang dihasilkan

### 4. View History
- Klik menu "Riwayat"
- Lihat transaksi yang baru dibuat
- Klik "Detail" untuk melihat detail

### 5. Change Theme
- Klik menu "Pengaturan"
- Pilih tema warna favorit
- Tema akan tersimpan otomatis

## 🎨 UI Overview

```
┌─────────────────────────────────────────────────────┐
│  MediaSoft POS                    🕐 12:34:56       │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│  📊 Dash │  Main Content Area                       │
│  📦 Prod │  - Dashboard stats                       │
│  💰 Tran │  - Product list                          │
│  📜 Hist │  - Transaction form                      │
│  ⚙️ Sett │  - History table                         │
│          │                                           │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### Problem: Port 5173 already in use

**Solution:**
```bash
# Kill the process
lsof -ti:5173 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5173   # Windows (then kill PID)
```

### Problem: Database error

**Solution:**
```bash
# Delete and recreate
rm sistem_pos.db
node backend/database/migrate.js
```

### Problem: Electron doesn't open

**Solution:**
```bash
# Run separately
npm run dev:vite    # Terminal 1
npm run dev:electron # Terminal 2 (after vite is ready)
```

### Problem: Module not found

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📱 Features to Try

### ✅ Basic Features
- [ ] Login as admin
- [ ] View dashboard
- [ ] Browse products
- [ ] Create a transaction
- [ ] View transaction history
- [ ] Change theme

### ✅ Advanced Features
- [ ] Add new product
- [ ] Edit product
- [ ] Delete product
- [ ] Search products
- [ ] Filter by category
- [ ] Multiple payment methods
- [ ] View transaction details

## 🎯 Common Tasks

### Add New Product

1. Go to "Produk" page
2. Click "+ Tambah Produk"
3. Fill the form:
   - Kategori: Pilih kategori
   - Kode: MKN999
   - Nama: Nama produk
   - Harga: 10000
   - Stok: 50
4. Click "Simpan"

### Make a Sale

1. Go to "Transaksi" page
2. Click products to add to cart
3. Adjust quantity with +/- buttons
4. Click "Checkout"
5. Enter payment amount
6. Click "Bayar"
7. Note the invoice number

### View Sales Report

1. Go to "Dashboard"
2. See monthly statistics
3. Check top products
4. View total sales

## 🔄 Reset Everything

If you want to start fresh:

```bash
# Delete database
rm sistem_pos.db

# Recreate with fresh data
node backend/database/migrate.js

# Restart app
npm run dev
```

Or use the app:
1. Login as admin
2. Go to "Pengaturan"
3. Click "Reset Database"

## 📚 Next Steps

After getting familiar with the app:

1. **Read Documentation**
   - README.md - Overview
   - ARCHITECTURE.md - How it works
   - API.md - API reference

2. **Customize**
   - Add your own products
   - Modify themes
   - Add features

3. **Deploy**
   - Build for production
   - Distribute to users

## 💡 Tips & Tricks

### Keyboard Shortcuts (Future)
- `Ctrl+N` - New transaction
- `Ctrl+P` - Products page
- `Ctrl+H` - History page
- `Ctrl+Q` - Logout

### Performance Tips
- Keep stock updated
- Regular database cleanup
- Monitor transaction history

### Best Practices
- Always check stock before transaction
- Use proper product codes
- Add product descriptions
- Regular backups

## 🎓 Learning Path

### Beginner
1. ✅ Run the app
2. ✅ Understand UI
3. ✅ Make transactions
4. ✅ View reports

### Intermediate
1. 📖 Read architecture docs
2. 🔍 Explore code structure
3. 🛠️ Modify components
4. 🎨 Customize themes

### Advanced
1. 🏗️ Add new features
2. 🧪 Write tests
3. 📦 Build for production
4. 🚀 Deploy application

## 📞 Need Help?

### Quick Checks
1. ✅ Node.js installed?
2. ✅ Dependencies installed?
3. ✅ Database created?
4. ✅ Port 5173 available?

### Resources
- 📖 README.md - Main docs
- 🔧 SETUP.md - Detailed setup
- 🏗️ ARCHITECTURE.md - How it works
- 📡 API.md - API docs

### Common Questions

**Q: Can I use this for production?**
A: Yes, but add security enhancements (password hashing, etc.)

**Q: Can I modify the code?**
A: Yes! It's MIT licensed. Feel free to customize.

**Q: How do I add more users?**
A: Currently via database. User management UI coming soon.

**Q: Can I change the database?**
A: Yes, Drizzle ORM supports PostgreSQL, MySQL, etc.

**Q: Is there a mobile version?**
A: Not yet, but the architecture supports it.

## 🎉 Success Checklist

After following this guide, you should have:

- ✅ Application running
- ✅ Logged in successfully
- ✅ Viewed dashboard
- ✅ Browsed products
- ✅ Made a transaction
- ✅ Viewed history
- ✅ Changed theme

**Congratulations! You're ready to use MediaSoft POS! 🎊**

## 🚀 What's Next?

1. **Explore all features**
2. **Read full documentation**
3. **Customize for your needs**
4. **Share feedback**
5. **Contribute improvements**

---

**MediaSoft POS WalDevelop**

*From zero to POS in 5 minutes!* ⚡

Need more help? Check the full documentation or create an issue.

Happy selling! 🛍️
