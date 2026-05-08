import { BarangModel } from '../models/BarangModel.js'
import { validateDemoMode } from '../utils/demoMode.js'
import { paginate, type PaginationParams } from '../utils/pagination.js'
import { batchDelete, batchUpdate, batchInsert } from '../utils/transaction.js'
import { BackupController } from './BackupController.js'

export class BarangController {
  static getAll() {
    return { success: true, data: BarangModel.getAll() }
  }

  static getPaginated(params: PaginationParams) {
    try {
      const result = paginate('mediasoft_barang', {
        ...params,
        searchFields: ['nama_barang', 'kd_barang', 'barcode'],
      })
      return { success: true, ...result }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Bulk delete products
   */
  static bulkDelete(ids: string[], username?: string) {
    const demoError = validateDemoMode(username)
    if (demoError) return demoError

    // Auto backup before bulk delete
    BackupController.autoBackup('bulk_delete_products')

    const result = batchDelete('mediasoft_barang', 'kd_barang', ids)
    if (result.success) {
      // Also delete from harga table
      batchDelete('mediasoft_harga', 'kd_barang', ids)
      return { success: true, message: `${result.deleted} produk berhasil dihapus` }
    }
    return { success: false, message: result.error }
  }

  /**
   * Bulk update products
   */
  static bulkUpdate(updates: Array<{ kd_barang: string; [key: string]: any }>, username?: string) {
    const demoError = validateDemoMode(username)
    if (demoError) return demoError

    // Auto backup before bulk update
    BackupController.autoBackup('bulk_update_products')

    const result = batchUpdate('mediasoft_barang', 'kd_barang', updates)
    if (result.success) {
      return { success: true, message: `${result.updated} produk berhasil diupdate` }
    }
    return { success: false, message: result.error }
  }

  /**
   * Bulk import products from CSV
   */
  static bulkImport(products: any[], username?: string) {
    const demoError = validateDemoMode(username)
    if (demoError) return demoError

    // Auto backup before import
    BackupController.autoBackup('bulk_import_products')

    try {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      const enriched = products.map(p => ({
        ...p,
        tgl_wkt_simpan: now,
        nama_pengguna: username || 'system',
      }))

      const result = batchInsert('mediasoft_barang', enriched)
      if (result.success) {
        return { success: true, message: `${result.inserted} produk berhasil diimport` }
      }
      return { success: false, message: result.error }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static search(q: string) {
    return { success: true, data: BarangModel.search(q) }
  }

  static create(data: Record<string, unknown>) {
    const demoError = validateDemoMode(data.nama_pengguna as string)
    if (demoError) return demoError

    if (!data.kd_barang || !data.nama_barang) {
      return { success: false, message: 'Kode dan nama barang wajib diisi' }
    }
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const enriched = { ...data, tgl_wkt_simpan: now, nama_pengguna: data.nama_pengguna || 'system' }
    BarangModel.create(enriched as Parameters<typeof BarangModel.create>[0])
    return { success: true, message: 'Produk berhasil ditambahkan' }
  }

  static update(kd: string, data: Record<string, unknown>) {
    const demoError = validateDemoMode(data.nama_pengguna as string)
    if (demoError) return demoError

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const enriched = { ...data, tgl_wkt_ubah: now }
    BarangModel.update(kd, enriched as Parameters<typeof BarangModel.update>[1])
    return { success: true, message: 'Produk berhasil diperbarui' }
  }

  static delete(kd: string) {
    // Note: delete doesn't receive username, will be blocked by api.ts wrapper
    BarangModel.delete(kd)
    return { success: true, message: 'Produk berhasil dihapus' }
  }
}
