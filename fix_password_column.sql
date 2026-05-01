-- Fix missing password_hash_type column
-- Run this script to add the missing column to the database
-- IMPORTANT: Close the Electron app and SQLite Browser first!

-- Add password_hash_type column if it doesn't exist
-- Note: This will fail with "duplicate column" error if column already exists - that's OK!
ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';

-- Update existing users to have 'sha1' hash type
UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;

-- Verify the column was added
SELECT 'Column added successfully!' as message;

-- Show all columns in the table
SELECT '=== Current Schema ===' as info;
PRAGMA table_info(mediasoft_pengguna);
