# 🚀 MediaSoft POS - Quick Start Card

```
╔══════════════════════════════════════════════════════════════╗
║           MEDIASOFT POS - QUICK START GUIDE                  ║
╚══════════════════════════════════════════════════════════════╝

📋 LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Username: admin          Password: admin123      (Admin)
Username: Developer      Password: dev123        (Developer)
Username: OP             Password: operator123   (Operator)
Username: KASIR          Password: kasir123      (Kasir)
Username: superadmin     Password: super123      (Super Admin)

🚀 START APPLICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$ npm install
$ npm run rebuild:electron
$ npm run dev

🛠️ KIRO CLI COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$ npm run rebuild:node              # Rebuild first!
$ node kiro-cli.cjs list            # List all users
$ node kiro-cli.cjs reset admin admin123  # Reset password
$ node kiro-cli.cjs create kasir2 kasir123 "Kasir Dua" kasir
$ node kiro-cli.cjs info            # Database info
$ node kiro-cli.cjs help            # Show help

⚠️ IMPORTANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Rebuild untuk Electron: npm run rebuild:electron
• Rebuild untuk Node.js:  npm run rebuild:node
• Selalu rebuild setelah npm install
• Jangan lupa logout setelah selesai

📚 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN_CREDENTIALS.md          - All login info
KIRO_CLI_README.md            - CLI documentation
BETTER_SQLITE3_FIX.md         - Rebuild guide
FINAL_COMPLETE_SUMMARY.md     - Complete summary

🎯 HAK AKSES LEVELS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
developer   → Full access + dev tools
superadmin  → Full access
admin       → Manage users, products, reports
operator    → Manage products, transactions
kasir       → Basic POS operations (default)

🔧 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: MODULE_VERSION mismatch
→ Run: npm run rebuild:electron (for app)
→ Run: npm run rebuild:node (for CLI)

Cannot login
→ Reset password: node kiro-cli.cjs reset admin admin123

Database locked
→ Close all apps using database
→ Restart application

📞 QUICK HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read: FINAL_COMPLETE_SUMMARY.md
CLI:  node kiro-cli.cjs help
Docs: Check all .md files in root directory

╔══════════════════════════════════════════════════════════════╗
║  Status: ✅ Ready to Use  |  Version: 1.0.0  |  2026-05-01  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Print-Friendly Version

### LOGIN CREDENTIALS

| Username | Password | Hak Akses |
|----------|----------|-----------|
| admin | admin123 | admin |
| Developer | dev123 | developer |
| OP | operator123 | operator |
| KASIR | kasir123 | kasir |
| superadmin | super123 | superadmin |

### QUICK COMMANDS

```bash
# Start App
npm run rebuild:electron && npm run dev

# Use CLI
npm run rebuild:node && node kiro-cli.cjs list

# Reset Password
node kiro-cli.cjs reset admin admin123
```

### DOCUMENTATION FILES

- `LOGIN_CREDENTIALS.md` - Login info
- `KIRO_CLI_README.md` - CLI guide
- `BETTER_SQLITE3_FIX.md` - Rebuild guide
- `FINAL_COMPLETE_SUMMARY.md` - Complete summary

---

**💡 Tip**: Bookmark this file for quick reference!
