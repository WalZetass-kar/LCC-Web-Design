# How to Fix the "no such column: password_hash_type" Error

## The Problem
Your database is missing the `password_hash_type` column, which is required for the security enhancement feature.

## Why It's Not Fixed Yet
The database is currently **locked** by running applications. SQLite cannot add columns while the database is in use.

## Solution: Follow These Steps

### Step 1: Close All Database Connections
1. **Close your Electron app** (the POS application)
2. **Close SQLite Browser** if you have it open
3. Make sure no other programs are accessing `sistem_pos.db`

### Step 2: Run the Migration

**Option A: Using the bash script (Easiest)**
```bash
./fix_database.sh
```

The script will:
- Check if the database is locked and warn you
- Run the migration automatically
- Verify the column was added
- Tell you when it's safe to restart

**Option B: Using SQL directly**
```bash
sqlite3 sistem_pos.db < fix_password_column.sql
```

**Option C: Manual command**
```bash
sqlite3 sistem_pos.db "ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';"
```

### Step 3: Restart Your App
After the migration completes successfully, restart your Electron app. The login should now work!

## Verification
After running the migration, verify it worked:

```bash
sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);" | grep password_hash_type
```

You should see output like:
```
10|password_hash_type|TEXT|0|'sha1'|0
```

## What Changed
The updated `src/database/connection.ts` will now:
- Automatically check for missing columns on startup
- Add them if they don't exist (when database is not locked)
- Show clear error messages if migration fails
- Prevent the app from starting with a broken schema

## Troubleshooting

### "Database is locked" error
The database is still being used. Check what's using it:
```bash
lsof sistem_pos.db
```

Then close those applications and try again.

### "Duplicate column" error
This means the column already exists! Just restart your app, it should work now.

### Node.js module version error
Ignore the `add_password_column.js` script - use the bash script or SQL file instead.

### Still getting errors?
Check the console output when starting your app. The migration will show:
- ✓ password_hash_type column exists
- ✓ role column added successfully
- etc.

If you see "❌ Failed to add password_hash_type column", the database might still be locked.
