const Database = require('better-sqlite3');
const path = require('path');

// Buka database
const dbPath = path.join(__dirname, 'sistem_pos.db');
const db = new Database(dbPath);

// Fungsi untuk generate URL gambar berdasarkan nama produk
function generateImageUrl(namaBarang) {
  // Menggunakan UI Avatars untuk generate gambar dengan nama produk
  // Background random berdasarkan nama
  const colors = ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899', '06B6D4'];
  const hash = namaBarang.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgColor = colors[hash % colors.length];
  
  // Ambil 2 huruf pertama dari nama produk
  const initials = namaBarang
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=${bgColor}&color=fff&bold=true&format=svg`;
}

try {
  console.log('🔄 Memulai proses pengisian gambar produk...\n');
  
  // Ambil semua produk yang belum punya gambar
  const products = db.prepare(`
    SELECT kd_barang, nama_barang, foto_barang 
    FROM mediasoft_barang 
    WHERE foto_barang IS NULL OR foto_barang = ''
  `).all();
  
  console.log(`📦 Ditemukan ${products.length} produk tanpa gambar\n`);
  
  if (products.length === 0) {
    console.log('✅ Semua produk sudah memiliki gambar!');
    db.close();
    process.exit(0);
  }
  
  // Update setiap produk dengan gambar
  const updateStmt = db.prepare(`
    UPDATE mediasoft_barang 
    SET foto_barang = ? 
    WHERE kd_barang = ?
  `);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const product of products) {
    try {
      const imageUrl = generateImageUrl(product.nama_barang);
      updateStmt.run(imageUrl, product.kd_barang);
      successCount++;
      console.log(`✅ ${product.kd_barang} - ${product.nama_barang}`);
      console.log(`   🖼️  ${imageUrl}\n`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error pada ${product.kd_barang}: ${error.message}\n`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RINGKASAN:');
  console.log(`   ✅ Berhasil: ${successCount} produk`);
  console.log(`   ❌ Gagal: ${errorCount} produk`);
  console.log('='.repeat(60));
  
  db.close();
  console.log('\n✨ Selesai! Database telah ditutup.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  db.close();
  process.exit(1);
}
