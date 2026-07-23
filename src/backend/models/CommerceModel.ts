import { db, sqlite } from '../../database/connection.js'
import {
  vendorPortalSettings,
  storefrontSettings,
  storefrontProducts,
  storefrontOrders,
  documents,
  forecastSettings,
  forecastResults,
  dynamicPricingRules,
} from '../../database/schema.js'
import { eq, and, desc, like, gte, lte, sql } from 'drizzle-orm'

export class CommerceModel {
  // ─── STOREFRONT SETTINGS ───────────────────────────────────────────

  static getStorefrontSettings() {
    return db.select().from(storefrontSettings).get()
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
    const existing = this.getStorefrontSettings()
    if (!existing) {
      return db.insert(storefrontSettings).values({
        ...data,
        created_at: new Date().toISOString(),
      }).run()
    }
    return db.update(storefrontSettings).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(storefrontSettings.id, existing.id)).run()
  }

  // ─── STOREFRONT PRODUCTS ───────────────────────────────────────────

  static getStorefrontProducts() {
    return db.select().from(storefrontProducts).all()
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
    return db.update(storefrontProducts).set(data).where(eq(storefrontProducts.id, id)).run()
  }

  // ─── STOREFRONT ORDERS ─────────────────────────────────────────────

  static getStorefrontOrders(status?: string) {
    const conditions = []
    if (status) conditions.push(eq(storefrontOrders.status, status))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(storefrontOrders).where(where).orderBy(desc(storefrontOrders.created_at)).all()
  }

  static getStorefrontOrderById(id: number) {
    return db.select().from(storefrontOrders).where(eq(storefrontOrders.id, id)).get()
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
    return db.insert(storefrontOrders).values({
      nomor_order: data.nomor_order,
      nama_pelanggan: data.nama_pelanggan,
      email: data.email || null,
      no_telp: data.no_telp || null,
      alamat: data.alamat || null,
      catatan: data.catatan || null,
      subtotal: data.subtotal || 0,
      ongkir: data.ongkir || 0,
      diskon: data.diskon || 0,
      total: data.total || 0,
      status: 'BARU',
      metode_pembayaran: data.metode_pembayaran || null,
      status_pembayaran: 'BELUM_BAYAR',
      kurir: data.kurir || null,
      created_at: new Date().toISOString(),
    }).run()
  }

  static updateStorefrontOrderStatus(id: number, status: string) {
    return db.update(storefrontOrders).set({
      status,
      updated_at: new Date().toISOString(),
    }).where(eq(storefrontOrders.id, id)).run()
  }

  // ─── VENDOR PORTAL ─────────────────────────────────────────────────

  static getVendorSettings(supplierId: string) {
    return db.select().from(vendorPortalSettings)
      .where(eq(vendorPortalSettings.supplier_id, supplierId))
      .get()
  }

  static updateVendorSettings(supplierId: string, data: {
    portal_enabled?: number
    token?: string
    dapat_melihat_po?: number
    dapat_mengirim_invoice?: number
    dapat_melihat_status?: number
  }) {
    const existing = this.getVendorSettings(supplierId)
    if (!existing) {
      return db.insert(vendorPortalSettings).values({
        supplier_id: supplierId,
        ...data,
        created_at: new Date().toISOString(),
      }).run()
    }
    return db.update(vendorPortalSettings).set(data).where(eq(vendorPortalSettings.id, existing.id)).run()
  }

  // ─── DOCUMENTS ─────────────────────────────────────────────────────

  static getAllDocuments(tipe?: string, kategori?: string) {
    const conditions = []
    if (tipe) conditions.push(eq(documents.tipe, tipe))
    if (kategori) conditions.push(eq(documents.kategori, kategori))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(documents).where(where).orderBy(desc(documents.created_at)).all()
  }

  static getDocumentById(id: number) {
    return db.select().from(documents).where(eq(documents.id, id)).get()
  }

  static createDocument(data: {
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
    return db.insert(documents).values({
      nomor_dokumen: data.nomor_dokumen || null,
      nama: data.nama,
      tipe: data.tipe,
      kategori: data.kategori || null,
      file_path: data.file_path || null,
      file_size: data.file_size || null,
      file_type: data.file_type || null,
      catatan: data.catatan || null,
      tags: data.tags || null,
      status: 'AKTIF',
      dibuat_oleh: data.dibuat_oleh,
      created_at: new Date().toISOString(),
    }).run()
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
    return db.update(documents).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(documents.id, id)).run()
  }

  static deleteDocument(id: number) {
    return db.delete(documents).where(eq(documents.id, id)).run()
  }

  static searchDocuments(query: string) {
    return db.select().from(documents)
      .where(like(documents.nama, `%${query}%`))
      .orderBy(desc(documents.created_at))
      .all()
  }

  // ─── FORECAST SETTINGS ─────────────────────────────────────────────

  static getForecastSettings() {
    return db.select().from(forecastSettings).get()
  }

  static updateForecastSettings(data: {
    metode?: string
    periode_hari?: number
    periode_data?: number
    is_active?: number
  }) {
    const existing = this.getForecastSettings()
    if (!existing) {
      return db.insert(forecastSettings).values({
        ...data,
      }).run()
    }
    return db.update(forecastSettings).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(forecastSettings.id, existing.id)).run()
  }

  // ─── FORECAST RESULTS ──────────────────────────────────────────────

  static getForecasts(kd_barang?: string) {
    const conditions = []
    if (kd_barang) conditions.push(eq(forecastResults.kd_barang, kd_barang))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(forecastResults).where(where).orderBy(desc(forecastResults.tgl_dibuat)).all()
  }

  static generateForecast(kd_barang: string) {
    const settings = this.getForecastSettings()
    const periode = settings?.periode_data || 90

    const threshold = new Date(Date.now() - periode * 86400000).toISOString().split('T')[0]
    const raw = sqlite.prepare(`
      SELECT date(tgl_transaksi) as tgl, SUM(total) as total
      FROM mediasoft_penjualan
      WHERE kd_barang = ? AND tgl_transaksi >= ?
      GROUP BY date(tgl_transaksi)
      ORDER BY tgl ASC
    `).all(kd_barang, threshold) as { tgl: string; total: number }[]

    if (raw.length === 0) return null

    const totalPenjualan = raw.reduce((s, r) => s + r.total, 0)
    const avg = totalPenjualan / raw.length
    const periodeHari = settings?.periode_hari || 30
    const prediksi = +(avg * periodeHari).toFixed(2)
    const variance = raw.reduce((s, r) => s + (r.total - avg) ** 2, 0) / raw.length
    const stddev = Math.sqrt(variance)
    const confidenceLower = +(prediksi - 1.96 * stddev).toFixed(2)
    const confidenceUpper = +(prediksi + 1.96 * stddev).toFixed(2)

    return db.insert(forecastResults).values({
      kd_barang,
      tgl_forecast: new Date().toISOString().slice(0, 10),
      prediksi_penjualan: prediksi,
      confidence_lower: confidenceLower < 0 ? 0 : confidenceLower,
      confidence_upper: confidenceUpper,
      metode: settings?.metode || 'MOVING_AVERAGE',
      tgl_dibuat: new Date().toISOString(),
    }).run()
  }

  // ─── DYNAMIC PRICING ───────────────────────────────────────────────

  static getDynamicPricingRules() {
    return db.select().from(dynamicPricingRules).orderBy(desc(dynamicPricingRules.prioritas)).all()
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
    return db.insert(dynamicPricingRules).values({
      nama: data.nama,
      kd_barang: data.kd_barang || null,
      kategori_id: data.kategori_id || null,
      tipe: data.tipe,
      nilai: data.nilai || 0,
      kondisi: data.kondisi || null,
      prioritas: data.prioritas || 0,
      is_active: data.is_active ?? 1,
      tgl_mulai: data.tgl_mulai || null,
      tgl_berakhir: data.tgl_berakhir || null,
      created_at: new Date().toISOString(),
    }).run()
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
    return db.update(dynamicPricingRules).set(data).where(eq(dynamicPricingRules.id, id)).run()
  }

  static deleteDynamicPricingRule(id: number) {
    return db.delete(dynamicPricingRules).where(eq(dynamicPricingRules.id, id)).run()
  }

  static getActiveRules(kd_barang?: string) {
    const now = new Date().toISOString()
    const conditions = [
      eq(dynamicPricingRules.is_active, 1),
      sql`(${dynamicPricingRules.tgl_mulai} IS NULL OR ${dynamicPricingRules.tgl_mulai} <= ${now})`,
      sql`(${dynamicPricingRules.tgl_berakhir} IS NULL OR ${dynamicPricingRules.tgl_berakhir} >= ${now})`,
    ]
    if (kd_barang) conditions.push(eq(dynamicPricingRules.kd_barang, kd_barang))

    return db.select().from(dynamicPricingRules)
      .where(and(...conditions))
      .orderBy(desc(dynamicPricingRules.prioritas))
      .all()
  }
}
