# Fitur Pengaturan Struk & QRIS

## 📋 Deskripsi
Fitur untuk mengatur tampilan struk transaksi dan menambahkan QRIS untuk pembayaran.

## 🎯 Fitur Utama

### 1. Pengaturan Tampilan Struk
- ✅ Toggle tampilkan/sembunyikan logo toko
- ✅ Toggle tampilkan/sembunyikan alamat
- ✅ Toggle tampilkan/sembunyikan telepon
- ✅ Toggle tampilkan/sembunyikan email
- ✅ Toggle tampilkan/sembunyikan nama kasir
- ✅ Toggle tampilkan/sembunyikan nama customer
- ✅ Custom teks footer struk

### 2. QRIS Payment
- ✅ Upload gambar QR Code QRIS
- ✅ Toggle aktif/nonaktif QRIS
- ✅ Preview gambar QRIS
- ✅ Hapus gambar QRIS
- ✅ Validasi ukuran file (max 2MB)
- ✅ Support format: PNG, JPG, JPEG

## 🔐 Keamanan
- ❌ **Akun DEMO tidak bisa mengakses** fitur ini
- ✅ Semua akun lain (admin, kasir, dll) bisa mengakses
- ✅ Validasi di backend (demoGuard)
- ✅ Validasi di frontend (blockAction)

## 📂 File yang Dibuat/Dimodifikasi

### Backend:
1. `MIGRATION_STRUK_SETTINGS.sql` - Database migration
2. `src/backend/controllers/StrukSettingsController.ts` - Controller
3. `src/main/ipcHandlers.ts` - IPC handlers
4. `src/backend/middleware/demoGuardV2.ts` - Demo guard
5. `src/main/preload.cjs` - Whitelist channels

### Frontend:
1. `src/renderer/components/StrukSettingsModal.tsx` - Modal component
2. `src/renderer/pages/Transaksi.tsx` - Tambah tombol pengaturan
3. `src/shared/types.ts` - Type definitions

## 🚀 Cara Menggunakan

### 1. Akses Pengaturan
- Buka halaman **Transaksi** (F1)
- Klik icon **⚙️ Settings** di header Keranjang
- Modal pengaturan akan terbuka

### 2. Atur Tampilan Struk
- Centang/uncheck opsi yang diinginkan
- Edit teks footer sesuai kebutuhan
- Klik **Simpan**

### 3. Upload QRIS
- Klik area upload atau drag & drop gambar
- Pilih file gambar QR Code QRIS
- Aktifkan toggle "Aktifkan QRIS"
- Klik **Simpan**

### 4. Hapus QRIS
- Klik tombol **🗑️ Hapus** di pojok gambar QRIS
- Konfirmasi penghapusan

## 🗄️ Database Schema

```sql
CREATE TABLE mediasoft_struk_settings (
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
```

## 📡 IPC Channels

### Read (Semua user):
- `strukSettings:get` - Get pengaturan struk

### Write (Blocked untuk demo):
- `strukSettings:update` - Update pengaturan
- `strukSettings:uploadQris` - Upload gambar QRIS
- `strukSettings:removeQris` - Hapus gambar QRIS

## 🎨 UI/UX Features
- ✅ Modal responsive
- ✅ Dark mode support
- ✅ Loading states
- ✅ Toast notifications
- ✅ Image preview
- ✅ Drag & drop upload
- ✅ File validation
- ✅ Smooth animations

## 🧪 Testing

### Test Case 1: Akun Demo
1. Login sebagai demo
2. Buka Transaksi → Klik Settings
3. Coba ubah pengaturan → **Harus diblokir**
4. Toast error muncul

### Test Case 2: Akun Admin
1. Login sebagai admin
2. Buka Transaksi → Klik Settings
3. Ubah pengaturan → **Berhasil disimpan**
4. Upload QRIS → **Berhasil**

### Test Case 3: Upload QRIS
1. Upload file > 2MB → **Error**
2. Upload file bukan gambar → **Error**
3. Upload gambar valid → **Berhasil**
4. Preview gambar muncul

## 📝 Notes
- Pengaturan disimpan per aplikasi (bukan per user)
- QRIS image disimpan sebagai base64 di database
- Hanya 1 row di tabel (id = 1)
- Restart tidak diperlukan setelah update

## 🔄 Future Improvements
- [ ] Multiple QRIS per metode pembayaran
- [ ] Template struk custom
- [ ] Export/import pengaturan
- [ ] Preview struk real-time
- [ ] Custom logo upload
