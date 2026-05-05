# 🎨 Tema Warna - MediaSoft POS

## ✅ Fitur Tema Warna Tersedia

Aplikasi MediaSoft POS sekarang memiliki **6 pilihan tema warna** yang dapat dipilih di halaman **Pengaturan**.

## 🌈 Daftar Tema

1. **Indigo** (Default) - Biru keunguan profesional
2. **Emerald** - Hijau segar dan natural
3. **Rose** - Merah muda elegan
4. **Amber** - Kuning keemasan hangat
5. **Sky** - Biru langit cerah
6. **Pink Soft** ⭐ NEW - Pink lembut dan modern

## 📍 Cara Mengganti Tema

1. Buka aplikasi MediaSoft POS
2. Klik menu **⚙️ Pengaturan** di sidebar
3. Lihat bagian **"Tema Warna"** di atas
4. Klik salah satu warna yang diinginkan
5. Tema akan langsung berubah!

## 🎯 Fitur Tema

- ✅ **6 pilihan warna** yang berbeda
- ✅ **Langsung berubah** tanpa reload
- ✅ **Tersimpan otomatis** di localStorage
- ✅ **Konsisten** di semua halaman
- ✅ **Dark mode support** untuk semua tema
- ✅ **Gradient & glass effect** yang indah

## 🎨 Detail Warna Pink Soft

Tema **Pink Soft** menggunakan palet warna:
- Primary: `#ec4899` (Pink 500)
- Light: `#fdf2f8` (Pink 50)
- Dark: `#831843` (Pink 900)

Cocok untuk:
- Toko fashion wanita
- Toko kosmetik & kecantikan
- Toko aksesoris
- Bisnis yang target marketnya wanita

## 💡 Tips

- Gunakan **Dark Mode** untuk mengurangi kelelahan mata saat bekerja malam
- Pilih warna yang sesuai dengan **branding toko** Anda
- Tema **Pink Soft** memberikan kesan **feminin dan modern**
- Semua tema sudah dioptimalkan untuk **kontras** yang baik

## 🔧 Untuk Developer

Jika ingin menambahkan tema baru:

1. Tambahkan CSS di `src/renderer/styles/globals.css`:
```css
[data-theme="nama-tema"] {
  --color-primary-50: #...;
  --color-primary-100: #...;
  /* ... dst */
}
```

2. Update type di `src/renderer/contexts/ThemeContext.tsx`:
```typescript
export type ThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'pink' | 'nama-tema'
```

3. Tambahkan opsi di `src/renderer/pages/Settings.tsx`:
```typescript
{ key: 'nama-tema', label: 'Nama Tema', hex: '#...' }
```

---

**Update**: 5 Mei 2026  
**Developer**: MediaSoft POS Team
