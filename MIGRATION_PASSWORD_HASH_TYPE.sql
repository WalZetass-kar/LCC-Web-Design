-- Migration: Add password_hash_type column to mediasoft_pengguna table
-- This migration adds support for bcrypt password hashing while maintaining backward compatibility with SHA1

-- Add password_hash_type column (default to 'sha1' for existing users)
ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';

-- Update existing users to have 'sha1' hash type
UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;

-- Verify migration
SELECT 
    nama_pengguna,
    password_hash_type,
    CASE 
        WHEN password_hash_type = 'sha1' THEN 'Legacy SHA1 - Will migrate on next login'
        WHEN password_hash_type = 'bcrypt' THEN 'Secure bcrypt'
        ELSE 'Unknown'
    END as status
FROM mediasoft_pengguna;
