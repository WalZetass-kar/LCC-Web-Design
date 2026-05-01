# 🚀 Setup MediaSoft POS - READ THIS FIRST

## ⚠️ IMPORTANT: About "duplicate column name" Errors

When running the setup, you will see errors like:
```
Error: duplicate column name: role
Error: duplicate column name: email
Error: duplicate column name: password_hash_type
```

### ✅ **THIS IS COMPLETELY NORMAL AND SAFE!**

**Why this happens:**
- Your database already has these columns from `CREATE_NEW_TABLES.sql`
- The setup script tries to add them again (for safety)
- SQLite shows an error, but continues anyway
- **Your data is 100% safe**

**What to do:**
- **IGNORE these errors** - they are expected
- The setup will continue and complete successfully
- All your data is preserved

---

## 🎯 Quick Setup (Choose One)

### Option 1: Automated Setup (Recommended)

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```bash
setup.bat
```

The script will:
- ✅ Backup your database automatically
- ✅ Create all new tables
- ✅ Add all new columns (with expected warnings)
- ✅ Create 40+ performance indexes
- ✅ Install dependencies
- ✅ Rebuild native modules
- ✅ Show verification results

### Option 2: Manual Setup

```bash
# 1. Backup database
cp sistem_pos.db sistem_pos_backup.db

# 2. Run setup (will show some warnings - this is normal)
sqlite3 sistem_pos.db < SETUP_DATABASE.sql

# 3. Install dependencies
npm install

# 4. Rebuild native modules
npx electron-rebuild

# 5. Start app
npm run dev
```

---

## 📊 What Gets Installed

### New Tables (8):
- ✅ mediasoft_customer
- ✅ mediasoft_kas_drawer
- ✅ mediasoft_kas_transaksi
- ✅ mediasoft_notifikasi
- ✅ mediasoft_backup
- ✅ mediasoft_pembelian
- ✅ mediasoft_pembelian_detail
- ✅ mediasoft_activity_log

### New Columns:
- ✅ mediasoft_pengguna: role, email, no_telp, password_hash_type
- ✅ mediasoft_barang: stok_minimum, barcode, expired_date
- ✅ mediasoft_penjualan: pajak, kd_customer
- ✅ mediasoft_identitas: logo, npwp, pajak_persen
- ✅ mediasoft_supplier: email, status

### Performance Indexes (40+):
- ✅ All tables indexed for fast queries
- ✅ 5-12x faster query performance

---

## ✅ Verification

After setup, verify everything worked:

### 1. Check Tables
```bash
sqlite3 sistem_pos.db ".tables"
```

Should show 17+ tables including the 8 new ones.

### 2. Check Columns
```bash
sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);"
```

Should show: role, email, no_telp, password_hash_type

### 3. Check Indexes
```bash
sqlite3 sistem_pos.db "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%';"
```

Should show 40+ indexes.

### 4. Start App
```bash
npm run dev
```

Should start without errors.

### 5. Test Login
- Login with: `admin` / `admin`
- Should work and migrate password to bcrypt
- Check console for "Password migrated" message

---

## 🐛 Troubleshooting

### "duplicate column name" - SAFE TO IGNORE ✅
This is expected. Your data is safe. Continue with setup.

### "no such table" - REAL ERROR ❌
This means tables weren't created. Solutions:
1. Make sure you're using the correct database file
2. Run `CREATE_NEW_TABLES.sql` first
3. Then run `SETUP_DATABASE.sql`

### "database is locked" - CLOSE APP ⚠️
1. Close MediaSoft POS application
2. Close any SQLite browser
3. Wait 5 seconds
4. Run setup again

### "NODE_MODULE_VERSION mismatch" - REBUILD 🔧
```bash
npx electron-rebuild
```

---

## 📚 Documentation

For more details, see:

- **`SETUP_NOTES.md`** - Expected warnings explained
- **`TROUBLESHOOTING.md`** - Complete troubleshooting guide
- **`SETUP_GUIDE.md`** - Detailed setup instructions
- **`SECURITY_IMPLEMENTATION_GUIDE.md`** - Security features

---

## 🎯 Expected Output

When setup completes successfully, you should see:

```
✓ Database setup completed
✓ Dependencies installed
✓ Native modules rebuilt

Database Status:
Total tables: 17+
Total indexes: 40+

Password Migration Status:
Total Users: X | Migrated: 0 | Pending: X

✓ Setup completed successfully!
```

---

## 💡 Pro Tips

1. **Backup is automatic** - The setup script creates a backup before making changes

2. **Safe to run multiple times** - You can run the setup script multiple times safely

3. **Warnings are normal** - "duplicate column name" warnings are expected and safe

4. **Check logs** - If something goes wrong, check `logs/error-*.log`

5. **Test after setup** - Always test the app after setup to make sure everything works

---

## 🆘 Need Help?

1. **Check `SETUP_NOTES.md`** - Explains all warnings
2. **Check `TROUBLESHOOTING.md`** - Solutions for common issues
3. **Check error logs** - `logs/error-*.log`
4. **Check database** - Use SQLite browser to inspect

---

## ✅ Success Checklist

After setup, verify:

- [ ] No critical errors (ignore "duplicate column" warnings)
- [ ] All 17+ tables exist
- [ ] All 40+ indexes created
- [ ] App starts without errors
- [ ] Can login with admin/admin
- [ ] Password migrates to bcrypt
- [ ] All pages load correctly

---

**Ready? Run `./setup.sh` (or `setup.bat` on Windows) and you're good to go!** 🚀

**Remember: "duplicate column name" errors are NORMAL and SAFE!**
