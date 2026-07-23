import { CommerceModel } from '../models/CommerceModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class CommerceController {
  // ─── STOREFRONT SETTINGS ───────────────────────────────────────────

  static getStorefrontSettings() {
    try {
      const data = CommerceModel.getStorefrontSettings()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil pengaturan storefront: ' + (error as Error).message }
    }
  }

  static updateStorefrontSettings(data: {
    domain?: string
    nama_toko?: string
    deskripsi?: string
    logo?: string
    warna_utama?: string
    meta_tags?: string
    google_analytics?: string
    is_active?: number
    metode_pengiriman?: string
    metode_pembayaran?: string
    kebijakan_privacy?: string
    syarat_ketentuan?: string
  }) {
    try {
      CommerceModel.updateStorefrontSettings(data)
      return { success: true, message: 'Pengaturan storefront berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui pengaturan storefront: ' + (error as Error).message }
    }
  }

  // ─── STOREFRONT PRODUCTS ───────────────────────────────────────────

  static getStorefrontProducts() {
    try {
      const data = CommerceModel.getStorefrontProducts()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil produk storefront: ' + (error as Error).message }
    }
  }

  static updateStorefrontProduct(id: number, data: {
    tampilkan?: number
    harga_online?: number
    stok_online?: number
    foto_tambahan?: string
    deskripsi_online?: string
    seo_title?: string
    seo_description?: string
  }) {
    try {
      CommerceModel.updateStorefrontProduct(id, data)
      return { success: true, message: 'Produk storefront berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui produk storefront: ' + (error as Error).message }
    }
  }

  // ─── STOREFRONT ORDERS ─────────────────────────────────────────────

  static getStorefrontOrders(status?: string) {
    try {
      const data = CommerceModel.getStorefrontOrders(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil order storefront: ' + (error as Error).message }
    }
  }

  static getStorefrontOrderById(id: number) {
    try {
      const data = CommerceModel.getStorefrontOrderById(id)
      if (!data) return { success: false, message: 'Order tidak ditemukan' }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil order storefront: ' + (error as Error).message }
    }
  }

  static createStorefrontOrder(data: {
    nomor_order: string
    nama_pelanggan: string
    email?: string
    no_telp?: string
    alamat?: string
    catatan?: string
    subtotal?: number
    ongkir?: number
    diskon?: number
    total?: number
    metode_pembayaran?: string
    kurir?: string
  }) {
    try {
      if (!data.nama_pelanggan?.trim()) {
        return { success: false, message: 'Nama pelanggan wajib diisi' }
      }
      if (!data.nomor_order?.trim()) {
        return { success: false, message: 'Nomor order wajib diisi' }
      }
      CommerceModel.createStorefrontOrder(data)
      return { success: true, message: 'Order storefront berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat order storefront: ' + (error as Error).message }
    }
  }

  static updateStorefrontOrderStatus(id: number, status: string) {
    try {
      const order = CommerceModel.getStorefrontOrderById(id)
      if (!order) return { success: false, message: 'Order tidak ditemukan' }

      CommerceModel.updateStorefrontOrderStatus(id, status)
      return { success: true, message: 'Status order berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui status order: ' + (error as Error).message }
    }
  }

  // ─── VENDOR PORTAL ─────────────────────────────────────────────────

  static getVendorSettings(supplierId: string) {
    try {
      const data = CommerceModel.getVendorSettings(supplierId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil pengaturan vendor: ' + (error as Error).message }
    }
  }

  static updateVendorSettings(supplierId: string, data: {
    portal_enabled?: number
    token?: string
    dapat_melihat_po?: number
    dapat_mengirim_invoice?: number
    dapat_melihat_status?: number
  }) {
    try {
      CommerceModel.updateVendorSettings(supplierId, data)
      return { success: true, message: 'Pengaturan vendor berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui pengaturan vendor: ' + (error as Error).message }
    }
  }

  // ─── DOCUMENTS ─────────────────────────────────────────────────────

  static getAllDocuments(tipe?: string, kategori?: string) {
    try {
      const data = CommerceModel.getAllDocuments(tipe, kategori)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data dokumen: ' + (error as Error).message }
    }
  }

  static getDocumentById(id: number) {
    try {
      const data = CommerceModel.getDocumentById(id)
      if (!data) return { success: false, message: 'Dokumen tidak ditemukan' }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data dokumen: ' + (error as Error).message }
    }
  }

  static async createDocument(data: {
    nomor_dokumen?: string
    nama: string
    tipe: string
    kategori?: string
    file_path?: string
    file_size?: number
    file_type?: string
    catatan?: string
    tags?: string
    dibuat_oleh: string
  }) {
    const authError = await requireAuth();
    if (authError) return authError

    try {
      if (!data.nama?.trim()) {
        return { success: false, message: 'Nama dokumen wajib diisi' }
      }
      if (!data.tipe?.trim()) {
        return { success: false, message: 'Tipe dokumen wajib diisi' }
      }
      CommerceModel.createDocument(data)
      return { success: true, message: 'Dokumen berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat dokumen: ' + (error as Error).message }
    }
  }

  static updateDocument(id: number, data: {
    nomor_dokumen?: string
    nama?: string
    tipe?: string
    kategori?: string
    file_path?: string
    file_size?: number
    file_type?: string
    catatan?: string
    tags?: string
    status?: string
  }) {
    try {
      const doc = CommerceModel.getDocumentById(id)
      if (!doc) return { success: false, message: 'Dokumen tidak ditemukan' }

      CommerceModel.updateDocument(id, data)
      return { success: true, message: 'Dokumen berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui dokumen: ' + (error as Error).message }
    }
  }

  static deleteDocument(id: number) {
    try {
      const doc = CommerceModel.getDocumentById(id)
      if (!doc) return { success: false, message: 'Dokumen tidak ditemukan' }

      CommerceModel.deleteDocument(id)
      return { success: true, message: 'Dokumen berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus dokumen: ' + (error as Error).message }
    }
  }

  static searchDocuments(query: string) {
    try {
      if (!query?.trim()) {
        return { success: false, message: 'Kata kunci pencarian wajib diisi' }
      }
      const data = CommerceModel.searchDocuments(query)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mencari dokumen: ' + (error as Error).message }
    }
  }

  // ─── FORECASTING ───────────────────────────────────────────────────

  static getForecastSettings() {
    try {
      const data = CommerceModel.getForecastSettings()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil pengaturan forecast: ' + (error as Error).message }
    }
  }

  static updateForecastSettings(data: {
    metode?: string
    periode_hari?: number
    periode_data?: number
    is_active?: number
  }) {
    try {
      CommerceModel.updateForecastSettings(data)
      return { success: true, message: 'Pengaturan forecast berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui pengaturan forecast: ' + (error as Error).message }
    }
  }

  static getForecasts(kd_barang?: string) {
    try {
      const data = CommerceModel.getForecasts(kd_barang)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data forecast: ' + (error as Error).message }
    }
  }

  static generateForecast(kd_barang: string) {
    try {
      if (!kd_barang?.trim()) {
        return { success: false, message: 'Kode barang wajib diisi' }
      }
      CommerceModel.generateForecast(kd_barang)
      return { success: true, message: 'Forecast berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat forecast: ' + (error as Error).message }
    }
  }

  // ─── DYNAMIC PRICING ───────────────────────────────────────────────

  static getDynamicPricingRules() {
    try {
      const data = CommerceModel.getDynamicPricingRules()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil aturan pricing: ' + (error as Error).message }
    }
  }

  static createDynamicPricingRule(data: {
    nama: string
    kd_barang?: string
    kategori_id?: number
    tipe: string
    nilai?: number
    kondisi?: string
    prioritas?: number
    is_active?: number
    tgl_mulai?: string
    tgl_berakhir?: string
  }) {
    try {
      if (!data.nama?.trim()) {
        return { success: false, message: 'Nama aturan wajib diisi' }
      }
      if (!data.tipe?.trim()) {
        return { success: false, message: 'Tipe aturan wajib diisi' }
      }
      CommerceModel.createDynamicPricingRule(data)
      return { success: true, message: 'Aturan pricing berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat aturan pricing: ' + (error as Error).message }
    }
  }

  static updateDynamicPricingRule(id: number, data: {
    nama?: string
    kd_barang?: string
    kategori_id?: number
    tipe?: string
    nilai?: number
    kondisi?: string
    prioritas?: number
    is_active?: number
    tgl_mulai?: string
    tgl_berakhir?: string
  }) {
    try {
      const rule = CommerceModel.getDynamicPricingRules().find(r => r.id === id)
      if (!rule) return { success: false, message: 'Aturan pricing tidak ditemukan' }

      CommerceModel.updateDynamicPricingRule(id, data)
      return { success: true, message: 'Aturan pricing berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui aturan pricing: ' + (error as Error).message }
    }
  }

  static deleteDynamicPricingRule(id: number) {
    try {
      const rule = CommerceModel.getDynamicPricingRules().find(r => r.id === id)
      if (!rule) return { success: false, message: 'Aturan pricing tidak ditemukan' }

      CommerceModel.deleteDynamicPricingRule(id)
      return { success: true, message: 'Aturan pricing berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus aturan pricing: ' + (error as Error).message }
    }
  }

  static getActiveRules(kd_barang?: string) {
    try {
      const data = CommerceModel.getActiveRules(kd_barang)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil aturan aktif: ' + (error as Error).message }
    }
  }
}
