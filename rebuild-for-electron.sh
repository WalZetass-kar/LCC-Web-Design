#!/bin/bash

echo "🔧 Rebuilding better-sqlite3 for Electron..."

# Remove existing build
rm -rf node_modules/better-sqlite3/build

# Rebuild for Electron
./node_modules/.bin/electron-rebuild -f -w better-sqlite3

echo "✅ Rebuild complete!"
echo ""
echo "Now you can run: npm run dev"
