import { z } from 'zod'

// Custom password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

// Validation schemas
export const BarangSchema = z.object({
  nama_barang: z.string().min(1, 'Nama barang wajib diisi').max(200, 'Nama barang maksimal 200 karakter'),
  kd_kategori_barang: z.number().int().positive('Kategori wajib dipilih'),
  kd_satuan: z.number().int().positive('Satuan wajib dipilih'),
  harga_barang: z.number().min(0, 'Harga tidak boleh negatif'),
  harga_modal: z.number().min(0, 'Harga modal tidak boleh negatif'),
  stok: z.number().int().min(0, 'Stok tidak boleh negatif'),
  stok_minimum: z.number().int().min(0, 'Stok minimum tidak boleh negatif'),
  potongan: z.number().min(0).max(100, 'Potongan harus 0-100%').optional(),
  barcode: z.string().max(50, 'Barcode maksimal 50 karakter').optional(),
  expired_date: z.string().optional(),
})

export const CustomerSchema = z.object({
  nama_customer: z.string().min(1, 'Nama customer wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  no_telp: z.string().max(20, 'Nomor telepon maksimal 20 karakter').optional(),
  email: z.string().email('Email tidak valid').max(100, 'Email maksimal 100 karakter').optional().or(z.literal('')),
  alamat: z.string().max(500, 'Alamat maksimal 500 karakter').optional(),
  tgl_lahir: z.string().optional(),
})

export const SupplierSchema = z.object({
  nama_suplier: z.string().min(1, 'Nama supplier wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  alamat_suplier: z.string().max(500, 'Alamat maksimal 500 karakter').optional(),
  no_telp_hp: z.string().max(20, 'Nomor telepon maksimal 20 karakter').optional(),
  email: z.string().email('Email tidak valid').max(100, 'Email maksimal 100 karakter').optional().or(z.literal('')),
})

export const UserSchema = z.object({
  nama_pengguna: z.string().min(3, 'Username minimal 3 karakter').max(20, 'Username maksimal 20 karakter'),
  kata_sandi: z.string().min(8, 'Password minimal 8 karakter').max(100, 'Password maksimal 100 karakter'),
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Email tidak valid').max(100, 'Email maksimal 100 karakter').optional().or(z.literal('')),
  no_telp: z.string().max(20, 'Nomor telepon maksimal 20 karakter').optional(),
  hak_akses: z.enum(['developer', 'operator', 'kasir', 'admin'], {
    errorMap: () => ({ message: 'Hak akses harus developer, operator, kasir, atau admin' }),
  }),
})

// Strong password schema for new users and password changes
export const StrongPasswordSchema = z.object({
  kata_sandi: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .regex(passwordRegex, 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol'),
})

export const KasSchema = z.object({
  modal_awal: z.number().min(0, 'Modal awal tidak boleh negatif'),
  catatan: z.string().optional(),
})

export const PembelianSchema = z.object({
  kd_suplier: z.string().min(1, 'Supplier wajib dipilih'),
  items: z
    .array(
      z.object({
        kd_barang: z.string().min(1, 'Barang wajib dipilih'),
        qty: z.number().int().positive('Qty harus lebih dari 0'),
        harga_beli: z.number().min(0, 'Harga beli tidak boleh negatif'),
      })
    )
    .min(1, 'Minimal 1 item'),
  yang_dibayar: z.number().min(0, 'Jumlah bayar tidak boleh negatif'),
  catatan: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
})

// File upload validation schema
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Nama file wajib diisi'),
  size: z.number().max(5 * 1024 * 1024, 'Ukuran file maksimal 5MB'),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'], {
    errorMap: () => ({ message: 'Tipe file harus JPG, PNG, atau GIF' }),
  }),
})

// Validation helper
export class ValidationService {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
    try {
      const validated = schema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => e.message)
        return { success: false, errors }
      }
      return { success: false, errors: ['Validation error'] }
    }
  }

  static validateBarang(data: unknown) {
    return this.validate(BarangSchema, data)
  }

  static validateCustomer(data: unknown) {
    return this.validate(CustomerSchema, data)
  }

  static validateSupplier(data: unknown) {
    return this.validate(SupplierSchema, data)
  }

  static validateUser(data: unknown) {
    return this.validate(UserSchema, data)
  }

  static validateKas(data: unknown) {
    return this.validate(KasSchema, data)
  }

  static validatePembelian(data: unknown) {
    return this.validate(PembelianSchema, data)
  }

  static validateFileUpload(data: unknown) {
    return this.validate(FileUploadSchema, data)
  }

  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Object with validity and error message
   */
  static validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (!password) {
      return { valid: false, error: 'Password tidak boleh kosong' }
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password minimal 8 karakter' }
    }

    if (password.length > 100) {
      return { valid: false, error: 'Password maksimal 100 karakter' }
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password harus mengandung huruf kecil' }
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password harus mengandung huruf besar' }
    }

    if (!/\d/.test(password)) {
      return { valid: false, error: 'Password harus mengandung angka' }
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, error: 'Password harus mengandung simbol' }
    }

    return { valid: true }
  }

  /**
   * Validate strong password (for new users)
   * @param password - Password to validate
   * @returns Validation result
   */
  static validateStrongPassword(password: string) {
    return this.validate(StrongPasswordSchema, { kata_sandi: password })
  }
}
