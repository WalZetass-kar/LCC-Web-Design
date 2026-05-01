-- Security Migration SQL
-- Add password_hash_type column to pengguna table for password migration support

-- Add password_hash_type column (default to 'sha1' for existing users)
ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';

-- Update existing users to have sha1 hash type
UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;

-- Note: This migration maintains backward compatibility with existing SHA1 passwords
-- New users will use bcrypt by default
-- Existing users will be migrated to bcrypt on their next successful login
