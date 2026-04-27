import { BarangModel } from '../models/BarangModel.js'

export class BarangController {
  static getAll() {
    return { success: true, data: BarangModel.getAll() }
  }

  static search(q: string) {
    return { success: true, data: BarangModel.search(q) }
  }

  static create(data: Record<string, unknown>) {
    if (!data.kd_barang || !data.nama_barang) {
      return { success: false, message: 'Kode dan nama barang wajib diisi' }
    }
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const enriched = { ...data, tgl_wkt_simpan: now, nama_pengguna: data.nama_pengguna || 'system' }
    BarangModel.create(enriched as Parameters<typeof BarangModel.create>[0])
    return { success: true, message: 'Produk berhasil ditambahkan' }
  }

  static update(kd: string, data: Record<string, unknown>) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const enriched = { ...data, tgl_wkt_ubah: now }
    BarangModel.update(kd, enriched as Parameters<typeof BarangModel.update>[1])
    return { success: true, message: 'Produk berhasil diperbarui' }
  }

  static delete(kd: string) {
    BarangModel.delete(kd)
    return { success: true, message: 'Produk berhasil dihapus' }
  }
}
