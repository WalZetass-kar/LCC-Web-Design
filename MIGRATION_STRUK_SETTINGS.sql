-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Pengaturan Struk & QRIS
-- ═══════════════════════════════════════════════════════════════

-- Tabel pengaturan struk
CREATE TABLE IF NOT EXISTS mediasoft_struk_settings (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  show_logo         INTEGER DEFAULT 1,
  show_alamat       INTEGER DEFAULT 1,
  show_telepon      INTEGER DEFAULT 1,
  show_email        INTEGER DEFAULT 1,
  show_kasir        INTEGER DEFAULT 1,
  show_customer     INTEGER DEFAULT 1,
  footer_text       TEXT DEFAULT 'Terima kasih atas kunjungan Anda',
  qris_image        TEXT,
  qris_enabled      INTEGER DEFAULT 0,
  updated_at        TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO mediasoft_struk_settings (id, updated_at) 
VALUES (1, datetime('now'));

PRAGMA journal_mode=WAL;
