import { PenjualanModel } from '../models/PenjualanModel.js'
import { CustomerModel } from '../models/CustomerModel.js'
import { IdentitasModel } from '../models/IdentitasModel.js'
import { sqlite } from '../../database/connection.js'
import { validateDemoMode } from '../utils/demoMode.js'
import { withTransaction } from '../utils/transaction.js'
import { WhatsAppController } from './WhatsAppController.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { checkTransactionLimit, getLimitPopup, getSubscriptionStatus, getUpgradePopup } from '../middleware/subscriptionGuard.js'

interface CartItem {
  kd_barang: string
  nama_barang: string
  harga_jual: number
  harga_modal: number
  qty: number
  disc: number
}

interface CreateTransaksiPayload {
  username: string
  items: CartItem[]
  yang_dibayar: number
  jenis_pembayaran: string
  kd_customer?: string
  pajak?: number
  diskon_promo?: number
  kode_promo?: string
  shift_id?: number
}

export class PenjualanController {
  private static asSafeNumber(value: unknown, fallback = 0) {
    const numeric = Number(value ?? fallback)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  private static clampPercentage(value: unknown) {
    return Math.max(0, Math.min(100, this.asSafeNumber(value)))
  }

  private static buildTrustedItems(items: CartItem[]) {
    const merged = new Map<string, number>()
    for (const item of items) {
      const kd_barang = String(item?.kd_barang ?? '').trim()
      const qty = this.asSafeNumber(item?.qty)
      if (!kd_barang) throw new Error('Kode barang tidak valid')
      if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Qty ${kd_barang} harus bilangan bulat lebih dari 0`)
      merged.set(kd_barang, (merged.get(kd_barang) ?? 0) + qty)
    }

    const trusted: CartItem[] = []
    for (const [kd_barang, qty] of merged) {
      const row = sqlite.prepare(`
        SELECT
          b.kd_barang,
          b.nama_barang,
          COALESCE(b.stok, 0) AS stok,
          COALESCE(h.harga_barang, 0) AS harga_jual,
          COALESCE(h.harga_modal, 0) AS harga_modal,
          COALESCE(h.potongan, 0) AS disc
        FROM mediasoft_barang b
        LEFT JOIN mediasoft_harga h ON b.kd_barang = h.kd_barang
        WHERE b.kd_barang = ?
        LIMIT 1
      `).get(kd_barang) as (CartItem & { stok?: number }) | undefined

      if (!row) throw new Error(`Barang ${kd_barang} tidak ditemukan`)
      if ((row.stok ?? 0) < qty) throw new Error(`Stok ${row.nama_barang || kd_barang} tidak mencukupi`)
      const harga_jual = this.asSafeNumber(row.harga_jual)
      if (harga_jual < 0) throw new Error(`Harga jual ${row.nama_barang || kd_barang} tidak valid`)

      trusted.push({
        kd_barang,
        nama_barang: row.nama_barang || kd_barang,
        harga_jual,
        harga_modal: Math.max(0, this.asSafeNumber(row.harga_modal)),
        qty,
        disc: this.clampPercentage(row.disc),
      })
    }

    return trusted
  }

  private static getLowStockProducts(items: CartItem[]) {
    const productIds = [...new Set(items.map(item => item.kd_barang).filter(Boolean))]
    if (!productIds.length) return []

    const placeholders = productIds.map(() => '?').join(',')
    return sqlite.prepare(`
      SELECT nama_barang as name, COALESCE(stok, 0) as stock
      FROM mediasoft_barang
      WHERE kd_barang IN (${placeholders})
        AND COALESCE(stok_minimum, 0) > 0
        AND COALESCE(stok, 0) <= COALESCE(stok_minimum, 0)
    `).all(...productIds) as Array<{ name: string; stock: number }>
  }

  private static async sendWhatsAppAfterSale(payload: CreateTransaksiPayload, invoice: string, total: number) {
    try {
      const tasks: Promise<unknown>[] = []

      if (payload.kd_customer) {
        const customer = CustomerModel.getById(payload.kd_customer) as any
        tasks.push(
          WhatsAppController.sendSaleNotification({
            phone: customer?.no_telp,
            customerName: customer?.nama_customer,
            invoice,
            total,
          }).then(result => {
            if (result.attempted && !result.success) {
              console.warn('WhatsApp sale notification failed:', result.message)
            }
          })
        )
      }

      const lowStockProducts = this.getLowStockProducts(payload.items)
      if (lowStockProducts.length) {
        const identitas = IdentitasModel.get() as any
        tasks.push(
          WhatsAppController.sendLowStockNotification(identitas?.nomorwaowner, lowStockProducts)
            .then(result => {
              if (result.attempted && !result.success) {
                console.warn('WhatsApp low stock notification failed:', result.message)
              }
            })
        )
      }

      await Promise.all(tasks)
    } catch (error) {
      console.warn('WhatsApp notification skipped:', error)
    }
  }

  static getAll() {
    return { success: true, data: PenjualanModel.getAll() }
  }

  static getDetail(kd: string) {
    return { success: true, data: PenjualanModel.getDetail(kd) }
  }

  static async create(payload: CreateTransaksiPayload) {
    // Block demo user
    const demoError = validateDemoMode(payload.username)
    if (demoError) return demoError

    const username = payload.username || 'KASIR'
    const subscription = getSubscriptionStatus(username)
    if (subscription.is_expired) {
      ActivityLogModel.log(
        username,
        'Transaksi ditolak karena langganan berakhir',
        'PENJUALAN',
        `expires_at=${subscription.expires_at ?? '-'}; plan=${subscription.plan_name ?? '-'}`,
        'subscription'
      )
      return {
        success: false,
        error_code: 'EXPIRED',
        message: 'Masa langganan akun sudah berakhir. Silakan perpanjang atau upgrade paket.',
        data: { popup: getUpgradePopup(username) },
      }
    }

    const transactionLimit = checkTransactionLimit(username)
    if (!transactionLimit.allowed) {
      ActivityLogModel.log(
        username,
        'Transaksi ditolak karena limit paket habis',
        'PENJUALAN',
        `used=${transactionLimit.used}; max=${transactionLimit.max}`,
        'subscription'
      )
      return {
        success: false,
        error_code: 'TRANSACTION_LIMIT',
        message: `Limit transaksi harian paket sudah tercapai (${transactionLimit.used}/${transactionLimit.max}). Silakan upgrade paket untuk melanjutkan.`,
        data: { ...transactionLimit, popup: getLimitPopup('TRANSACTION_LIMIT') },
      }
    }

    if (!payload.items?.length) {
      return { success: false, message: 'Keranjang kosong' }
    }

    if (!payload.shift_id) {
      return {
        success: false,
        error_code: 'SHIFT_REQUIRED',
        message: 'Shift kasir belum dibuka. Buka shift terlebih dahulu sebelum membuat transaksi.',
      }
    }

    const activeShift = sqlite.prepare(`
      SELECT id, user_id, status
      FROM mediasoft_shifts
      WHERE id = ? AND status = 'OPEN'
      LIMIT 1
    `).get(payload.shift_id) as { id: number; user_id: string; status: string } | undefined
    if (!activeShift || String(activeShift.user_id) !== username) {
      return {
        success: false,
        error_code: 'SHIFT_REQUIRED',
        message: 'Shift aktif tidak ditemukan untuk kasir ini. Buka atau pilih shift aktif sebelum transaksi.',
      }
    }

    let trustedItems: CartItem[]
    try {
      trustedItems = this.buildTrustedItems(payload.items)
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.getTime().toString().slice(-4)
    const kd_transaksi = `FJ-${dateStr}${timeStr}`

    const sub_total = trustedItems.reduce((sum, item) => {
      const disc_amount = (item.harga_jual * item.disc) / 100
      return sum + (item.harga_jual - disc_amount) * item.qty
    }, 0)

    const pajakRow = sqlite
      .prepare('SELECT COALESCE(pajak_persen, 0) AS rate FROM mediasoft_identitas LIMIT 1')
      .get() as { rate?: number } | undefined
    const pajakRate = Math.max(0, Math.min(100, this.asSafeNumber(pajakRow?.rate)))
    const pajak = Math.round(sub_total * pajakRate / 100)
    const diskon_promo = Math.max(0, this.asSafeNumber(payload.diskon_promo))
    const total_bayar = Math.max(0, sub_total + pajak - diskon_promo)
    const yang_dibayar = Math.max(0, this.asSafeNumber(payload.yang_dibayar))
    if (yang_dibayar < total_bayar) {
      return { success: false, message: 'Pembayaran kurang dari total transaksi' }
    }
    const kembalian = yang_dibayar - total_bayar

    const header = {
      kd_tansaksi_jual: kd_transaksi,
      tgl_wkt_transaksi: now.toISOString().replace('T', ' ').slice(0, 19),
      username_transaksi: payload.username || 'KASIR',
      total_qty: trustedItems.reduce((s, i) => s + i.qty, 0),
      sub_total,
      pajak,
      yang_dibayar,
      kembalian,
      jenis_pembayaran: payload.jenis_pembayaran || 'TUNAI',
      kd_customer: payload.kd_customer || null,
      discount_amount: diskon_promo,
      shift_id: payload.shift_id ?? null,
    }

    const details = trustedItems.map(item => {
      const disc_amount = (item.harga_jual * item.disc) / 100
      const harga_disc = disc_amount * item.qty
      const total_harga_jual = (item.harga_jual - disc_amount) * item.qty
      return {
        kd_tansaksi_jual: kd_transaksi,
        kd_barang: item.kd_barang,
        harga_modal: item.harga_modal,
        harga_jual: item.harga_jual,
        qty: item.qty,
        disc: item.disc,
        harga_disc,
        total_harga_jual,
        nama_pengguna: payload.username || 'KASIR',
        tgl_waktu_input: header.tgl_wkt_transaksi,
      }
    })

    const result = await withTransaction(() => {
      PenjualanModel.create(header, details)

      if (payload.kd_customer) {
        const poinEarned = Math.floor(sub_total / 10000)
        CustomerModel.addPoin(payload.kd_customer, poinEarned)
        CustomerModel.updateTotalBelanja(payload.kd_customer, sub_total)
      }

      sqlite.prepare(`
        UPDATE mediasoft_shifts
        SET total_sales = COALESCE(total_sales, 0) + ?,
            total_transactions = COALESCE(total_transactions, 0) + 1
        WHERE id = ?
      `).run(total_bayar, payload.shift_id)

      return kd_transaksi
    })

    if (!result.success) {
      return { success: false, message: `Transaksi gagal: ${result.error}` }
    }

    void PenjualanController.sendWhatsAppAfterSale(payload, kd_transaksi, total_bayar)

    return { success: true, message: 'Transaksi berhasil disimpan', kd_transaksi: result.data }
  }
}
