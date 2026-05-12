import { PenggunaModel } from '../models/PenggunaModel.js'
import { IdentitasModel } from '../models/IdentitasModel.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { encryptPassword, verifyPassword, isSHA1Hash } from '../services/crypto.js'
import { rateLimiter } from '../services/rateLimiter.js'
import { sanitizeString, validatePasswordStrength } from '../services/sanitizer.js'

function isAccessExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false
  const expires = new Date(expiresAt)
  return !Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()
}

function hasUnlimitedAccessRole(role?: string | null): boolean {
  return role === 'developer' || role === 'superadmin'
}

function getAccessDaysRemaining(expiresAt?: string | null): number | null {
  if (!expiresAt) return null
  const expires = new Date(expiresAt)
  if (Number.isNaN(expires.getTime())) return null
  return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000))
}

export class AuthController {
  /**
   * Login with enhanced security
   * - Rate limiting to prevent brute force
   * - Support both SHA1 (legacy) and bcrypt
   * - Auto-migrate SHA1 to bcrypt on successful login
   * - Activity logging
   */
  static async login(username: string, password: string, ipAddress?: string) {
    // Note: Do NOT sanitize username with sanitizeString() here — it encodes
    // special chars (&, <, /) which breaks DB lookup. Drizzle uses parameterized
    // queries so SQL injection is already prevented at the ORM level.
    username = (username?.trim() || '')
    
    if (!username || !password?.trim()) {
      return { success: false, message: 'Username dan password tidak boleh kosong' }
    }

    // Check rate limiting
    const lockStatus = rateLimiter.isLocked(username)
    if (lockStatus.locked) {
      const minutes = Math.ceil((lockStatus.remainingTime || 0) / 60)
      ActivityLogModel.create({
        username,
        aktivitas: 'LOGIN_BLOCKED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: ipAddress,
        detail: `Login diblokir karena terlalu banyak percobaan gagal. Tersisa ${minutes} menit`,
      })
      
      return {
        success: false,
        message: `Akun diblokir karena terlalu banyak percobaan login gagal. Coba lagi dalam ${minutes} menit.`,
      }
    }

    // Find active user
    const user = PenggunaModel.findActiveByUsername(username)

    if (!user) {
      // Record failed attempt
      const attemptResult = rateLimiter.recordFailedAttempt(username)
      
      ActivityLogModel.create({
        username,
        aktivitas: 'LOGIN_FAILED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: ipAddress,
        detail: `Username tidak ditemukan atau akun tidak aktif. Sisa percobaan: ${attemptResult.remainingAttempts}`,
      })
      
      if (attemptResult.locked) {
        return {
          success: false,
          message: 'Terlalu banyak percobaan login gagal. Akun diblokir selama 15 menit.',
        }
      }
      
      return {
        success: false,
        message: `Username atau Password Salah! Sisa percobaan: ${attemptResult.remainingAttempts}`,
      }
    }

    // Verify password based on hash type
    let passwordValid = false
    const hashType = user.password_hash_type || 'sha1'

    try {
      if (hashType === 'bcrypt') {
        // Verify with bcrypt
        passwordValid = await verifyPassword(password, user.kata_sandi || '')
      } else {
        // Verify with SHA1 (legacy)
        const sha1Hash = encryptPassword(password)
        passwordValid = sha1Hash === user.kata_sandi
        
        // If valid, migrate to bcrypt
        if (passwordValid) {
          await PenggunaModel.migratePasswordToBcrypt(username, password)
          ActivityLogModel.create({
            username,
            aktivitas: 'PASSWORD_MIGRATED',
            modul: 'AUTH',
            tgl_aktivitas: new Date().toISOString(),
            ip_address: ipAddress,
            detail: 'Password berhasil dimigrasikan dari SHA1 ke bcrypt',
          })
        }
      }
    } catch (error) {
      console.error('Password verification error:', error)
      return { success: false, message: 'Terjadi kesalahan saat verifikasi password' }
    }

    if (!passwordValid) {
      // Record failed attempt
      const attemptResult = rateLimiter.recordFailedAttempt(username)
      
      ActivityLogModel.create({
        username,
        aktivitas: 'LOGIN_FAILED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: ipAddress,
        detail: `Password salah. Sisa percobaan: ${attemptResult.remainingAttempts}`,
      })
      
      if (attemptResult.locked) {
        return {
          success: false,
          message: 'Terlalu banyak percobaan login gagal. Akun diblokir selama 15 menit.',
        }
      }
      
      return {
        success: false,
        message: `Username atau Password Salah! Sisa percobaan: ${attemptResult.remainingAttempts}`,
      }
    }

    if (!hasUnlimitedAccessRole(user.hak_akses) && isAccessExpired(user.access_expires_at)) {
      ActivityLogModel.create({
        username,
        aktivitas: 'LOGIN_EXPIRED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: ipAddress,
        detail: `Masa akses akun berakhir pada ${user.access_expires_at}`,
      })

      return {
        success: false,
        message: 'Masa akses akun sudah berakhir. Silakan hubungi admin untuk perpanjangan atau upgrade paket.',
      }
    }

    // Login successful - reset rate limiter
    rateLimiter.resetAttempts(username)
    PenggunaModel.updateLastLogin(username)

    // ─── 2FA OTP LOGIC (Placeholder) ───
    // const otp = Math.floor(100000 + Math.random() * 900000).toString()
    // if (user.no_telp) await WhatsAppService.sendMessage({ to: user.no_telp, message: `OTP Login: ${otp}` })

    // Log successful login
    ActivityLogModel.create({
      username,
      aktivitas: 'LOGIN',
      modul: 'AUTH',
      tgl_aktivitas: new Date().toISOString(),
      ip_address: ipAddress,
      detail: `Login berhasil dengan hash type: ${hashType}`,
    })

    return {
      success: true,
      data: {
        nama_pengguna: user.nama_pengguna,
        nama_lengkap: user.nama_lengkap,
        hak_akses: user.hak_akses || 'kasir',
        access_expires_at: hasUnlimitedAccessRole(user.hak_akses) ? null : user.access_expires_at ?? null,
        access_days_remaining: hasUnlimitedAccessRole(user.hak_akses) ? null : getAccessDaysRemaining(user.access_expires_at),
      },
    }
  }

