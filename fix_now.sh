#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  MediaSoft POS - Database Fix Script                      ║"
echo "║  Fixing: missing password_hash_type column                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if database exists
if [ ! -f "sistem_pos.db" ]; then
    echo "❌ Error: sistem_pos.db not found!"
    exit 1
fi

# Function to check if database is locked
check_lock() {
    lsof sistem_pos.db > /dev/null 2>&1
    return $?
}

# Check for locks
if check_lock; then
    echo "⚠️  Database is currently locked by:"
    lsof sistem_pos.db | tail -n +2 | while read line; do
        CMD=$(echo $line | awk '{print $1}')
        PID=$(echo $line | awk '{print $2}')
        echo "   • $CMD (PID: $PID)"
    done
    echo ""
    echo "I can close these for you (may lose unsaved data)"
    read -p "Close them automatically? (y/N): " answer
    
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo ""
        echo "Closing processes..."
        lsof sistem_pos.db | tail -n +2 | awk '{print $2}' | xargs -r kill -9 2>/dev/null
        sleep 1
        
        if check_lock; then
            echo "❌ Failed to close all processes. Please close them manually."
            exit 1
        fi
        echo "✅ Processes closed"
    else
        echo ""
        echo "Please close the apps manually and run this script again."
        exit 0
    fi
fi

echo ""
echo "🔧 Running migration..."
echo ""

# Try to add the column
RESULT=$(sqlite3 sistem_pos.db "ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';" 2>&1)

if [ $? -eq 0 ]; then
    # Success - update existing records
    sqlite3 sistem_pos.db "UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;" 2>/dev/null
    echo "✅ Column added successfully!"
elif echo "$RESULT" | grep -q "duplicate column"; then
    echo "✅ Column already exists!"
else
    echo "❌ Error: $RESULT"
    exit 1
fi

echo ""
echo "🔍 Verifying..."

# Verify column exists
if sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);" | grep -q "password_hash_type"; then
    echo "✅ password_hash_type column confirmed"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  ✅ FIX COMPLETE!                                          ║"
    echo "║                                                            ║"
    echo "║  You can now restart your Electron app.                   ║"
    echo "║  The login error should be resolved.                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
else
    echo "❌ Column verification failed"
    echo ""
    echo "Current schema:"
    sqlite3 sistem_pos.db "PRAGMA table_info(mediasoft_pengguna);"
    exit 1
fi
