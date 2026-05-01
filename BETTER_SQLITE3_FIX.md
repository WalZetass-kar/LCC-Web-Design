# 🔧 Better-SQLite3 Rebuild Guide

## ⚠️ Masalah

`better-sqlite3` adalah native module yang perlu di-compile untuk versi Node.js yang spesifik. Ada 2 environment berbeda:

1. **Node.js biasa** (v22.22.2) - MODULE_VERSION 127 - Untuk Kiro CLI
2. **Electron** (v30.0.6) - MODULE_VERSION 123 - Untuk aplikasi desktop

## 🔄 Solusi

### Untuk Menjalankan Aplikasi (Electron)

```bash
# 1. Rebuild untuk Electron
npm run rebuild:electron

# 2. Jalankan aplikasi
npm run dev
```

### Untuk Menjalankan Kiro CLI (Node.js)

```bash
# 1. Rebuild untuk Node.js
npm rebuild better-sqlite3

# 2. Jalankan CLI
node kiro-cli.cjs list
```

## 📝 Script NPM

Tambahkan script ini ke `package.json`:

```json
{
  "scripts": {
    "rebuild:electron": "./node_modules/.bin/electron-rebuild -f -w better-sqlite3",
    "rebuild:node": "npm rebuild better-sqlite3",
    "postinstall": "npm run rebuild:electron"
  }
}
```

## 🚀 Workflow

### Development Workflow

1. **Pertama kali clone/install**:
   ```bash
   npm install
   # Otomatis run postinstall (rebuild:electron)
   ```

2. **Saat mau jalankan aplikasi**:
   ```bash
   npm run dev
   # Jika error, run: npm run rebuild:electron
   ```

3. **Saat mau pakai Kiro CLI**:
   ```bash
   npm run rebuild:node
   node kiro-cli.cjs list
   ```

4. **Setelah pakai CLI, mau jalankan app lagi**:
   ```bash
   npm run rebuild:electron
   npm run dev
   ```

## 🛠️ Manual Rebuild

### Rebuild untuk Electron

```bash
# Method 1: Menggunakan electron-rebuild
./node_modules/.bin/electron-rebuild -f -w better-sqlite3

# Method 2: Menggunakan script
./rebuild-for-electron.sh
```

### Rebuild untuk Node.js

```bash
# Method 1: npm rebuild
npm rebuild better-sqlite3

# Method 2: Build from source
cd node_modules/better-sqlite3
npm run build-release
cd ../..
```

## 🔍 Troubleshooting

### Error: MODULE_VERSION mismatch

```
Error: The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires
NODE_MODULE_VERSION 123.
```

**Solusi**: Rebuild untuk environment yang benar
- Jika error saat `npm run dev` → `npm run rebuild:electron`
- Jika error saat `node kiro-cli.cjs` → `npm run rebuild:node`

### Error: Cannot find module 'better_sqlite3.node'

```bash
# Reinstall better-sqlite3
npm uninstall better-sqlite3
npm install better-sqlite3
npm run rebuild:electron  # atau rebuild:node
```

### Error: gyp ERR! build error

```bash
# Install build tools
sudo apt-get install build-essential python3

# Reinstall
npm install better-sqlite3 --build-from-source
```

## 📊 Version Info

| Environment | Node Version | MODULE_VERSION | Command |
|-------------|--------------|----------------|---------|
| Node.js CLI | v22.22.2 | 127 | `npm run rebuild:node` |
| Electron App | v30.0.6 (Node v20.x) | 123 | `npm run rebuild:electron` |

## 💡 Tips

1. **Selalu rebuild setelah `npm install`**
   - Tambahkan `postinstall` script

2. **Gunakan script npm, bukan manual**
   - Lebih konsisten dan mudah

3. **Dokumentasikan di README**
   - Agar tim tahu cara rebuild

4. **Jangan commit `node_modules`**
   - Setiap developer rebuild sendiri

## 🎯 Best Practice

### Setup Project Baru

```bash
# 1. Clone repository
git clone <repo-url>
cd <project-dir>

# 2. Install dependencies
npm install

# 3. Rebuild untuk Electron (otomatis via postinstall)
# Atau manual: npm run rebuild:electron

# 4. Jalankan aplikasi
npm run dev
```

### Daily Development

```bash
# Jalankan aplikasi
npm run dev

# Jika perlu pakai CLI
npm run rebuild:node
node kiro-cli.cjs list

# Kembali ke aplikasi
npm run rebuild:electron
npm run dev
```

## 📚 Resources

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [electron-rebuild Documentation](https://github.com/electron/rebuild)
- [Node.js Native Addons](https://nodejs.org/api/addons.html)

---

**Last Updated**: 2026-05-01
**Status**: ✅ Documented
