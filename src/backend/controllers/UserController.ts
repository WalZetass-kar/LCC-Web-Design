import { PenggunaModel } from '../models/PenggunaModel.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { encryptPassword } from '../services/crypto.js'
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

  static create(data: {
    nama_pengguna: string
    kata_sandi: string
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

      // Encrypt password
      const encrypted = encryptPassword(data.kata_sandi)

      PenggunaModel.create({
        ...data,
        kata_sandi: encrypted,
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

  static resetPassword(username: string, newPassword: string, caller?: string) {
    try {
      const encrypted = encryptPassword(newPassword)
      PenggunaModel.update(username, { kata_sandi: encrypted })

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
