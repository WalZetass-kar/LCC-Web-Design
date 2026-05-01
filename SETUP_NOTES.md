# 📝 Setup Notes - Important Information

## ⚠️ Expected Warnings During Setup

When running `SETUP_DATABASE.sql`, you may see some warnings. **This is normal!**

### Common Warnings (Safe to Ignore):

#### 1. "duplicate column name" Errors
```
Error: duplicate column name: role
Error: duplicate column name: email
Error: duplicate column name: password_hash_type
```

**Why:** These columns may already exist in your database.

**Impact:** None. The script uses `ALTER TABLE ADD COLUMN` which will fail silently if the column already exists. Your existing data is safe.

**Action:** Ignore these warnings. The script will continue.

#### 2. "table already exists" Warnings
```
Error: table mediasoft_customer already exists
```

**Why:** The script uses `CREATE TABLE IF NOT EXISTS` which is safe.

**Impact:** None. Existing tables and data are preserved.

**Action:** Ignore these warnings.

---

## ✅ What Should Succeed

These operations should complete without errors:

1. ✅ Creating new tables (if they don't exist)
2. ✅ Adding new columns (if they don't exist)
3. ✅ Updating existing data
4. ✅ Creating indexes
5. ✅ Running ANALYZE and VACUUM
6. ✅ Verification queries

---

## 🔍 How to Verify Success

After running the setup, check these:

### 1. Check Tables Created
```sql
SELECT name FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE 'mediasoft_%'
ORDER BY name;
```

You should see at least these tables:
- mediasoft_pengguna
- mediasoft_barang
- mediasoft_kategori_barang
- mediasoft_satuan
- mediasoft_harga
- mediasoft_penjualan
- mediasoft_penjualan_detail
- mediasoft_identitas
- mediasoft_supplier
- mediasoft_customer ⭐ NEW
- mediasoft_kas_drawer ⭐ NEW
- mediasoft_kas_transaksi ⭐ NEW
- mediasoft_notifikasi ⭐ NEW
- mediasoft_backup ⭐ NEW
- mediasoft_pembelian ⭐ NEW
- mediasoft_pembelian_detail ⭐ NEW
- mediasoft_activity_log ⭐ NEW

### 2. Check Columns Added
```sql
-- Check pengguna table
PRAGMA table_info(mediasoft_pengguna);
```

Should include:
- password_hash_type ⭐ NEW
- role ⭐ NEW
- email ⭐ NEW
- no_telp ⭐ NEW

### 3. Check Indexes Created
```sql
SELECT COUNT(*) FROM sqlite_master 
WHERE type = 'index' 
  AND name LIKE 'idx_%';
```

Should show 40+ indexes.

### 4. Check Sample Data
```sql
-- Check customer
SELECT * FROM mediasoft_customer WHERE kd_customer = 'CUST001';

-- Check notification
SELECT * FROM mediasoft_notifikasi LIMIT 1;
```

---

## 🐛 Real Errors to Watch For

These are actual errors that need attention:

### 1. "no such table" Error
```
Error: no such table: mediasoft_pengguna
```

**Cause:** You're running the script on a wrong/empty database.

**Solution:** Make sure you're running it on `sistem_pos.db` with existing tables.

### 2. "database is locked" Error
```
Error: database is locked
```

**Cause:** Another process is using the database.

**Solution:**
1. Close the application
2. Close any SQLite browser/editor
3. Run the setup again

### 3. "disk I/O error" Error
```
Error: disk I/O error
```

**Cause:** Disk space or permission issues.

**Solution:**
1. Check disk space
2. Check file permissions
3. Run as administrator (Windows) or with sudo (Linux)

---

## 🔄 If Setup Fails

If the setup fails completely:

### 1. Restore from Backup
```bash
# The setup script creates a backup automatically
cp sistem_pos_backup_*.db sistem_pos.db
```

### 2. Run Manual Steps

Instead of the all-in-one script, run these separately:

```bash
# Step 1: Create new tables
sqlite3 sistem_pos.db < CREATE_NEW_TABLES.sql

# Step 2: Add password_hash_type
sqlite3 sistem_pos.db "ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';"

# Step 3: Create indexes
sqlite3 sistem_pos.db < CREATE_INDEXES.sql
```

### 3. Check Each Step
After each step, verify it worked:

```bash
# Check tables
sqlite3 sistem_pos.db ".tables"

# Check columns
sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);"

# Check indexes
sqlite3 sistem_pos.db "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index';"
```

---

## 📊 Setup Script Behavior

### What the Script Does:

1. **Creates Tables** (if not exist)
   - Uses `CREATE TABLE IF NOT EXISTS`
   - Safe to run multiple times
   - Preserves existing data

2. **Adds Columns** (if not exist)
   - Uses `ALTER TABLE ADD COLUMN`
   - Will error if column exists (safe to ignore)
   - Preserves existing data

3. **Updates Data**
   - Sets default values for new columns
   - Updates admin user role
   - Safe to run multiple times

4. **Creates Indexes**
   - Uses `CREATE INDEX IF NOT EXISTS`
   - Safe to run multiple times
   - Improves query performance

5. **Optimizes Database**
   - Runs ANALYZE (updates statistics)
   - Runs VACUUM (reclaims space)
   - Safe to run multiple times

### What the Script Does NOT Do:

- ❌ Delete any data
- ❌ Modify existing data (except adding defaults)
- ❌ Drop any tables
- ❌ Remove any columns
- ❌ Change existing passwords

---

## 🎯 Success Indicators

After successful setup, you should see:

```
✓ Database setup completed successfully!
All tables created, columns added, indexes created, and data optimized.

New Tables Check: 8 tables_created
Password Hash Type Column: ✓ OK
Password Migration Status: 
  - total_users: X
  - migrated: 0
  - pending: X
  - percentage: 0.0%
Total Indexes: 40+
All Tables: 17+
```

---

## 💡 Tips

### 1. Run Setup Multiple Times
It's safe to run the setup script multiple times. It will:
- Skip existing tables
- Skip existing columns
- Update only what's needed

### 2. Backup Before Setup
The automated scripts (`setup.sh` and `setup.bat`) create backups automatically. If running manually:

```bash
cp sistem_pos.db sistem_pos_backup_$(date +%Y%m%d).db
```

### 3. Test After Setup
After setup, test the application:
1. Start the app: `npm run dev`
2. Login with admin/admin
3. Check if all pages load
4. Try creating a customer
5. Try creating a notification

### 4. Check Logs
If something goes wrong, check:
- Console output during setup
- Application logs in `logs/` directory
- Activity logs in database

---

## 📞 Getting Help

If you encounter issues:

1. **Check this file** - Common issues are documented here
2. **Check `SETUP_GUIDE.md`** - Detailed troubleshooting
3. **Check error logs** - `logs/error-*.log`
4. **Check database** - Use SQLite browser to inspect

---

## ✅ Checklist After Setup

- [ ] All new tables created (8 tables)
- [ ] All new columns added (password_hash_type, role, email, etc.)
- [ ] All indexes created (40+ indexes)
- [ ] Sample data inserted (CUST001, welcome notification)
- [ ] Database optimized (ANALYZE, VACUUM)
- [ ] Application starts without errors
- [ ] Can login with admin/admin
- [ ] Can access all pages

---

**Last Updated:** 2026-04-28
**Version:** 4.0.0
