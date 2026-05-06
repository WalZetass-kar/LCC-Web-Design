-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: Create Demo User for FORCED DEMO MODE
-- ═══════════════════════════════════════════════════════════════════════
-- 
-- This creates a demo user with:
--   username: demo
--   password: demo (bcrypt hashed)
--   role: demo (hak_akses = 'demo')
--   status: Aktif
--
-- Run this SQL against your sistem_pos.db to enable demo login.
-- ═══════════════════════════════════════════════════════════════════════

-- Insert demo user (password = 'demo' hashed with bcrypt)
-- If the user already exists, update the role to 'demo'
INSERT INTO mediasoft_pengguna (
  nama_pengguna, 
  kata_sandi, 
  nama_lengkap, 
  hak_akses, 
  status_user, 
  password_hash_type,
  tgl_wkt_simpan
) VALUES (
  'demo',
  -- bcrypt hash of 'demo' — generated with cost factor 10
  '$2b$10$demoHashPlaceholder.replacewithreal',
  'Demo User',
  'demo',
  'Aktif',
  'bcrypt',
  datetime('now')
)
ON CONFLICT(nama_pengguna) DO UPDATE SET
  hak_akses = 'demo',
  status_user = 'Aktif',
  nama_lengkap = 'Demo User';

-- Verify the demo user was created
SELECT nama_pengguna, nama_lengkap, hak_akses, status_user, password_hash_type
FROM mediasoft_pengguna 
WHERE nama_pengguna = 'demo';
