# Cara Mengakses Aplikasi

## PENTING: Development vs Production

### Untuk Developer (Anda Sekarang)
Anda sedang dalam **mode development** menggunakan browser.
- URL: http://localhost:5173/
- Menggunakan Mock API (data in-memory)
- Perlu menjalankan `npm run dev`

### Untuk User Akhir (Nanti)
User akan menggunakan **aplikasi desktop** (.exe/.dmg/.AppImage).
- Tidak perlu browser
- Tidak perlu npm atau terminal
- Database SQLite real
- Tinggal double-click aplikasi
- Lihat **PANDUAN_BUILD.md** untuk cara build

---

## Aplikasi Sudah Berjalan (Development Mode)

Server development sudah aktif di: **http://localhost:5173/**

## Jika Layar Putih / Blank

Ini kemungkinan karena browser cache menyimpan tema lama yang sudah tidak ada. Lakukan langkah berikut:

### Solusi 1: Hard Refresh Browser
1. Buka http://localhost:5173/
2. Tekan **Ctrl + Shift + R** (Linux/Windows) atau **Cmd + Shift + R** (Mac)
3. Atau tekan **Ctrl + F5**

### Solusi 2: Clear Browser Cache
1. Buka Developer Tools (F12)
2. Klik kanan pada tombol refresh
3. Pilih "Empty Cache and Hard Reload"

### Solusi 3: Clear LocalStorage
1. Buka Developer Tools (F12)
2. Buka tab "Console"
3. Ketik: `localStorage.clear()`
4. Tekan Enter
5. Refresh halaman (F5)

### Solusi 4: Gunakan Incognito/Private Mode
1. Buka browser dalam mode incognito/private
2. Akses http://localhost:5173/

## Kredensial Login

Setelah aplikasi muncul, gunakan:

**Admin:**
- Username: `admin`
- Password: `admin123`

**Kasir:**
- Username: `kasir1`
- Password: `kasir123`

## Perubahan yang Sudah Dilakukan

1. Semua emoji dihapus dari projek
2. Tema diubah menjadi lebih profesional dan soft
3. Warna lebih lembut (opacity 20% untuk effects)
4. 6 tema baru:
   - Professional Blue
   - Elegant Purple
   - Modern Green
   - Classic Slate
   - Corporate Indigo
   - Business Teal

## Jika Masih Bermasalah

Restart development server:
```bash
# Stop server (Ctrl + C)
# Kemudian jalankan lagi:
npm run dev
```

Atau hapus node_modules dan reinstall:
```bash
rm -rf node_modules
npm install
npm run dev
```
