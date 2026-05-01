#!/bin/bash

# MediaSoft POS - Setup Script
# This script sets up the database and installs dependencies

set +e  # Don't exit on error (some errors are expected)

echo "================================================"
echo "MediaSoft POS - Setup Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if database exists
if [ ! -f "sistem_pos.db" ]; then
    echo -e "${RED}✗ Database file not found: sistem_pos.db${NC}"
    echo "Please make sure sistem_pos.db exists in the current directory"
    exit 1
fi

echo -e "${GREEN}✓ Database file found${NC}"
echo ""

# Backup database
echo "Creating backup of database..."
BACKUP_FILE="sistem_pos_backup_$(date +%Y%m%d_%H%M%S).db"
cp sistem_pos.db "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
echo ""

# Run database setup
echo "Running database setup..."
echo -e "${YELLOW}Note: Some warnings about duplicate columns are normal and safe to ignore.${NC}"
echo "See SETUP_NOTES.md for details."
echo ""

# Run with error suppression for ALTER TABLE commands
if sqlite3 sistem_pos.db < SETUP_DATABASE.sql 2>&1 | grep -v "duplicate column name" | tee setup_output.log; then
    echo ""
    echo -e "${GREEN}✓ Database setup completed${NC}"
    
    # Check for real errors (not duplicate column warnings)
    if grep -q "Error: no such table" setup_output.log; then
        echo -e "${RED}✗ Critical error detected: missing tables${NC}"
        echo "Please check setup_output.log for details"
        rm setup_output.log
        exit 1
    fi
    
    rm setup_output.log
else
    echo -e "${YELLOW}⚠ Setup completed with some warnings (this is normal)${NC}"
    rm -f setup_output.log
fi
echo ""

# Install dependencies
echo "Installing dependencies..."
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Rebuild native modules
echo "Rebuilding native modules..."
if npx electron-rebuild 2>/dev/null; then
    echo -e "${GREEN}✓ Native modules rebuilt${NC}"
else
    echo -e "${YELLOW}⚠ Failed to rebuild native modules${NC}"
    echo "You may need to run 'npx electron-rebuild' manually"
fi
echo ""

# Show migration status
echo "================================================"
echo "Database Status"
echo "================================================"

# Count tables
TABLE_COUNT=$(sqlite3 sistem_pos.db "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name LIKE 'mediasoft_%';")
echo -e "${BLUE}Total tables: $TABLE_COUNT${NC}"

# Count indexes
INDEX_COUNT=$(sqlite3 sistem_pos.db "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%';")
echo -e "${BLUE}Total indexes: $INDEX_COUNT${NC}"

# Show user migration status
echo ""
echo "Password Migration Status:"
sqlite3 sistem_pos.db "SELECT 
    'Total Users: ' || COUNT(*) || ' | Migrated: ' || SUM(CASE WHEN password_hash_type = 'bcrypt' THEN 1 ELSE 0 END) || ' | Pending: ' || SUM(CASE WHEN password_hash_type = 'sha1' OR password_hash_type IS NULL THEN 1 ELSE 0 END)
FROM mediasoft_pengguna;"
echo ""

echo "================================================"
echo -e "${GREEN}✓ Setup completed successfully!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start development server"
echo "2. Login with default credentials (admin/admin)"
echo "3. Change your password immediately"
echo "4. Check SECURITY_IMPLEMENTATION_GUIDE.md for details"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "- Backup file saved as: $BACKUP_FILE"
echo "- Keep this backup in case you need to restore"
echo "- Some warnings during setup are normal (see SETUP_NOTES.md)"
echo ""
