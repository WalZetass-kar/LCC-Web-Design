import { PenggunaModel } from '../models/PenggunaModel.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { sqlite } from '../../database/connection.js'

// Role hierarchy: developer > superadmin > admin > operator > kasir
const ROLE_HIERARCHY = ['developer', 'superadmin', 'admin', 'operator', 'kasir']
const PROTECTED_USERS = ['Developer'] // Only Developer account is locked
const CAN_MANAGE_PERMISSIONS = ['developer', 'superadmin'] // Can set permissions for others

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

  static async create(data: {
    nama_pengguna: string
    kata_sandi?: string
    password?: string // Accept both kata_sandi and password
    nama_lengkap: string
    email?: string
    no_telp?: string
    hak_akses?: string
    _caller?: string
  }) {
    try {
      // Check if username already exists
      const existing = PenggunaModel.findByUsername(data.nama_pengguna)
      if (existing) {
        return { success: false, message: 'Username sudah digunakan' }
      }

      // Get password from either field
      const plainPassword = data.kata_sandi || data.password
      if (!plainPassword) {
        return { success: false, message: 'Password wajib diisi' }
      }

      // Hash password using bcrypt (secure)
      const { hashPassword } = await import('../services/crypto.js')
      const hashed = await hashPassword(plainPassword)

      PenggunaModel.create({
        nama_pengguna: data.nama_pengguna,
        kata_sandi: hashed,
        nama_lengkap: data.nama_lengkap,
        email: data.email,
        no_telp: data.no_telp,
        hak_akses: data.hak_akses || 'kasir',
      })

      // Activity log
      if (data._caller) {
        ActivityLogModel.log(
          data._caller,
          `Menambah user baru: ${data.nama_pengguna}`,
          'USER_MANAGEMENT',
          `Hak akses: ${data.hak_akses || 'kasir'}`
        )
      }

      return { success: true, message: 'User berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(username: string, data: {
    nama_lengkap?: string
    email?: string
    no_telp?: string
    hak_akses?: string
    status_user?: string
    _caller?: string
  }) {
    try {
      const { _caller, ...payload } = data
      const callerIsPrivileged = _caller && CAN_MANAGE_PERMISSIONS.includes(
        ROLE_HIERARCHY.find(r => _caller.toLowerCase().includes(r)) ?? ''
      )

      if (PROTECTED_USERS.includes(username)) {
        // Developer account: never allow any changes to hak_akses/status
        const { hak_akses: _r, status_user: _s, ...safe } = payload
        PenggunaModel.update(username, safe)
      } else if (!callerIsPrivileged) {
        // Non-privileged caller: strip hak_akses change
        const { hak_akses: _r, ...safe } = payload
        PenggunaModel.update(username, safe)
      } else {
        PenggunaModel.update(username, payload)
      }

      // Activity log
      if (_caller) {
        const changes = Object.keys(payload).filter(k => k !== '_caller').join(', ')
        ActivityLogModel.log(
          _caller,
          `Mengubah data user: ${username}`,
          'USER_MANAGEMENT',
          `Field yang diubah: ${changes}`
        )
      }

      return { success: true, message: 'User berhasil diupdate' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async changePassword(username: string, oldPassword: string, newPassword: string) {
    try {
      const user = PenggunaModel.findByUsername(username)
      if (!user) {
        return { success: false, message: 'User tidak ditemukan' }
      }

      // Verify old password (support both SHA1 and bcrypt)
      const { verifyPassword, isSHA1Hash, encryptPassword, hashPassword } = await import('../services/crypto.js')
      
      let isValid = false
      if (isSHA1Hash(user.kata_sandi || '')) {
        // Old SHA1 password
        const oldEncrypted = encryptPassword(oldPassword)
        isValid = user.kata_sandi === oldEncrypted
      } else {
        // Bcrypt password
        isValid = await verifyPassword(oldPassword, user.kata_sandi || '')
      }

      if (!isValid) {
        return { success: false, message: 'Password lama salah' }
      }

      // Update with new password (bcrypt)
      const newHashed = await hashPassword(newPassword)
      PenggunaModel.update(username, { kata_sandi: newHashed })

      return { success: true, message: 'Password berhasil diubah' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async resetPassword(username: string, newPassword: string, caller?: string) {
    try {
      const { hashPassword } = await import('../services/crypto.js')
      const hashed = await hashPassword(newPassword)
      PenggunaModel.update(username, { kata_sandi: hashed })

      // Activity log
      if (caller) {
        ActivityLogModel.log(
          caller,
          `Mereset password user: ${username}`,
          'USER_MANAGEMENT'
        )
      }

      return { success: true, message: 'Password berhasil direset' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(username: string, caller?: string) {
    try {
      if (PROTECTED_USERS.includes(username)) {
        return { success: false, message: `Akun ${username} tidak dapat dihapus` }
      }

      const user = PenggunaModel.findByUsername(username)
      PenggunaModel.delete(username)

      // Activity log
      if (caller && user) {
        ActivityLogModel.log(
          caller,
          `Menghapus user: ${username}`,
          'USER_MANAGEMENT',
          `Nama: ${user.nama_lengkap}, Hak akses: ${user.hak_akses}`
        )
      }

      return { success: true, message: 'User berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static toggleStatus(username: string, caller?: string) {
    try {
      const user = PenggunaModel.findByUsername(username)
      if (!user) {
        return { success: false, message: 'User tidak ditemukan' }
      }

      if (PROTECTED_USERS.includes(username) && user.status_user === 'Aktif') {
        return { success: false, message: `Akun ${username} tidak dapat dinonaktifkan` }
      }

      const newStatus = user.status_user === 'Aktif' ? 'Nonaktif' : 'Aktif'
      PenggunaModel.update(username, { status_user: newStatus })

      // Activity log
      if (caller) {
        ActivityLogModel.log(
          caller,
          `Mengubah status user: ${username}`,
          'USER_MANAGEMENT',
          `Status: ${user.status_user} → ${newStatus}`
        )
      }

      return { success: true, message: `User berhasil di${newStatus === 'Aktif' ? 'aktifkan' : 'nonaktifkan'}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getPermissions(username: string) {
    try {
      const rows = sqlite.prepare(
        'SELECT menu_code, status FROM mediasoft_grup_pengguna_hak_akses WHERE nama_grup = ?'
      ).all(username) as { menu_code: string; status: string }[]
      const permissions: Record<string, boolean> = {}
      for (const r of rows) permissions[r.menu_code] = r.status === 'True'
      return { success: true, data: permissions }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static savePermissions(username: string, permissions: Record<string, boolean>) {
    try {
      sqlite.prepare('INSERT OR IGNORE INTO mediasoft_grup_pengguna (nama_grup) VALUES (?)').run(username)
      const upsert = sqlite.prepare(`
        INSERT INTO mediasoft_grup_pengguna_hak_akses (nama_grup, menu_code, status)
        VALUES (?, ?, ?)
        ON CONFLICT(nama_grup, menu_code) DO UPDATE SET status = excluded.status
      `)
      const run = sqlite.transaction(() => {
        for (const [menu_code, allowed] of Object.entries(permissions)) {
          upsert.run(username, menu_code, allowed ? 'True' : 'False')
        }
      })
      run()
      return { success: true, message: 'Izin akses berhasil disimpan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
