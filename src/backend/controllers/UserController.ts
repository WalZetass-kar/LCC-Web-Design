import { PenggunaModel } from '../models/PenggunaModel.js'
import { encryptPassword } from '../services/crypto.js'

export class UserController {
  static getAll() {
    try {
      const users = PenggunaModel.getAll()
      // Don't send password to frontend
      const sanitized = users.map(u => ({
        ...u,
        kata_sandi: undefined,
      }))
      return { success: true, data: sanitized }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: {
    nama_pengguna: string
    kata_sandi: string
    nama_lengkap: string
    email?: string
    no_telp?: string
    role: 'ADMIN' | 'KASIR' | 'OWNER'
  }) {
    try {
      // Check if username already exists
      const existing = PenggunaModel.findByUsername(data.nama_pengguna)
      if (existing) {
        return { success: false, message: 'Username sudah digunakan' }
      }

      // Encrypt password
      const encrypted = encryptPassword(data.kata_sandi)

      PenggunaModel.create({
        ...data,
        kata_sandi: encrypted,
      })

      return { success: true, message: 'User berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(username: string, data: {
    nama_lengkap?: string
    email?: string
    no_telp?: string
    role?: string
    status_user?: string
  }) {
    try {
      PenggunaModel.update(username, data)
      return { success: true, message: 'User berhasil diupdate' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static changePassword(username: string, oldPassword: string, newPassword: string) {
    try {
      const user = PenggunaModel.findByUsername(username)
      if (!user) {
        return { success: false, message: 'User tidak ditemukan' }
      }

      // Verify old password
      const oldEncrypted = encryptPassword(oldPassword)
      if (user.kata_sandi !== oldEncrypted) {
        return { success: false, message: 'Password lama salah' }
      }

      // Update with new password
      const newEncrypted = encryptPassword(newPassword)
      PenggunaModel.update(username, { kata_sandi: newEncrypted })

      return { success: true, message: 'Password berhasil diubah' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static resetPassword(username: string, newPassword: string) {
    try {
      const encrypted = encryptPassword(newPassword)
      PenggunaModel.update(username, { kata_sandi: encrypted })
      return { success: true, message: 'Password berhasil direset' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(username: string) {
    try {
      // Don't allow deleting admin user
      if (username === 'admin') {
        return { success: false, message: 'Tidak dapat menghapus user admin' }
      }

      PenggunaModel.delete(username)
      return { success: true, message: 'User berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static toggleStatus(username: string) {
    try {
      const user = PenggunaModel.findByUsername(username)
      if (!user) {
        return { success: false, message: 'User tidak ditemukan' }
      }

      const newStatus = user.status_user === 'Aktif' ? 'Nonaktif' : 'Aktif'
      PenggunaModel.update(username, { status_user: newStatus })

      return { success: true, message: `User berhasil di${newStatus === 'Aktif' ? 'aktifkan' : 'nonaktifkan'}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
