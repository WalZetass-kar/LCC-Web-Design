import { db } from '../../database/connection.js'
import { pengguna } from '../../database/schema.js'
import { eq, and } from 'drizzle-orm'
import { hashPassword } from '../services/crypto.js'

export class PenggunaModel {
  static getAll() {
    return db.select().from(pengguna).all()
  }

  static findByUsername(nama_pengguna: string) {
    return db.select().from(pengguna)
      .where(eq(pengguna.nama_pengguna, nama_pengguna))
      .get()
  }

  static count() {
    return db.select().from(pengguna).all().length
  }

  static findActive(nama_pengguna: string, kata_sandi: string) {
    return db
      .select()
      .from(pengguna)
      .where(
        and(
          eq(pengguna.nama_pengguna, nama_pengguna),
          eq(pengguna.kata_sandi, kata_sandi),
          eq(pengguna.status_user, 'Aktif')
        )
      )
      .get()
  }

  /**
   * Find active user by username only (for password verification)
   * @param nama_pengguna - Username
   * @returns User object or undefined
   */
  static findActiveByUsername(nama_pengguna: string) {
    return db
      .select()
      .from(pengguna)
      .where(
        and(
          eq(pengguna.nama_pengguna, nama_pengguna),
          eq(pengguna.status_user, 'Aktif')
        )
      )
      .get()
  }

  /**
   * Create new user with bcrypt password hash
   * @param data - User data
   * @returns Insert result
   */
  static async create(data: {
    nama_pengguna: string
    kata_sandi: string
    nama_lengkap: string
    email?: string
    no_telp?: string
    hak_akses?: string
    access_expires_at?: string | null
    must_change_password?: number
    pin_hash?: string | null
    pin_enabled?: number
  }) {
    // Hash password with bcrypt
    const hashedPassword = await hashPassword(data.kata_sandi)
    
    return db.insert(pengguna).values({
      ...data,
      kata_sandi: hashedPassword,
      tgl_wkt_simpan: new Date().toISOString(),
      status_user: 'Aktif',
      hak_akses: data.hak_akses || 'kasir',
      password_hash_type: 'bcrypt', // New users use bcrypt
      must_change_password: data.must_change_password ?? 1,
      pin_hash: data.pin_hash ?? null,
      pin_hash_type: data.pin_hash ? 'bcrypt' : null,
      pin_enabled: data.pin_hash ? (data.pin_enabled ?? 1) : 0,
    }).run()
  }

  static update(nama_pengguna: string, data: Partial<typeof pengguna.$inferInsert>) {
    return db.update(pengguna).set({
      ...data,
      tgl_wkt_edit: new Date().toISOString(),
    }).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  /**
   * Update user password with bcrypt hash
   * @param nama_pengguna - Username
   * @param newPassword - New plain text password
   * @returns Update result
   */
  static async updatePassword(nama_pengguna: string, newPassword: string, mustChangePassword = false) {
    const hashedPassword = await hashPassword(newPassword)
    
    return db.update(pengguna).set({
      kata_sandi: hashedPassword,
      password_hash_type: 'bcrypt',
      must_change_password: mustChangePassword ? 1 : 0,
      tgl_wkt_edit: new Date().toISOString(),
    }).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  static updatePin(nama_pengguna: string, pinHash: string | null, enabled: boolean) {
    return db.update(pengguna).set({
      pin_hash: pinHash,
      pin_hash_type: pinHash ? 'bcrypt' : null,
      pin_enabled: enabled && pinHash ? 1 : 0,
      tgl_wkt_edit: new Date().toISOString(),
    }).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  /**
   * Migrate user password from SHA1 to bcrypt
   * @param nama_pengguna - Username
   * @param plainPassword - Plain text password (verified with SHA1)
   * @returns Update result
   */
  static async migratePasswordToBcrypt(nama_pengguna: string, plainPassword: string, mustChangePassword = true) {
    const hashedPassword = await hashPassword(plainPassword)
    
    return db.update(pengguna).set({
      kata_sandi: hashedPassword,
      password_hash_type: 'bcrypt',
      must_change_password: mustChangePassword ? 1 : 0,
      tgl_wkt_edit: new Date().toISOString(),
    }).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  static delete(nama_pengguna: string) {
    return db.delete(pengguna).where(eq(pengguna.nama_pengguna, nama_pengguna)).run()
  }

  static updateLastLogin(nama_pengguna: string) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    db.update(pengguna)
      .set({ terakhir_login: now })
      .where(eq(pengguna.nama_pengguna, nama_pengguna))
      .run()
  }

  /**
   * Check if user password is SHA1 format
   * @param nama_pengguna - Username
   * @returns True if password is SHA1 format
   */
  static isSHA1Password(nama_pengguna: string): boolean {
    const user = this.findByUsername(nama_pengguna)
    return user?.password_hash_type === 'sha1' || !user?.password_hash_type
  }

  /**
   * Get password hash type for user
   * @param nama_pengguna - Username
   * @returns Hash type ('sha1' or 'bcrypt')
   */
  static getPasswordHashType(nama_pengguna: string): 'sha1' | 'bcrypt' | null {
    const user = this.findByUsername(nama_pengguna)
    return (user?.password_hash_type as 'sha1' | 'bcrypt') || null
  }
}