  /**
   * Logout user
   */
  static logout(username: string, ipAddress?: string) {
    ActivityLogModel.create({
      username,
      aktivitas: 'LOGOUT',
      modul: 'AUTH',
      tgl_aktivitas: new Date().toISOString(),
      ip_address: ipAddress,
      detail: 'Logout berhasil',
    })

    return { success: true, message: 'Logout berhasil' }
  }

  /**
   * Restore renderer session into the main-process session guard.
   * The renderer only sends username; role/status are reloaded from database.
   */
  static restoreSession(username: string) {
    username = (username?.trim() || '')
    if (!username) {
      return { success: false, message: 'Session tidak valid' }
    }

    const user = PenggunaModel.findActiveByUsername(username)
    if (!user) {
      return { success: false, message: 'User tidak ditemukan atau tidak aktif' }
    }

    if (!hasUnlimitedAccessRole(user.hak_akses) && isAccessExpired(user.access_expires_at)) {
      return { success: false, message: 'Masa akses akun sudah berakhir' }
    }

    return {
      success: true,
      data: {
        nama_pengguna: user.nama_pengguna,
        nama_lengkap: user.nama_lengkap,
        hak_akses: user.hak_akses || 'kasir',
        access_expires_at: hasUnlimitedAccessRole(user.hak_akses) ? null : user.access_expires_at ?? null,
        access_days_remaining: hasUnlimitedAccessRole(user.hak_akses) ? null : getAccessDaysRemaining(user.access_expires_at),
      },
    }
  }

  /**
   * Change password with validation
   */
  static async changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
    ipAddress?: string
  ) {
    // Validate new password strength
    const validation = validatePasswordStrength(newPassword)
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    // Verify old password
    const user = PenggunaModel.findActiveByUsername(username)
    if (!user) {
      return { success: false, message: 'User tidak ditemukan' }
    }

    const hashType = user.password_hash_type || 'sha1'
    let oldPasswordValid = false

    try {
      if (hashType === 'bcrypt') {
        oldPasswordValid = await verifyPassword(oldPassword, user.kata_sandi || '')
      } else {
        const sha1Hash = encryptPassword(oldPassword)
        oldPasswordValid = sha1Hash === user.kata_sandi
      }
    } catch (error) {
      console.error('Password verification error:', error)
      return { success: false, message: 'Terjadi kesalahan saat verifikasi password lama' }
    }

    if (!oldPasswordValid) {
      ActivityLogModel.create({
        username,
        aktivitas: 'CHANGE_PASSWORD_FAILED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: ipAddress,
        detail: 'Password lama salah',
      })
      
      return { success: false, message: 'Password lama salah' }
    }

    // Update password
    try {
      await PenggunaModel.updatePassword(username, newPassword)
      
      ActivityLogModel.create({
        username,
        aktivitas: 'CHANGE_PASSWORD',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: ipAddress,
        detail: `Password berhasil diubah. Strength: ${validation.strength}`,
      })

      return {
        success: true,
        message: 'Password berhasil diubah',
        data: { strength: validation.strength },
      }
    } catch (error) {
      console.error('Password update error:', error)
      return { success: false, message: 'Gagal mengubah password' }
    }
  }

  /**
   * Check if store identity exists (for first-login prompt)
   */
  static checkIdentitas() {
    const identitas = IdentitasModel.get()
    return { success: true, data: { hasIdentitas: !!identitas?.namatoko } }
  }

  /**
   * Get password migration status
   */
  static getMigrationStatus() {
    const allUsers = PenggunaModel.getAll()
    const total = allUsers.length
    const migrated = allUsers.filter(u => u.password_hash_type === 'bcrypt').length
    const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0

    return {
      success: true,
      data: {
        total,
        migrated,
        pending: total - migrated,
        percentage,
      },
    }
  }
}
