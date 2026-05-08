import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  id: {
    translation: {
      // Common
      'common.save': 'Simpan',
      'common.cancel': 'Batal',
      'common.delete': 'Hapus',
      'common.edit': 'Edit',
      'common.add': 'Tambah',
      'common.search': 'Cari',
      'common.loading': 'Memuat...',
      'common.success': 'Berhasil',
      'common.error': 'Gagal',
      
      // Menu
      'menu.dashboard': 'Dashboard',
      'menu.products': 'Produk',
      'menu.transactions': 'Transaksi',
      'menu.customers': 'Customer',
      'menu.reports': 'Laporan',
      'menu.settings': 'Pengaturan',
      
      // Products
      'products.title': 'Manajemen Produk',
      'products.add': 'Tambah Produk',
      'products.name': 'Nama Produk',
      'products.price': 'Harga',
      'products.stock': 'Stok',
      'products.category': 'Kategori',
    },
  },
  en: {
    translation: {
      // Common
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.search': 'Search',
      'common.loading': 'Loading...',
      'common.success': 'Success',
      'common.error': 'Error',
      
      // Menu
      'menu.dashboard': 'Dashboard',
      'menu.products': 'Products',
      'menu.transactions': 'Transactions',
      'menu.customers': 'Customers',
      'menu.reports': 'Reports',
      'menu.settings': 'Settings',
      
      // Products
      'products.title': 'Product Management',
      'products.add': 'Add Product',
      'products.name': 'Product Name',
      'products.price': 'Price',
      'products.stock': 'Stock',
      'products.category': 'Category',
    },
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'id', // default language
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
