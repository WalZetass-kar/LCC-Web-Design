import { PenjualanModel } from '../models/PenjualanModel.js'

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
}

export class PenjualanController {
  static getAll() {
    return { success: true, data: PenjualanModel.getAll() }
  }

  static getDetail(kd: string) {
    return { success: true, data: PenjualanModel.getDetail(kd) }
  }

  static create(payload: CreateTransaksiPayload) {
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

    const kembalian = payload.yang_dibayar - sub_total

    const header = {
      kd_tansaksi_jual: kd_transaksi,
      tgl_wkt_transaksi: now.toISOString().replace('T', ' ').slice(0, 19),
      username_transaksi: payload.username || 'KASIR',
      total_qty: payload.items.reduce((s, i) => s + i.qty, 0),
      sub_total,
      yang_dibayar: payload.yang_dibayar,
      kembalian,
      jenis_pembayaran: payload.jenis_pembayaran || 'TUNAI',
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

    PenjualanModel.create(header, details)
    return { success: true, message: 'Transaksi berhasil disimpan', kd_transaksi }
  }
}
