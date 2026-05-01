# Quick Fix for Login Error

## Error Message
```
SqliteError: no such column: password_hash_type
```

## ONE-COMMAND FIX 🚀

```bash
./fix_now.sh
```

This script will:
- ✅ Check what's locking the database
- ✅ Offer to close those apps for you
- ✅ Add the missing column
- ✅ Verify it worked

Then just **restart your Electron app** and login will work!

---

## Manual Steps (if needed)

### 1️⃣ Close SQLite Browser
**SQLite Browser (PID 54919) is currently locking your database.**

Close it manually, or force close:
```bash
kill -9 54919
```

### 2️⃣ Add the Column
```bash
sqlite3 sistem_pos.db "ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';"
```

### 3️⃣ Restart App
Start your Electron app - login should work!

---

## Helper Scripts

**Check what's using the database:**
```bash
lsof sistem_pos.db
```

**Close database apps:**
```bash
./close_database_apps.sh
```

**Run migration only:**
```bash
./fix_database.sh
```

---

## Verify Fix
```bash
sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);" | grep password_hash_type
```

Should show: `10|password_hash_type|TEXT|0|'sha1'|0`

---

## Troubleshooting

**"Database is locked"**
- Close SQLite Browser (it's open with PID 54919)
- Close the Electron app
- Run `./fix_now.sh` - it will help you close them

**"Duplicate column" error**
- Column already exists! Just restart your app.

**Still not working?**
- Check console output when starting the app
- Look for migration messages
- See `FIX_INSTRUCTIONS.md` for details
