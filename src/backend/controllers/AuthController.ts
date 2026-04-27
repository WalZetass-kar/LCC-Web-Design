import { PenggunaModel } from '../models/PenggunaModel.js'
import { IdentitasModel } from '../models/IdentitasModel.js'
import { encryptPassword } from '../services/crypto.js'

export class AuthController {
  static login(username: string, password: string) {
    if (!username?.trim() || !password?.trim()) {
      return { success: false, message: 'Username dan password tidak boleh kosong' }
    }

    const encrypted = encryptPassword(password)
    const user = PenggunaModel.findActive(username, encrypted)

    if (!user) {
      return { success: false, message: 'Username atau Password Salah! Atau akun tidak aktif.' }
    }

    PenggunaModel.updateLastLogin(username)

    return {
      success: true,
      data: {
        nama_pengguna: user.nama_pengguna,
        nama_lengkap: user.nama_lengkap,
        role: user.role || 'KASIR',
      },
    }
  }

  /** Check if store identity exists (for first-login prompt) */
  static checkIdentitas() {
    const identitas = IdentitasModel.get()
    return { success: true, data: { hasIdentitas: !!identitas?.namatoko } }
  }
}
