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

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.getTime().toString().slice(-4)
    const kd_transaksi = `FJ-${dateStr}${timeStr}`

    const sub_total = payload.items.reduce((sum, item) => {
      const disc_amount = (item.harga_jual * item.disc) / 100
      return sum + (item.harga_jual - disc_amount) * item.qty
    }, 0)

    const pajak = payload.pajak ?? 0
    const diskon_promo = payload.diskon_promo ?? 0
    const total_bayar = sub_total + pajak - diskon_promo
    const kembalian = payload.yang_dibayar - total_bayar

    const header = {
      kd_tansaksi_jual: kd_transaksi,
      tgl_wkt_transaksi: now.toISOString().replace('T', ' ').slice(0, 19),
      username_transaksi: payload.username || 'KASIR',
      total_qty: payload.items.reduce((s, i) => s + i.qty, 0),
      sub_total,
      pajak,
      yang_dibayar: payload.yang_dibayar,
      kembalian,
      jenis_pembayaran: payload.jenis_pembayaran || 'TUNAI',
      kd_customer: payload.kd_customer || null,
      discount_amount: diskon_promo,
      shift_id: payload.shift_id ?? null,
    }

    const details = payload.items.map(item => {
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

    // Execute all operations in a transaction
    const result = await withTransaction(() => {
      PenjualanModel.create(header, details)

      // Update customer poin & total_belanja if customer selected
      if (payload.kd_customer) {
        const poinEarned = Math.floor(sub_total / 10000) // 1 poin per Rp10.000
        CustomerModel.addPoin(payload.kd_customer, poinEarned)
        CustomerModel.updateTotalBelanja(payload.kd_customer, sub_total)
      }
      
      return kd_transaksi
    })

    if (!result.success) {
      return { success: false, message: `Transaksi gagal: ${result.error}` }
    }

    void PenjualanController.sendWhatsAppAfterSale(payload, kd_transaksi, total_bayar)

    return { success: true, message: 'Transaksi berhasil disimpan', kd_transaksi: result.data }
  }
}
