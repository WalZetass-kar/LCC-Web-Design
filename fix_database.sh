#!/bin/bash

echo "🔧 Database Migration Script"
echo "=============================="
echo ""

# Check if database file exists
if [ ! -f "sistem_pos.db" ]; then
    echo "❌ Error: sistem_pos.db not found!"
    echo "Make sure you're running this from the project root directory."
    exit 1
fi

# Check if database is locked
if lsof sistem_pos.db > /dev/null 2>&1; then
    echo "⚠️  WARNING: Database is currently in use by:"
    lsof sistem_pos.db | tail -n +2 | awk '{print "   - " $1 " (PID: " $2 ")"}'
    echo ""
    echo "Please close:"
    echo "  1. The Electron/POS app"
    echo "  2. SQLite Browser (if open)"
    echo ""
    read -p "Press Enter after closing all apps, or Ctrl+C to cancel..."
    echo ""
fi

# Run the migration
echo "Running migration..."
echo ""

if sqlite3 sistem_pos.db < fix_password_column.sql 2>&1; then
    echo ""
    echo "✅ Migration completed!"
    echo ""
    echo "Verifying column exists..."
    if sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);" | grep -q "password_hash_type"; then
        echo "✓ password_hash_type column confirmed"
        echo ""
        echo "You can now restart your Electron app!"
    else
        echo "⚠️  Column verification failed"
        echo "Please check the output above for errors"
    fi
else
    ERROR_MSG=$?
    echo ""
    if echo "$ERROR_MSG" | grep -q "duplicate column"; then
        echo "✓ Column already exists! You can restart your app."
    else
        echo "❌ Migration failed. Check the error above."
        exit 1
    fi
fi
