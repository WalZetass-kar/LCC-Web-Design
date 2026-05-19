import { PenggunaModel } from '../models/PenggunaModel.js'
import { IdentitasModel } from '../models/IdentitasModel.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { AuthSessionModel, type AuthDeviceInfo } from '../models/AuthSessionModel.js'
import { encryptPassword, verifyPassword, isSHA1Hash } from '../services/crypto.js'
import { rateLimiter } from '../services/rateLimiter.js'
import { validatePasswordStrength } from '../../shared/passwordPolicy.js'

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

type AuthUserRecord = NonNullable<ReturnType<typeof PenggunaModel.findActiveByUsername>>

interface RestoreSessionInput {
  username?: string
  sessionToken?: string
  deviceInfo?: AuthDeviceInfo
}

const PIN_PATTERN = /^\d{4,8}$/

function normalizeDeviceInfo(input?: AuthDeviceInfo | string | null): AuthDeviceInfo {
  if (!input) return {}
  if (typeof input === 'string') return { ipAddress: input }
  return {
    ipAddress: input.ipAddress ?? null,
    deviceId: input.deviceId ?? null,
    deviceName: input.deviceName ?? null,
    userAgent: input.userAgent ?? null,
  }
}

function deviceDetail(device: AuthDeviceInfo): string {
  const parts = [
    device.deviceName ? `device=${device.deviceName}` : null,
    device.deviceId ? `device_id=${device.deviceId}` : null,
    device.ipAddress ? `ip=${device.ipAddress}` : null,
    device.userAgent ? `ua=${device.userAgent.slice(0, 160)}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join('; ') : 'device=unknown'
}

function validatePin(pin: string): string | null {
  if (!PIN_PATTERN.test(pin)) {
    return 'PIN kasir harus 4-8 digit angka'
  }
  return null
}

function toSession(user: AuthUserRecord, auth?: { token: string; expires_at: string; device_id?: string | null }) {
  return {
    nama_pengguna: user.nama_pengguna,
    nama_lengkap: user.nama_lengkap,
    hak_akses: user.hak_akses || 'kasir',
    access_expires_at: hasUnlimitedAccessRole(user.hak_akses) ? null : user.access_expires_at ?? null,
    access_days_remaining: hasUnlimitedAccessRole(user.hak_akses) ? null : getAccessDaysRemaining(user.access_expires_at),
    must_change_password: !!user.must_change_password,
    session_token: auth?.token,
    session_expires_at: auth?.expires_at,
    device_id: auth?.device_id ?? null,
  }
}

export class AuthController {
  static hasUsers() {
    return { success: true, data: { hasUsers: PenggunaModel.count() > 0 } }
  }

  static async createInitialAdmin(data: {
    username?: string
    nama_lengkap?: string
    password?: string
  }) {
    if (PenggunaModel.count() > 0) {
      return { success: false, message: 'Setup awal sudah selesai' }
    }

    const username = (data.username ?? '').trim()
    const namaLengkap = (data.nama_lengkap ?? '').trim()
    const password = data.password ?? ''

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      return {
        success: false,
        message: 'Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau strip',
      }
    }

    if (!namaLengkap) {
      return { success: false, message: 'Nama lengkap wajib diisi' }
    }

    const validation = validatePasswordStrength(password)
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    await PenggunaModel.create({
      nama_pengguna: username,
      nama_lengkap: namaLengkap,
      kata_sandi: password,
      hak_akses: 'superadmin',
      access_expires_at: null,
      must_change_password: 0,
    })

    ActivityLogModel.create({
      username,
      aktivitas: 'INITIAL_ADMIN_CREATED',
      modul: 'AUTH',
      tgl_aktivitas: new Date().toISOString(),
      detail: 'Akun superadmin pertama dibuat melalui setup awal',
    })

    return { success: true, message: 'Akun admin pertama berhasil dibuat' }
  }

  /**
   * Login with enhanced security
   * - Rate limiting to prevent brute force
   * - Support both SHA1 (legacy) and bcrypt
   * - Auto-migrate SHA1 to bcrypt on successful login
   * - Activity logging
   */
  static async login(username: string, password: string, deviceInfo?: AuthDeviceInfo | string | null) {
    const device = normalizeDeviceInfo(deviceInfo)
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
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Login diblokir karena terlalu banyak percobaan gagal. Tersisa ${minutes} menit. ${deviceDetail(device)}`,
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
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Username tidak ditemukan atau akun tidak aktif. Sisa percobaan: ${attemptResult.remainingAttempts}. ${deviceDetail(device)}`,
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
        const storedPassword = user.kata_sandi || ''
        const legacyType = isSHA1Hash(storedPassword) ? 'SHA1' : 'plaintext'
        passwordValid = legacyType === 'SHA1'
          ? encryptPassword(password) === storedPassword
          : password === storedPassword
        
        // If valid, migrate to bcrypt
        if (passwordValid) {
          await PenggunaModel.migratePasswordToBcrypt(username, password, true)
          user.must_change_password = 1
          ActivityLogModel.create({
            username,
            aktivitas: 'PASSWORD_MIGRATED',
            modul: 'AUTH',
            tgl_aktivitas: new Date().toISOString(),
            ip_address: device.ipAddress ?? null,
            device_id: device.deviceId ?? null,
            user_agent: device.userAgent ?? null,
            detail: `Password berhasil dimigrasikan dari ${legacyType} ke bcrypt. ${deviceDetail(device)}`,
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
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Password salah. Sisa percobaan: ${attemptResult.remainingAttempts}. ${deviceDetail(device)}`,
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
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Masa akses akun berakhir pada ${user.access_expires_at}. ${deviceDetail(device)}`,
      })

      return {
        success: false,
        message: 'Masa akses akun sudah berakhir. Silakan hubungi admin untuk perpanjangan atau upgrade paket.',
      }
    }

    // Login successful - reset rate limiter
    rateLimiter.resetAttempts(username)
    PenggunaModel.updateLastLogin(username)
    const authSession = user.must_change_password
      ? null
      : AuthSessionModel.create(username, device)

    // ─── 2FA OTP LOGIC (Placeholder) ───
    // const otp = Math.floor(100000 + Math.random() * 900000).toString()
    // if (user.no_telp) await WhatsAppService.sendMessage({ to: user.no_telp, message: `OTP Login: ${otp}` })

    // Log successful login
    ActivityLogModel.create({
      username,
      aktivitas: 'LOGIN',
      modul: 'AUTH',
      tgl_aktivitas: new Date().toISOString(),
      ip_address: device.ipAddress ?? null,
      device_id: device.deviceId ?? null,
      user_agent: device.userAgent ?? null,
      detail: `Login berhasil dengan hash type: ${hashType}. ${deviceDetail(device)}`,
    })

    return {
      success: true,
      message: user.must_change_password ? 'Password wajib diganti sebelum menggunakan aplikasi' : 'Login berhasil',
      data: toSession(user, authSession ? {
        token: authSession.token,
        expires_at: authSession.expires_at,
        device_id: device.deviceId ?? null,
      } : undefined),
    }
  }

  static async loginWithPin(username: string, pin: string, deviceInfo?: AuthDeviceInfo | string | null) {
    const device = normalizeDeviceInfo(deviceInfo)
    username = (username?.trim() || '')

    if (!username || !pin?.trim()) {
      return { success: false, message: 'Username dan PIN tidak boleh kosong' }
    }

    const pinError = validatePin(pin)
    if (pinError) return { success: false, message: pinError }

    const limiterKey = `pin:${username}`
    const lockStatus = rateLimiter.isLocked(limiterKey)
    if (lockStatus.locked) {
      const minutes = Math.ceil((lockStatus.remainingTime || 0) / 60)
      ActivityLogModel.create({
        username,
        aktivitas: 'PIN_LOGIN_BLOCKED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Login PIN diblokir. Tersisa ${minutes} menit. ${deviceDetail(device)}`,
      })
      return {
        success: false,
        message: `Login PIN diblokir karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`,
      }
    }

    const user = PenggunaModel.findActiveByUsername(username)
    const deny = (detail: string) => {
      const attemptResult = rateLimiter.recordFailedAttempt(limiterKey)
      ActivityLogModel.create({
        username,
        aktivitas: 'PIN_LOGIN_FAILED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `${detail}. Sisa percobaan: ${attemptResult.remainingAttempts}. ${deviceDetail(device)}`,
      })
      return {
        success: false,
        message: attemptResult.locked
          ? 'Terlalu banyak percobaan PIN gagal. Akun diblokir selama 15 menit.'
          : `Username atau PIN salah. Sisa percobaan: ${attemptResult.remainingAttempts}`,
      }
    }

    if (!user || user.hak_akses !== 'kasir' || !user.pin_enabled || !user.pin_hash) {
      return deny('PIN tidak aktif untuk user atau user bukan kasir')
    }

    const pinValid = await verifyPassword(pin, user.pin_hash)
    if (!pinValid) {
      return deny('PIN salah')
    }

    if (!hasUnlimitedAccessRole(user.hak_akses) && isAccessExpired(user.access_expires_at)) {
      ActivityLogModel.create({
        username,
        aktivitas: 'PIN_LOGIN_EXPIRED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Masa akses akun berakhir pada ${user.access_expires_at}. ${deviceDetail(device)}`,
      })

      return {
        success: false,
        message: 'Masa akses akun sudah berakhir. Silakan hubungi admin.',
      }
    }

    rateLimiter.resetAttempts(limiterKey)
    PenggunaModel.updateLastLogin(username)
    const authSession = AuthSessionModel.create(username, device)

    ActivityLogModel.create({
      username,
      aktivitas: 'PIN_LOGIN',
      modul: 'AUTH',
      tgl_aktivitas: new Date().toISOString(),
      ip_address: device.ipAddress ?? null,
      device_id: device.deviceId ?? null,
      user_agent: device.userAgent ?? null,
      detail: `Login PIN kasir berhasil. ${deviceDetail(device)}`,
    })

    return {
      success: true,
      message: 'Login PIN berhasil',
      data: toSession(user, {
        token: authSession.token,
        expires_at: authSession.expires_at,
        device_id: device.deviceId ?? null,
      }),
    }
  }

  /**
   * Logout user
   */
  static logout(username: string, sessionToken?: string, deviceInfo?: AuthDeviceInfo | string | null) {
    const device = normalizeDeviceInfo(deviceInfo)
    if (sessionToken) {
      AuthSessionModel.revoke(sessionToken)
    }

    ActivityLogModel.create({
      username,
      aktivitas: 'LOGOUT',
      modul: 'AUTH',
      tgl_aktivitas: new Date().toISOString(),
      ip_address: device.ipAddress ?? null,
      device_id: device.deviceId ?? null,
      user_agent: device.userAgent ?? null,
      detail: `Logout berhasil. ${deviceDetail(device)}`,
    })

    return { success: true, message: 'Logout berhasil' }
  }

  /**
   * Restore renderer session into the main-process session guard.
   * The renderer only sends username; role/status are reloaded from database.
   */
  static restoreSession(input: string | RestoreSessionInput) {
    const username = (typeof input === 'string' ? input : input.username)?.trim() || ''
    const sessionToken = typeof input === 'string' ? '' : (input.sessionToken ?? '')
    const device = typeof input === 'string' ? {} : normalizeDeviceInfo(input.deviceInfo)
    if (!username) {
      return { success: false, message: 'Session tidak valid' }
    }

    if (!sessionToken || !AuthSessionModel.validate(sessionToken, username)) {
      ActivityLogModel.create({
        username,
        aktivitas: 'SESSION_RESTORE_FAILED',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Token sesi tidak valid atau sudah kedaluwarsa. ${deviceDetail(device)}`,
      })
      return { success: false, message: 'Session tidak valid atau sudah kedaluwarsa' }
    }

    const user = PenggunaModel.findActiveByUsername(username)
    if (!user) {
      return { success: false, message: 'User tidak ditemukan atau tidak aktif' }
    }

    if (!hasUnlimitedAccessRole(user.hak_akses) && isAccessExpired(user.access_expires_at)) {
      return { success: false, message: 'Masa akses akun sudah berakhir' }
    }

    if (user.must_change_password) {
      return { success: false, message: 'Password wajib diganti sebelum session dipulihkan' }
    }

    return {
      success: true,
      data: toSession(user),
    }
  }

  /**
   * Change password with validation
   */
  static async changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
    deviceInfo?: AuthDeviceInfo | string | null
  ) {
    const device = normalizeDeviceInfo(deviceInfo)
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
        const storedPassword = user.kata_sandi || ''
        oldPasswordValid = isSHA1Hash(storedPassword)
          ? encryptPassword(oldPassword) === storedPassword
          : oldPassword === storedPassword
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
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Password lama salah. ${deviceDetail(device)}`,
      })
      
      return { success: false, message: 'Password lama salah' }
    }

    // Update password
    try {
      await PenggunaModel.updatePassword(username, newPassword)
      AuthSessionModel.revokeAllForUser(username)
      
      ActivityLogModel.create({
        username,
        aktivitas: 'CHANGE_PASSWORD',
        modul: 'AUTH',
        tgl_aktivitas: new Date().toISOString(),
        ip_address: device.ipAddress ?? null,
        device_id: device.deviceId ?? null,
        user_agent: device.userAgent ?? null,
        detail: `Password berhasil diubah dan semua sesi lama dicabut. Strength: ${validation.strength}. ${deviceDetail(device)}`,
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
