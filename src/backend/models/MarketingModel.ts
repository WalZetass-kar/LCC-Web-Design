import { db } from '../../database/connection.js'
import {
  giftCards,
  giftCardUsage,
  customerFeedback,
  campaigns,
  campaignLogs,
} from '../../database/schema.js'
import { eq, and, desc, like, gte, lte, sql } from 'drizzle-orm'

export class MarketingModel {
  // ─── GIFT CARDS ────────────────────────────────────────────────────

  static generateKode(): string {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    return `GIF${year}${random}`
  }

  static getAll(status?: string) {
    const conditions = []
    if (status) conditions.push(eq(giftCards.status, status))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(giftCards).where(where).orderBy(desc(giftCards.created_at)).all()
  }

  static getById(id: number) {
    return db.select().from(giftCards).where(eq(giftCards.id, id)).get()
  }

  static getByKode(kode: string) {
    return db.select().from(giftCards).where(eq(giftCards.kode, kode)).get()
  }

  static create(data: {
    nominal: number
    pembeli?: string
    penerima?: string
    pesan?: string
    masa_berlaku?: string
    dibuat_oleh: string
  }) {
    const kode = this.generateKode()
    return db.insert(giftCards).values({
      kode,
      nominal: data.nominal,
      saldo: data.nominal,
      pembeli: data.pembeli || null,
      penerima: data.penerima || null,
      pesan: data.pesan || null,
      masa_berlaku: data.masa_berlaku || null,
      status: 'AKTIF',
      tgl_dibeli: new Date().toISOString(),
      dibuat_oleh: data.dibuat_oleh,
      created_at: new Date().toISOString(),
    }).run()
  }

  static topUp(id: number, nominal: number) {
    const card = this.getById(id)
    if (!card) return null
    return db.update(giftCards).set({
      nominal: (card.nominal || 0) + nominal,
      saldo: (card.saldo || 0) + nominal,
    }).where(eq(giftCards.id, id)).run()
  }

  static redeem(kode: string, kd_transaksi: string, jumlah: number) {
    const card = this.getByKode(kode)
    if (!card) return null
    if (card.status !== 'AKTIF') return null
    if ((card.saldo || 0) < jumlah) return null

    const sisa_saldo = (card.saldo || 0) - jumlah
    const now = new Date().toISOString()

    db.update(giftCards).set({
      saldo: sisa_saldo,
      status: sisa_saldo <= 0 ? 'TERPAKAI' : 'AKTIF',
      tgl_digunakan: now,
    }).where(eq(giftCards.id, card.id)).run()

    db.insert(giftCardUsage).values({
      gift_card_id: card.id,
      kd_transaksi,
      jumlah,
      sisa_saldo,
      tgl: now,
    }).run()

    return { sisa_saldo }
  }

  static getUsageHistory(giftCardId: number) {
    return db.select().from(giftCardUsage)
      .where(eq(giftCardUsage.gift_card_id, giftCardId))
      .orderBy(desc(giftCardUsage.tgl))
      .all()
  }

  // ─── CUSTOMER FEEDBACK ─────────────────────────────────────────────

  static getAllFeedback(status?: string, rating?: number) {
    const conditions = []
    if (status) conditions.push(eq(customerFeedback.status, status))
    if (rating) conditions.push(eq(customerFeedback.rating, rating))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(customerFeedback).where(where).orderBy(desc(customerFeedback.tgl_dibuat)).all()
  }

  static getFeedbackById(id: number) {
    return db.select().from(customerFeedback).where(eq(customerFeedback.id, id)).get()
  }

  static createFeedback(data: {
    kd_customer?: string
    nama: string
    kd_transaksi?: string
    rating?: number
    kategori?: string
    pesan?: string
  }) {
    return db.insert(customerFeedback).values({
      kd_customer: data.kd_customer || null,
      nama: data.nama,
      kd_transaksi: data.kd_transaksi || null,
      rating: data.rating || 5,
      kategori: data.kategori || null,
      pesan: data.pesan || null,
      status: 'BARU',
      tgl_dibuat: new Date().toISOString(),
    }).run()
  }

  static updateFeedbackStatus(id: number, status: string, balasan?: string) {
    return db.update(customerFeedback).set({
      status,
      balasan: balasan || null,
    }).where(eq(customerFeedback.id, id)).run()
  }

  static getFeedbackSummary() {
    const all = db.select().from(customerFeedback).all()
    const kategoriMap: Record<string, { total: number; count: number }> = {}

    for (const f of all) {
      const kat = f.kategori || 'LAINNYA'
      if (!kategoriMap[kat]) kategoriMap[kat] = { total: 0, count: 0 }
      kategoriMap[kat].total += f.rating || 0
      kategoriMap[kat].count += 1
    }

    const perKategori = Object.entries(kategoriMap).map(([kategori, v]) => ({
      kategori,
      rata_rata: v.count > 0 ? +(v.total / v.count).toFixed(2) : 0,
      jumlah: v.count,
    }))

    const totalRating = all.reduce((s, f) => s + (f.rating || 0), 0)
    const rata_rata_keseluruhan = all.length > 0 ? +(totalRating / all.length).toFixed(2) : 0

    return {
      total_feedback: all.length,
      rata_rata_keseluruhan,
      per_kategori: perKategori,
    }
  }

  // ─── CAMPAIGNS ─────────────────────────────────────────────────────

  static getAllCampaigns(status?: string) {
    const conditions = []
    if (status) conditions.push(eq(campaigns.status, status))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(campaigns).where(where).orderBy(desc(campaigns.created_at)).all()
  }

  static getCampaignById(id: number) {
    return db.select().from(campaigns).where(eq(campaigns.id, id)).get()
  }

  static createCampaign(data: {
    nama: string
    tipe: string
    subjek?: string
    konten: string
    target?: string
    target_kustom?: string
    tgl_terjadwal?: string
    dibuat_oleh: string
  }) {
    return db.insert(campaigns).values({
      nama: data.nama,
      tipe: data.tipe,
      subjek: data.subjek || null,
      konten: data.konten,
      target: data.target || null,
      target_kustom: data.target_kustom || null,
      status: data.tgl_terjadwal ? 'TERJADWAL' : 'DRAFT',
      tgl_terjadwal: data.tgl_terjadwal || null,
      dibuat_oleh: data.dibuat_oleh,
      created_at: new Date().toISOString(),
    }).run()
  }

  static updateCampaign(id: number, data: {
    nama?: string
    tipe?: string
    subjek?: string
    konten?: string
    target?: string
    target_kustom?: string
    status?: string
    tgl_terjadwal?: string
  }) {
    return db.update(campaigns).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(campaigns.id, id)).run()
  }

  static deleteCampaign(id: number) {
    return db.delete(campaigns).where(eq(campaigns.id, id)).run()
  }

  static sendCampaign(id: number) {
    const campaign = this.getCampaignById(id)
    if (!campaign) return null
    return db.update(campaigns).set({
      status: 'TERKIRIM',
      tgl_terkirim: new Date().toISOString(),
      total_terkirim: campaign.total_target,
      updated_at: new Date().toISOString(),
    }).where(eq(campaigns.id, id)).run()
  }

  static getLogs(campaignId: number) {
    return db.select().from(campaignLogs)
      .where(eq(campaignLogs.campaign_id, campaignId))
      .orderBy(desc(campaignLogs.tgl))
      .all()
  }
}
