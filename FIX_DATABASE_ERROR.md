# 🔧 Fix: "no such column: password_hash_type"

## ❌ Error You're Seeing:
```
Error: Error invoking remote method 'auth:login': 
SqliteError: no such column: password_hash_type
```

## 🎯 Root Cause:
You haven't run the database setup yet. The `password_hash_type` column doesn't exist in your database.

---

## ✅ Solution (3 Steps):

### Step 1: Stop the Application

**If app is running, stop it:**
- Press `Ctrl+C` in the terminal where `npm run dev` is running
- Wait 5 seconds for the database to unlock

### Step 2: Run Database Setup

**Option A: Automated (Recommended)**
```bash
chmod +x run_setup.sh
./run_setup.sh
```

**Option B: Manual**
```bash
# Make sure app is stopped first!
sqlite3 sistem_pos.db < SETUP_DATABASE.sql
```

**Expected Output:**
- You'll see some "duplicate column name" warnings - **THIS IS NORMAL!**
- Setup will complete successfully
- You'll see verification showing tables and indexes created

### Step 3: Start the Application

```bash
npm run dev
```

Now login with `admin` / `admin` and it will work!

---

## 🐛 If You Get "database is locked"

This means the app is still running.

**Solution:**
1. Find and stop the app:
   ```bash
   # Linux/Mac
   pkill -f electron
   pkill -f vite
   
   # Or just close the terminal running npm run dev
   ```

2. Wait 5 seconds

3. Run setup again:
   ```bash
   ./run_setup.sh
   ```

---

## ✅ Verification

After setup, verify the column exists:

```bash
sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);" | grep password_hash_type
```

Should show:
```
10|password_hash_type|TEXT|0|'sha1'|0
```

---

## 📊 What Gets Created

The setup will:
- ✅ Create 8 new tables (customer, kas, pembelian, etc.)
- ✅ Add new columns (password_hash_type, role, email, etc.)
- ✅ Create 40+ performance indexes
- ✅ Insert sample data
- ✅ Optimize database

**Your existing data is 100% safe!**

---

## 🎯 Quick Fix Summary

```bash
# 1. Stop app (Ctrl+C)
# 2. Run setup
./run_setup.sh
# 3. Start app
npm run dev
# 4. Login: admin / admin
```

---

## 💡 Why This Happened

You ran the app before running the database setup. The new security features require the `password_hash_type` column which is created by the setup script.

**Always run setup before first use!**

---

## 📚 More Help

- **`SETUP_README.md`** - Complete setup guide
- **`TROUBLESHOOTING.md`** - More solutions
- **`SETUP_NOTES.md`** - Expected warnings explained

---

**Run `./run_setup.sh` and you're good to go!** 🚀
