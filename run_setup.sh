#!/bin/bash

echo "================================================"
echo "MediaSoft POS - Quick Database Setup"
echo "================================================"
echo ""

# Check if database is locked
if lsof sistem_pos.db 2>/dev/null; then
    echo "⚠️  Database is currently in use!"
    echo ""
    echo "Please:"
    echo "1. Stop the application (Ctrl+C in the terminal running 'npm run dev')"
    echo "2. Wait 5 seconds"
    echo "3. Run this script again"
    echo ""
    exit 1
fi

echo "✓ Database is not locked"
echo ""

# Backup database
echo "Creating backup..."
BACKUP_FILE="sistem_pos_backup_$(date +%Y%m%d_%H%M%S).db"
cp sistem_pos.db "$BACKUP_FILE"
echo "✓ Backup created: $BACKUP_FILE"
echo ""

# Run setup
echo "Running database setup..."
echo "(You will see some 'duplicate column' warnings - this is normal)"
echo ""

sqlite3 sistem_pos.db < SETUP_DATABASE.sql 2>&1 | grep -v "duplicate column name"

echo ""
echo "================================================"
echo "✓ Setup Complete!"
echo "================================================"
echo ""
echo "Verification:"
sqlite3 sistem_pos.db "SELECT COUNT(*) as total_tables FROM sqlite_master WHERE type = 'table' AND name LIKE 'mediasoft_%';" | sed 's/^/  Tables: /'
sqlite3 sistem_pos.db "SELECT COUNT(*) as total_indexes FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%';" | sed 's/^/  Indexes: /'
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Login with: admin / admin"
echo "3. Your password will auto-migrate to bcrypt"
echo ""
