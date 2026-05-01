-- Migration: Menambahkan kolom hak_akses dan migrasi dari role
-- Sesuai dengan struktur database MediaSoft asli

-- 1. Tambahkan kolom hak_akses
ALTER TABLE mediasoft_pengguna ADD COLUMN hak_akses TEXT DEFAULT 'kasir';

-- 2. Migrasi data dari role ke hak_akses (lowercase)
UPDATE mediasoft_pengguna SET hak_akses = LOWER(role) WHERE role IS NOT NULL;

-- 3. Mapping role yang spesifik
UPDATE mediasoft_pengguna SET hak_akses = 'admin' WHERE LOWER(role) = 'admin';
UPDATE mediasoft_pengguna SET hak_akses = 'kasir' WHERE LOWER(role) = 'kasir';
UPDATE mediasoft_pengguna SET hak_akses = 'operator' WHERE LOWER(role) = 'operator';
UPDATE mediasoft_pengguna SET hak_akses = 'developer' WHERE LOWER(role) = 'developer';
UPDATE mediasoft_pengguna SET hak_akses = 'superadmin' WHERE LOWER(role) IN ('superadmin', 'owner', 'superman');

-- 4. Verifikasi hasil migrasi
SELECT 
    nama_pengguna,
    nama_lengkap,
    role AS role_lama,
    hak_akses AS hak_akses_baru,
    status_user
FROM mediasoft_pengguna
ORDER BY nama_pengguna;

-- CATATAN:
-- Setelah migrasi berhasil dan aplikasi sudah menggunakan hak_akses,
-- kolom 'role' bisa dihapus dengan:
-- ALTER TABLE mediasoft_pengguna DROP COLUMN role;
-- (Tapi SQLite tidak support DROP COLUMN, jadi biarkan saja)
