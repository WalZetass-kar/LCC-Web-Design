import { z } from 'zod'

// Product validation
export const productSchema = z.object({
  kd_barang: z.string().min(1, 'Kode barang wajib diisi').max(50),
  nama_barang: z.string().min(1, 'Nama barang wajib diisi').max(200),
  stok: z.number().int().min(0, 'Stok tidak boleh negatif'),
  harga_barang: z.number().min(0, 'Harga tidak boleh negatif'),
  harga_modal: z.number().min(0, 'Harga modal tidak boleh negatif'),
  potongan: z.number().int().min(0).max(100, 'Diskon maksimal 100%'),
  kd_kategori_barang: z.number().int().positive('Kategori wajib dipilih'),
  kd_satuan: z.number().int().positive('Satuan wajib dipilih'),
  deskripsi_barang: z.string().max(500).optional(),
  barcode: z.string().max(50).optional(),
  expired_date: z.string().optional(),
})

// Customer validation
export const customerSchema = z.object({
  kd_customer: z.string().min(1).max(50),
  nama_customer: z.string().min(1, 'Nama customer wajib diisi').max(200),
  no_telp: z.string().regex(/^[0-9+\-\s()]*$/, 'Format nomor telepon tidak valid').max(20).optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  alamat: z.string().max(500).optional(),
  tgl_lahir: z.string().optional(),
})

// Supplier validation
export const supplierSchema = z.object({
  kd_suplier: z.string().min(1).max(50),
  nama_suplier: z.string().min(1, 'Nama supplier wajib diisi').max(200),
  alamat_suplier: z.string().max(500).optional(),
  no_telp_hp: z.string().regex(/^[0-9+\-\s()]*$/, 'Format nomor telepon tidak valid').max(20).optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
})

// User validation
export const userSchema = z.object({
  nama_pengguna: z.string().min(3, 'Username minimal 3 karakter').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  kata_sandi: z.string().min(8, 'Password minimal 8 karakter').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, kecil, dan angka'),
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi').max(200),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  no_telp: z.string().regex(/^[0-9+\-\s()]*$/, 'Format nomor telepon tidak valid').max(20).optional(),
  hak_akses: z.enum(['developer', 'superadmin', 'admin', 'operator', 'kasir']),
})

// Transaction validation
export const transactionSchema = z.object({
  cart: z.array(z.object({
    kd_barang: z.string(),
    nama_barang: z.string(),
    harga_jual: z.number().positive(),
    harga_modal: z.number().min(0),
    qty: z.number().int().positive('Qty harus lebih dari 0'),
    disc: z.number().int().min(0).max(100),
  })).min(1, 'Keranjang tidak boleh kosong'),
  bayar: z.number().positive('Jumlah bayar harus lebih dari 0'),
  jenis_pembayaran: z.enum(['TUNAI', 'TRANSFER', 'QRIS', 'KARTU', 'E-WALLET']),
})

// Kas validation
export const kasSchema = z.object({
  modal_awal: z.number().min(0, 'Modal awal tidak boleh negatif'),
  catatan: z.string().max(500).optional(),
})

// Generic validation helper
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return { success: false, errors: ['Validation error'] }
  }
}

// Sanitize string input (prevent XSS)
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// Sanitize object recursively
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }
  return sanitized
}
