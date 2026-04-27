import { KategoriModel } from '../models/KategoriModel.js'

export class KategoriController {
  static getAll() {
    return { success: true, data: KategoriModel.getAll() }
  }

  static create(data: { kategori_barang: string }) {
    if (!data.kategori_barang?.trim()) {
      return { success: false, message: 'Nama kategori wajib diisi' }
    }
    KategoriModel.create(data)
    return { success: true, message: 'Kategori berhasil ditambahkan' }
  }

  static update(id: number, data: { kategori_barang: string }) {
    KategoriModel.update(id, data)
    return { success: true, message: 'Kategori berhasil diperbarui' }
  }

  static delete(id: number) {
    KategoriModel.delete(id)
    return { success: true, message: 'Kategori berhasil dihapus' }
  }
}
