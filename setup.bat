@echo off
REM MediaSoft POS - Setup Script for Windows
REM This script sets up the database and installs dependencies

echo ================================================
echo MediaSoft POS - Setup Script
echo ================================================
echo.

REM Check if database exists
if not exist "sistem_pos.db" (
    echo [ERROR] Database file not found: sistem_pos.db
    echo Please make sure sistem_pos.db exists in the current directory
    pause
    exit /b 1
)

echo [OK] Database file found
echo.

REM Backup database
echo Creating backup of database...
set BACKUP_FILE=sistem_pos_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.db
set BACKUP_FILE=%BACKUP_FILE: =0%
copy sistem_pos.db "%BACKUP_FILE%" >nul
echo [OK] Backup created: %BACKUP_FILE%
echo.

REM Run database setup
echo Running database setup...
sqlite3 sistem_pos.db < SETUP_DATABASE.sql
if %errorlevel% neq 0 (
    echo [ERROR] Database setup failed
    echo Restoring from backup...
    copy "%BACKUP_FILE%" sistem_pos.db >nul
    echo Database restored from backup
    pause
    exit /b 1
)
echo [OK] Database setup completed successfully
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Rebuild native modules
echo Rebuilding native modules...
call npx electron-rebuild
if %errorlevel% neq 0 (
    echo [WARNING] Failed to rebuild native modules
    echo You may need to run 'npx electron-rebuild' manually
)
echo [OK] Native modules rebuilt
echo.

REM Show migration status
echo ================================================
echo Database Migration Status
echo ================================================
sqlite3 sistem_pos.db "SELECT 'Total Users: ' || COUNT(*) FROM mediasoft_pengguna;"
sqlite3 sistem_pos.db "SELECT 'Migrated to bcrypt: ' || SUM(CASE WHEN password_hash_type = 'bcrypt' THEN 1 ELSE 0 END) FROM mediasoft_pengguna;"
sqlite3 sistem_pos.db "SELECT 'Pending migration: ' || SUM(CASE WHEN password_hash_type = 'sha1' OR password_hash_type IS NULL THEN 1 ELSE 0 END) FROM mediasoft_pengguna;"
echo.

REM Show index count
echo ================================================
echo Database Indexes
echo ================================================
sqlite3 sistem_pos.db "SELECT 'Total indexes created: ' || COUNT(*) FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%%';"
echo.

echo ================================================
echo [OK] Setup completed successfully!
echo ================================================
echo.
echo Next steps:
echo 1. Run 'npm run dev' to start development server
echo 2. Login with default credentials (admin/admin)
echo 3. Change your password immediately
echo 4. Check SECURITY_IMPLEMENTATION_GUIDE.md for details
echo.
echo Backup file saved as: %BACKUP_FILE%
echo Keep this backup in case you need to restore
echo.
pause
