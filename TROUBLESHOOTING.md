# 🔧 Troubleshooting Guide - MediaSoft POS

## 🎯 Quick Problem Solver

| Problem | Quick Fix | Details |
|---------|-----------|---------|
| "no such column" error | Run `SETUP_DATABASE.sql` | [Link](#error-no-such-column) |
| "duplicate column" warning | Ignore it (safe) | [Link](#warning-duplicate-column-name) |
| "database is locked" | Close app & retry | [Link](#error-database-is-locked) |
| "NODE_MODULE_VERSION" | Run `npx electron-rebuild` | [Link](#error-node_module_version-mismatch) |
| Can't login | Check credentials & status | [Link](#cant-login) |
| App won't start | Check dependencies | [Link](#app-wont-start) |

---

## 🗄️ Database Setup Errors

### Error: "no such column: password_hash_type"

**Full Error:**
```
Error: no such column: password_hash_type
At line 25: CREATE INDEX IF NOT EXISTS idx_pengguna_hash_type...
```

**Cause:** You ran `CREATE_INDEXES.sql` before adding the column.

**Solution:**
```bash
# Run the all-in-one setup script
sqlite3 sistem_pos.db < SETUP_DATABASE.sql
```

**Or run in correct order:**
```bash
# 1. Add columns first
sqlite3 sistem_pos.db "ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';"

# 2. Then create indexes
sqlite3 sistem_pos.db < CREATE_INDEXES.sql
```

---

### Error: "no such column: kd_pembelian"

**Full Error:**
```
Error: no such table: mediasoft_pembelian
At line 38: CREATE INDEX IF NOT EXISTS idx_pembelian_kd...
```

**Cause:** New tables haven't been created yet.

**Solution:**
```bash
# Run the all-in-one setup script (includes table creation)
sqlite3 sistem_pos.db < SETUP_DATABASE.sql
```

**Or create tables first:**
```bash
# 1. Create new tables
sqlite3 sistem_pos.db < CREATE_NEW_TABLES.sql

# 2. Then run setup
sqlite3 sistem_pos.db < SETUP_DATABASE.sql
```

---

### Warning: "duplicate column name"

**Full Warning:**
```
Error: duplicate column name: role
Error: duplicate column name: email
Error: duplicate column name: password_hash_type
```

**Cause:** Columns already exist in your database.

**Impact:** ✅ **SAFE TO IGNORE** - This is expected and normal.

**Explanation:** 
- SQLite's `ALTER TABLE ADD COLUMN` will error if column exists
- The script continues anyway
- Your existing data is safe
- No action needed

**See:** `SETUP_NOTES.md` for more details

---

### Error: "database is locked"

**Full Error:**
```
Error: database is locked
```

**Cause:** Another process is using the database.

**Solution:**
1. Close the MediaSoft POS application
2. Close any SQLite browser/editor (DB Browser, etc.)
3. Close any terminal running the app
4. Wait 5 seconds
5. Run the setup again

**Still locked?**
```bash
# Check what's using the database (Linux/Mac)
lsof sistem_pos.db

# Force close (use with caution)
killall electron
```

---

### Error: "disk I/O error"

**Full Error:**
```
Error: disk I/O error
```

**Possible Causes:**
1. Disk is full
2. No write permission
3. Database file is corrupted
4. Disk hardware issue

**Solutions:**

**1. Check disk space:**
```bash
# Linux/Mac
df -h .

# Windows
dir
```

**2. Check permissions:**
```bash
# Linux/Mac
ls -la sistem_pos.db
chmod 644 sistem_pos.db

# Windows
# Right-click → Properties → Security
```

**3. Restore from backup:**
```bash
cp sistem_pos_backup_*.db sistem_pos.db
```

---

## 🔐 Authentication Errors

### Can't Login

**Symptoms:**
- "Username atau Password Salah"
- Login button doesn't work
- Redirects back to login

**Checks:**

**1. Verify credentials:**
```sql
sqlite3 sistem_pos.db "SELECT nama_pengguna, status_user FROM mediasoft_pengguna;"
```

Default: `admin` / `admin`

**2. Check user status:**
```sql
sqlite3 sistem_pos.db "SELECT * FROM mediasoft_pengguna WHERE nama_pengguna = 'admin';"
```

Status should be `'Aktif'`

**3. Check if locked (rate limiting):**
- Wait 15 minutes if you tried 5+ wrong passwords
- Or reset in database:
```sql
-- Note: Rate limiter is in-memory, restart app to reset
```

**4. Reset admin password:**
```sql
-- SHA1 hash of 'admin'
sqlite3 sistem_pos.db "UPDATE mediasoft_pengguna SET kata_sandi = 'd033e22ae348aeb5660fc2140aec35850c4da997' WHERE nama_pengguna = 'admin';"
```

---

### Account Locked

**Symptoms:**
- "Akun diblokir karena terlalu banyak percobaan login gagal"
- "Coba lagi dalam X menit"

**Cause:** 5 failed login attempts within 5 minutes.

**Solution:**
1. **Wait 15 minutes** - Lockout expires automatically
2. **Or restart the app** - Rate limiter is in-memory

**Prevent:**
- Use correct password
- Don't spam login attempts

---

## 💻 Application Errors

### App Won't Start

**Symptoms:**
- `npm run dev` fails
- Electron window doesn't open
- Console shows errors

**Checks:**

**1. Check dependencies:**
```bash
npm install
```

**2. Rebuild native modules:**
```bash
npx electron-rebuild
```

**3. Check Node version:**
```bash
node --version  # Should be v18+
```

**4. Check for port conflicts:**
```bash
# Kill process on port 5173 (Vite)
# Linux/Mac
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**5. Clear cache:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

### Error: NODE_MODULE_VERSION mismatch

**Full Error:**
```
Error: The module '.../better-sqlite3.node'
was compiled against a different Node.js version
```

**Cause:** Native modules need to be rebuilt for your Electron version.

**Solution:**
```bash
npx electron-rebuild
```

**Still failing?**
```bash
# Clean rebuild
rm -rf node_modules
npm install
npx electron-rebuild
```

---

### White Screen / Blank Page

**Symptoms:**
- App opens but shows white screen
- No content visible
- Console may show errors

**Checks:**

**1. Open DevTools:**
- Press `Ctrl+Shift+I` (Windows/Linux)
- Press `Cmd+Option+I` (Mac)
- Check Console for errors

**2. Check if Vite is running:**
```bash
# Should see "Local: http://localhost:5173"
npm run dev:vite
```

**3. Check database connection:**
```sql
sqlite3 sistem_pos.db ".tables"
```

**4. Check for JavaScript errors:**
- Look in DevTools Console
- Fix any import errors
- Check for missing files

---

## 🗄️ Database Errors

### Error: "no such table"

**Full Error:**
```
Error: no such table: mediasoft_customer
```

**Cause:** New tables haven't been created.

**Solution:**
```bash
# Run setup to create all tables
sqlite3 sistem_pos.db < SETUP_DATABASE.sql
```

**Or create manually:**
```bash
sqlite3 sistem_pos.db < CREATE_NEW_TABLES.sql
```

---

### Database Corrupted

**Symptoms:**
- "database disk image is malformed"
- Random errors
- Data missing

**Solution:**

**1. Restore from backup:**
```bash
cp sistem_pos_backup_*.db sistem_pos.db
```

**2. Try to recover:**
```bash
# Dump and recreate
sqlite3 sistem_pos.db ".dump" > dump.sql
mv sistem_pos.db sistem_pos_corrupted.db
sqlite3 sistem_pos_new.db < dump.sql
mv sistem_pos_new.db sistem_pos.db
```

**3. Check integrity:**
```sql
sqlite3 sistem_pos.db "PRAGMA integrity_check;"
```

---

## 📦 Dependency Errors

### npm install fails

**Symptoms:**
- Errors during `npm install`
- Missing packages
- Version conflicts

**Solutions:**

**1. Clear cache:**
```bash
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

**2. Use specific npm version:**
```bash
npm install -g npm@9
npm install
```

**3. Check Node version:**
```bash
node --version  # Should be v18+
```

**4. Install with legacy peer deps:**
```bash
npm install --legacy-peer-deps
```

---

### bcrypt installation fails

**Symptoms:**
- Error installing bcrypt
- "node-gyp" errors
- Build failures

**Solutions:**

**Windows:**
```bash
# Install build tools
npm install --global windows-build-tools

# Then install bcrypt
npm install bcrypt
```

**Linux:**
```bash
# Install build essentials
sudo apt-get install build-essential

# Then install bcrypt
npm install bcrypt
```

**Mac:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Then install bcrypt
npm install bcrypt
```

---

## 🎨 Frontend Errors

### Component not found

**Symptoms:**
- "Cannot find module './components/...'"
- Import errors
- TypeScript errors

**Solutions:**

**1. Check file exists:**
```bash
ls -la src/renderer/components/
```

**2. Check import path:**
```tsx
// Correct
import { Button } from '../components/Button'

// Wrong
import { Button } from './components/Button'  // Wrong relative path
```

**3. Check file extension:**
```tsx
// TypeScript files should be .tsx or .ts
Button.tsx  ✓
Button.jsx  ✗ (should be .tsx)
```

---

### Dark mode not working

**Symptoms:**
- Theme doesn't change
- Stuck in light/dark mode
- Colors wrong

**Solutions:**

**1. Check ThemeContext:**
```tsx
// Make sure app is wrapped with ThemeProvider
<ThemeProvider>
  <App />
</ThemeProvider>
```

**2. Check localStorage:**
```javascript
// In DevTools Console
localStorage.getItem('theme')
localStorage.setItem('theme', 'dark')
```

**3. Check Tailwind config:**
```javascript
// tailwind.config.js
darkMode: 'class'  // Should be 'class' not 'media'
```

---

## 🔍 Debugging Tips

### Enable Verbose Logging

**Backend:**
```typescript
// In main process
console.log('Debug:', data)
```

**Frontend:**
```typescript
// In renderer process
console.log('Debug:', data)
```

**Database:**
```sql
-- Enable query logging
PRAGMA query_only = OFF;
```

---

### Check Error Logs

**Location:**
```
logs/error-YYYY-MM-DD.log
```

**View recent errors:**
```bash
tail -f logs/error-$(date +%Y-%m-%d).log
```

---

### Check Activity Logs

```sql
sqlite3 sistem_pos.db "SELECT * FROM mediasoft_activity_log ORDER BY tgl_aktivitas DESC LIMIT 10;"
```

---

### Use DevTools

**Open DevTools:**
- `Ctrl+Shift+I` (Windows/Linux)
- `Cmd+Option+I` (Mac)

**Useful tabs:**
- **Console** - JavaScript errors
- **Network** - API calls
- **Application** - localStorage, cookies
- **Sources** - Debugging with breakpoints

---

## 📞 Getting More Help

### 1. Check Documentation
- `SETUP_GUIDE.md` - Setup issues
- `SETUP_NOTES.md` - Expected warnings
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Security issues
- `QUICK_REFERENCE.md` - Quick lookups

### 2. Check Logs
- `logs/error-*.log` - Error logs
- Database activity logs
- Console output

### 3. Check Database
```sql
-- Check tables
.tables

-- Check schema
.schema mediasoft_pengguna

-- Check data
SELECT * FROM mediasoft_pengguna LIMIT 1;
```

### 4. Search Issues
- Check if similar issue exists
- Look for error message in docs
- Check GitHub issues (if applicable)

---

## ✅ Prevention Checklist

To avoid common issues:

- [ ] Always backup before making changes
- [ ] Run setup scripts in correct order
- [ ] Keep dependencies up to date
- [ ] Rebuild native modules after updates
- [ ] Check logs regularly
- [ ] Test after each change
- [ ] Use version control (git)
- [ ] Document custom changes

---

**Last Updated:** 2026-04-28
**Version:** 4.0.0

**Still stuck? Check `SETUP_GUIDE.md` or `SETUP_NOTES.md`**
