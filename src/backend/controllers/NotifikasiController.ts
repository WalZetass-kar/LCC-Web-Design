import { NotifikasiModel } from '../models/NotifikasiModel.js'
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
}
