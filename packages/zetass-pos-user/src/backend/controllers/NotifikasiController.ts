import { NotifikasiModel } from '../models/NotifikasiModel.js'
import { sqlite } from '../../database/connection.js'
import type { Notifikasi } from '../../shared/types'

export class NotifikasiController {
  static getAll(username?: string) {
    try {
      const notifikasi = NotifikasiModel.getAll(username)
      return { success: true, data: notifikasi }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil notifikasi: ' + (error as Error).message }
    }
  }

  static getUnread(username?: string) {
    try {
      const notifikasi = NotifikasiModel.getUnread(username)
      return { success: true, data: notifikasi }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil notifikasi: ' + (error as Error).message }
    }
  }

  static getUnreadCount(username?: string) {
    try {
      const count = NotifikasiModel.getUnreadCount(username)
      return { success: true, data: { count } }
    } catch (error) {
      return { success: false, message: 'Gagal menghitung notifikasi: ' + (error as Error).message }
    }
  }

  static create(data: Partial<Notifikasi>) {
    try {
      if (!data.judul?.trim() || !data.pesan?.trim() || !data.jenis) {
        return { success: false, message: 'Data notifikasi tidak lengkap' }
      }

      const tgl_dibuat = new Date().toISOString()

      NotifikasiModel.create({
        judul: data.judul,
        pesan: data.pesan,
        jenis: data.jenis as 'STOK' | 'EXPIRED' | 'SYSTEM' | 'INFO',
        username: data.username || undefined,
        link: data.link || undefined,
      })

      return { success: true, message: 'Notifikasi berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat notifikasi: ' + (error as Error).message }
    }
  }

  static markAsRead(kd_notifikasi: number) {
    try {
      NotifikasiModel.markAsRead(kd_notifikasi)
      return { success: true, message: 'Notifikasi ditandai sudah dibaca' }
    } catch (error) {
      return { success: false, message: 'Gagal menandai notifikasi: ' + (error as Error).message }
    }
  }

  static markAllAsRead(username?: string) {
    try {
      NotifikasiModel.markAllAsRead(username)
      return { success: true, message: 'Semua notifikasi ditandai sudah dibaca' }
    } catch (error) {
      return { success: false, message: 'Gagal menandai notifikasi: ' + (error as Error).message }
    }
  }

  static delete(kd_notifikasi: number) {
    try {
      NotifikasiModel.delete(kd_notifikasi)
      return { success: true, message: 'Notifikasi berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus notifikasi: ' + (error as Error).message }
    }
  }

  static deleteAll(username?: string) {
    try {
      NotifikasiModel.deleteAll(username)
      return { success: true, message: 'Semua notifikasi berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus notifikasi: ' + (error as Error).message }
    }
  }

  // Auto notification creators
  static checkStokMinimum() {
    try {
      const count = NotifikasiModel.createStokMinimumNotifications()
      return { success: true, message: `${count} notifikasi stok minimum dibuat` }
    } catch (error) {
      return { success: false, message: 'Gagal membuat notifikasi: ' + (error as Error).message }
    }
  }

  static checkExpiredProducts() {
    try {
      const count = NotifikasiModel.createExpiredNotifications()
      return { success: true, message: `${count} notifikasi produk expired dibuat` }
    } catch (error) {
      return { success: false, message: 'Gagal membuat notifikasi: ' + (error as Error).message }
    }
  }

  static checkDebtDueDate() {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

      // Hutang jatuh tempo hari ini atau dalam 3 hari ke depan
      const debts = sqlite.prepare(`
        SELECT d.*, c.nama_customer, s.nama_suplier
        FROM mediasoft_debts d
        LEFT JOIN mediasoft_customer c ON d.customer_id = c.kd_customer
        LEFT JOIN mediasoft_supplier s ON d.supplier_id = s.kd_suplier
        WHERE d.status NOT IN ('PAID') AND d.due_date BETWEEN ? AND ?
      `).all(today, threeDaysLater) as any[]

      let count = 0
      for (const debt of debts) {
        const name = debt.nama_customer ?? debt.nama_suplier ?? 'Unknown'
        const isToday = debt.due_date === today
        const judul = isToday ? `Hutang Jatuh Tempo Hari Ini` : `Hutang Jatuh Tempo 3 Hari Lagi`
        const pesan = `${debt.type === 'HUTANG' ? 'Hutang' : 'Piutang'} ${name} sebesar Rp ${(debt.remaining_amount ?? 0).toLocaleString('id-ID')} jatuh tempo ${isToday ? 'hari ini' : 'pada ' + debt.due_date}`

        // Cek apakah notifikasi untuk debt ini sudah ada hari ini
        const existing = sqlite.prepare(`
          SELECT id FROM mediasoft_notifikasi WHERE pesan LIKE ? AND DATE(tgl_dibuat) = ?
        `).get(`%${debt.debt_number}%`, today)

        if (!existing) {
          NotifikasiModel.create({ judul, pesan: pesan + ` (${debt.debt_number})`, jenis: 'INFO' })
          count++
        }
      }

      return { success: true, message: `${count} notifikasi hutang jatuh tempo dibuat` }
    } catch (error) {
      return { success: false, message: 'Gagal cek hutang: ' + (error as Error).message }
    }
  }
}
