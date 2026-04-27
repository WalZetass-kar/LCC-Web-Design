import { z } from 'zod'

// Validation schemas
export const BarangSchema = z.object({
  nama_barang: z.string().min(1, 'Nama barang wajib diisi'),
  kd_kategori_barang: z.number().int().positive('Kategori wajib dipilih'),
  kd_satuan: z.number().int().positive('Satuan wajib dipilih'),
  harga_barang: z.number().min(0, 'Harga tidak boleh negatif'),
  harga_modal: z.number().min(0, 'Harga modal tidak boleh negatif'),
  stok: z.number().int().min(0, 'Stok tidak boleh negatif'),
  stok_minimum: z.number().int().min(0, 'Stok minimum tidak boleh negatif'),
  potongan: z.number().min(0).max(100, 'Potongan harus 0-100%').optional(),
  barcode: z.string().optional(),
  expired_date: z.string().optional(),
})

export const CustomerSchema = z.object({
  nama_customer: z.string().min(1, 'Nama customer wajib diisi'),
  no_telp: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  alamat: z.string().optional(),
  tgl_lahir: z.string().optional(),
})

export const SupplierSchema = z.object({
  nama_suplier: z.string().min(1, 'Nama supplier wajib diisi'),
  alamat_suplier: z.string().optional(),
  no_telp_hp: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
})

export const UserSchema = z.object({
  nama_pengguna: z.string().min(3, 'Username minimal 3 karakter'),
  kata_sandi: z.string().min(4, 'Password minimal 4 karakter'),
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  no_telp: z.string().optional(),
  role: z.enum(['ADMIN', 'KASIR', 'OWNER'], {
    errorMap: () => ({ message: 'Role harus ADMIN, KASIR, atau OWNER' }),
  }),
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
  catatan: z.string().optional(),
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
}
