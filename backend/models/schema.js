import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const mediasoftUsers = sqliteTable('mediasoft_pengguna', {
  username: text('nama_pengguna').primaryKey(),
  passwordHash: text('kata_sandi'),
  fullName: text('nama_lengkap'),
  createdAt: text('tgl_wkt_simpan'),
  updatedAt: text('tgl_wkt_edit'),
  statusUser: text('status_user'),
  lastLogin: text('terakhir_login')
});

export const mediasoftUserPermissions = sqliteTable('mediasoft_pengguna_hak_akses', {
  id: integer('id_hak_akses').primaryKey({ autoIncrement: true }),
  permissionCode: text('kd_hak'),
  status: text('status'),
  username: text('nama_pengguna')
});

export const mediasoftUnits = sqliteTable('mediasoft_satuan', {
  id: integer('kd_satuan').primaryKey({ autoIncrement: true }),
  name: text('nama_satuan')
});

export const mediasoftCategories = sqliteTable('mediasoft_kategori_barang', {
  id: integer('kd_kategori_barang').primaryKey({ autoIncrement: true }),
  name: text('kategori_barang')
});

export const mediasoftProducts = sqliteTable('mediasoft_barang', {
  id: text('kd_barang').primaryKey(),
  name: text('nama_barang'),
  createdAt: text('tgl_wkt_simpan'),
  updatedAt: text('tgl_wkt_ubah'),
  photo: text('foto_barang'),
  description: text('deskripsi_barang'),
  username: text('nama_pengguna'),
  stock: integer('stok'),
  unitId: integer('kd_satuan'),
  transactionType: text('jenis_transaksi'),
  categoryId: integer('kd_kategori_barang')
});

export const mediasoftPrices = sqliteTable('mediasoft_harga', {
  productId: text('kd_barang').primaryKey(),
  price: real('harga_barang'),
  discount: integer('potongan'),
  capitalPrice: real('harga_modal')
});

export const mediasoftSales = sqliteTable('mediasoft_penjualan', {
  id: text('kd_tansaksi_jual').primaryKey(),
  transactionDate: text('tgl_wkt_transaksi'),
  description: text('deskripsi'),
  username: text('username_transaksi'),
  totalQuantity: integer('total_qty'),
  subtotal: real('sub_total'),
  paymentAmount: real('yang_dibayar'),
  changeAmount: real('kembalian'),
  paymentMethod: text('jenis_pembayaran')
});

export const mediasoftSaleDetails = sqliteTable('mediasoft_penjualan_detail', {
  id: integer('kd_trans_jual_detail').primaryKey({ autoIncrement: true }),
  saleId: text('kd_tansaksi_jual'),
  productId: text('kd_barang'),
  capitalPrice: integer('harga_modal'),
  price: integer('harga_jual'),
  quantity: integer('qty'),
  discount: integer('disc'),
  discountAmount: real('harga_disc'),
  subtotal: real('total_harga_jual'),
  username: text('nama_pengguna'),
  createdAt: text('tgl_waktu_input')
});

export const mediasoftSuppliers = sqliteTable('mediasoft_supplier', {
  id: text('kd_suplier').primaryKey(),
  name: text('nama_suplier'),
  address: text('alamat_suplier'),
  phone: text('no_telp_hp'),
  createdAt: text('tgl_wkt_simpan'),
  updatedAt: text('tgl_wkt_edit'),
  username: text('nama_pengguna')
});

export const mediasoftStoreIdentity = sqliteTable('mediasoft_identitas', {
  id: integer('kode').primaryKey(),
  storeName: text('namatoko'),
  storeAddress: text('alamattoko'),
  storePhone: text('nomortelptoko'),
  ownerWhatsapp: text('nomorwaowner'),
  ownerEmail: text('alamatemailowner')
});
