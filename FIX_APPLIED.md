# Database Column Fix Applied ✓

## Problem
The application was crashing with error:
```
SqliteError: no such column: password_hash_type
```

## Root Cause
The `password_hash_type` column was missing from the `mediasoft_pengguna` table in the database. This column is required for the new security enhancement that supports both SHA1 (legacy) and bcrypt (secure) password hashing.

## Solution Applied
Updated `src/database/connection.ts` to automatically run migrations on startup. The migration will:

1. Check if `password_hash_type` column exists
2. Add it if missing (with default value 'sha1')
3. Update existing users to use 'sha1' hash type
4. Also check and add other missing columns: `role`, `email`, `no_telp`

## How to Fix

### Option 1: Restart the Application (Recommended)
1. Stop the running application (Ctrl+C in terminal)
2. Restart the application
3. The migration will run automatically on startup
4. Check the console for migration success messages

### Option 2: Manual SQL Fix (If app won't start)
If the database is not locked, run:
```bash
sqlite3 sistem_pos.db < fix_password_column.sql
```

## Verification
After restart, you should see in the console:
```
✓ password_hash_type column added successfully
✓ role column added successfully
✓ email column added successfully
✓ no_telp column added successfully
```

## What Changed
- **File Modified**: `src/database/connection.ts`
- **New File**: `fix_password_column.sql` (backup manual fix)
- **Migration**: Automatic on startup

## Next Steps
1. Restart the application
2. Try logging in again
3. The error should be resolved

## Technical Details
The migration checks for missing columns using `PRAGMA table_info()` and adds them only if they don't exist. This makes it safe to run multiple times without errors.

All existing users will have `password_hash_type = 'sha1'` by default, and will be automatically migrated to bcrypt on their next login.
