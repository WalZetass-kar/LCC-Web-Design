import { MarketingModel } from '../models/MarketingModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class MarketingController {
  // ─── GIFT CARDS ────────────────────────────────────────────────────

  static getAllGiftCards(status?: string) {
    try {
      const data = MarketingModel.getAll(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data gift card: ' + (error as Error).message }
    }
  }

  static getGiftCardById(id: number) {
    try {
      const data = MarketingModel.getById(id)
      if (!data) return { success: false, message: 'Gift card tidak ditemukan' }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data gift card: ' + (error as Error).message }
    }
  }

  static getGiftCardByKode(kode: string) {
    try {
      const data = MarketingModel.getByKode(kode)
      if (!data) return { success: false, message: 'Gift card tidak ditemukan' }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data gift card: ' + (error as Error).message }
    }
  }

  static async createGiftCard(data: {
    nominal: number
    pembeli?: string
    penerima?: string
    pesan?: string
    masa_berlaku?: string
    dibuat_oleh: string
  }) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      if (data.nominal <= 0) {
        return { success: false, message: 'Nominal harus lebih dari 0' }
      }
      MarketingModel.create(data)
      return { success: true, message: 'Gift card berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat gift card: ' + (error as Error).message }
    }
  }

  static topUpGiftCard(id: number, nominal: number) {
    try {
      const card = MarketingModel.getById(id)
      if (!card) return { success: false, message: 'Gift card tidak ditemukan' }

      if (nominal <= 0) {
        return { success: false, message: 'Nominal top up harus lebih dari 0' }
      }

      MarketingModel.topUp(id, nominal)
      return { success: true, message: 'Saldo gift card berhasil ditambah' }
    } catch (error) {
      return { success: false, message: 'Gagal top up gift card: ' + (error as Error).message }
    }
  }

  static redeemGiftCard(kode: string, kd_transaksi: string, jumlah: number) {
    try {
      if (jumlah <= 0) {
        return { success: false, message: 'Jumlah redeem harus lebih dari 0' }
      }

      const result = MarketingModel.redeem(kode, kd_transaksi, jumlah)
      if (!result) {
        return { success: false, message: 'Gift card tidak valid, tidak aktif, atau saldo tidak mencukupi' }
      }
      return { success: true, message: 'Gift card berhasil digunakan', data: result }
    } catch (error) {
      return { success: false, message: 'Gagal redeem gift card: ' + (error as Error).message }
    }
  }

  static getGiftCardUsage(giftCardId: number) {
    try {
      const data = MarketingModel.getUsageHistory(giftCardId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil riwayat penggunaan: ' + (error as Error).message }
    }
  }

  // ─── CUSTOMER FEEDBACK ─────────────────────────────────────────────

  static getAllFeedback(status?: string, rating?: number) {
    try {
      const data = MarketingModel.getAllFeedback(status, rating)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data feedback: ' + (error as Error).message }
    }
  }

  static getFeedbackById(id: number) {
    try {
      const data = MarketingModel.getFeedbackById(id)
      if (!data) return { success: false, message: 'Feedback tidak ditemukan' }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data feedback: ' + (error as Error).message }
    }
  }

  static createFeedback(data: {
    kd_customer?: string
    nama: string
    kd_transaksi?: string
    rating?: number
    kategori?: string
    pesan?: string
  }) {
    try {
      if (!data.nama?.trim()) {
        return { success: false, message: 'Nama wajib diisi' }
      }
      MarketingModel.createFeedback(data)
      return { success: true, message: 'Feedback berhasil dikirim' }
    } catch (error) {
      return { success: false, message: 'Gagal mengirim feedback: ' + (error as Error).message }
    }
  }

  static updateFeedbackStatus(id: number, status: string, balasan?: string) {
    try {
      const feedback = MarketingModel.getFeedbackById(id)
      if (!feedback) return { success: false, message: 'Feedback tidak ditemukan' }

      MarketingModel.updateFeedbackStatus(id, status, balasan)
      return { success: true, message: 'Status feedback berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui feedback: ' + (error as Error).message }
    }
  }

  static getFeedbackSummary() {
    try {
      const data = MarketingModel.getFeedbackSummary()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil ringkasan feedback: ' + (error as Error).message }
    }
  }

  // ─── CAMPAIGNS ─────────────────────────────────────────────────────

  static getAllCampaigns(status?: string) {
    try {
      const data = MarketingModel.getAllCampaigns(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data campaign: ' + (error as Error).message }
    }
  }

  static getCampaignById(id: number) {
    try {
      const data = MarketingModel.getCampaignById(id)
      if (!data) return { success: false, message: 'Campaign tidak ditemukan' }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data campaign: ' + (error as Error).message }
    }
  }

  static async createCampaign(data: {
    nama: string
    tipe: string
    subjek?: string
    konten: string
    target?: string
    target_kustom?: string
    tgl_terjadwal?: string
    dibuat_oleh: string
  }) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      if (!data.nama?.trim()) {
        return { success: false, message: 'Nama campaign wajib diisi' }
      }
      if (!data.konten?.trim()) {
        return { success: false, message: 'Konten campaign wajib diisi' }
      }
      MarketingModel.createCampaign(data)
      return { success: true, message: 'Campaign berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat campaign: ' + (error as Error).message }
    }
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
    try {
      const campaign = MarketingModel.getCampaignById(id)
      if (!campaign) return { success: false, message: 'Campaign tidak ditemukan' }

      MarketingModel.updateCampaign(id, data)
      return { success: true, message: 'Campaign berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui campaign: ' + (error as Error).message }
    }
  }

  static deleteCampaign(id: number) {
    try {
      const campaign = MarketingModel.getCampaignById(id)
      if (!campaign) return { success: false, message: 'Campaign tidak ditemukan' }

      MarketingModel.deleteCampaign(id)
      return { success: true, message: 'Campaign berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus campaign: ' + (error as Error).message }
    }
  }

  static sendCampaign(id: number) {
    try {
      const campaign = MarketingModel.getCampaignById(id)
      if (!campaign) return { success: false, message: 'Campaign tidak ditemukan' }

      if (campaign.status === 'TERKIRIM') {
        return { success: false, message: 'Campaign sudah terkirim' }
      }

      MarketingModel.sendCampaign(id)
      return { success: true, message: 'Campaign berhasil dikirim' }
    } catch (error) {
      return { success: false, message: 'Gagal mengirim campaign: ' + (error as Error).message }
    }
  }

  static getCampaignLogs(campaignId: number) {
    try {
      const data = MarketingModel.getLogs(campaignId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil log campaign: ' + (error as Error).message }
    }
  }
}
