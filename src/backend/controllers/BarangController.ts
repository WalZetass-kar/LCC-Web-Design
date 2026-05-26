import { BarangModel } from '../models/BarangModel.js'
import { validateDemoMode } from '../utils/demoMode.js'
import { paginate, type PaginationParams } from '../utils/pagination.js'
import { batchDelete, batchUpdate, batchInsert } from '../utils/transaction.js'
import { BackupController } from './BackupController.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { checkProductLimit, getLimitPopup, getSubscriptionStatus, getUpgradePopup } from '../middleware/subscriptionGuard.js'

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

    const account = username || 'system'
    const subscription = getSubscriptionStatus(account)
    if (subscription.is_expired) {
      ActivityLogModel.create({
        username: account,
        aktivitas: 'PRODUCT_IMPORT_BLOCKED_EXPIRED',
        modul: 'BARANG',
        tgl_aktivitas: new Date().toISOString(),
        event_type: 'subscription',
        detail: `Import ${products.length} produk ditolak karena masa akses berakhir pada ${subscription.expires_at}`,
      })
      return {
        success: false,
        error_code: 'EXPIRED',
        message: 'Masa akses akun sudah berakhir. Upgrade paket untuk melanjutkan import produk.',
        data: { popup: getUpgradePopup(account) },
      }
    }

    const limit = checkProductLimit(account, products.length)
    if (!limit.allowed) {
      ActivityLogModel.create({
        username: account,
        aktivitas: 'PRODUCT_IMPORT_LIMIT_BLOCKED',
        modul: 'BARANG',
        tgl_aktivitas: new Date().toISOString(),
        event_type: 'subscription',
        detail: `Import produk ditolak; used=${limit.used}; incoming=${products.length}; max=${limit.max}`,
      })
      return {
        success: false,
        error_code: 'PRODUCT_LIMIT',
        message: `Limit produk paket Anda sudah tercapai (${limit.used}/${limit.max}). Upgrade paket untuk menambah produk.`,
        data: { ...limit, incoming: products.length, popup: getLimitPopup('PRODUCT_LIMIT') },
      }
    }

    // Auto backup before import
    BackupController.autoBackup('bulk_import_products')

    try {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      const enriched = products.map(p => ({
        ...p,
        tgl_wkt_simpan: now,
        nama_pengguna: account,
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
    const username = String(data.nama_pengguna || 'system')
    const demoError = validateDemoMode(username)
    if (demoError) return demoError

    if (!data.kd_barang || !data.nama_barang) {
      return { success: false, message: 'Kode dan nama barang wajib diisi' }
    }

    const subscription = getSubscriptionStatus(username)
    if (subscription.is_expired) {
      ActivityLogModel.create({
        username,
        aktivitas: 'PRODUCT_CREATE_BLOCKED_EXPIRED',
        modul: 'BARANG',
        tgl_aktivitas: new Date().toISOString(),
        event_type: 'subscription',
        detail: `Tambah produk ${String(data.kd_barang)} ditolak karena masa akses berakhir pada ${subscription.expires_at}`,
      })
      return {
        success: false,
        error_code: 'EXPIRED',
        message: 'Masa akses akun sudah berakhir. Upgrade paket untuk menambah produk.',
        data: { popup: getUpgradePopup(username) },
      }
    }

    const limit = checkProductLimit(username, 1)
    if (!limit.allowed) {
      ActivityLogModel.create({
        username,
        aktivitas: 'PRODUCT_CREATE_LIMIT_BLOCKED',
        modul: 'BARANG',
        tgl_aktivitas: new Date().toISOString(),
        event_type: 'subscription',
        detail: `Tambah produk ${String(data.kd_barang)} ditolak; used=${limit.used}; max=${limit.max}`,
      })
      return {
        success: false,
        error_code: 'PRODUCT_LIMIT',
        message: `Limit produk paket Anda sudah tercapai (${limit.used}/${limit.max}). Upgrade paket untuk menambah produk.`,
        data: { ...limit, popup: getLimitPopup('PRODUCT_LIMIT') },
      }
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const enriched = { ...data, tgl_wkt_simpan: now, nama_pengguna: username }
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
