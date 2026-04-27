import { SupplierModel } from '../models/SupplierModel.js'

export class SupplierController {
  static getAll() {
    try {
      const data = SupplierModel.getAll()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getById(kd: string) {
    try {
      const data = SupplierModel.getById(kd)
      if (!data) {
        return { success: false, message: 'Supplier tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: {
    kd_suplier: string
    nama_suplier: string
    alamat_suplier?: string
    no_telp_hp?: string
    email?: string
    nama_pengguna: string
  }) {
    try {
      // Check if code already exists
      const existing = SupplierModel.getById(data.kd_suplier)
      if (existing) {
        return { success: false, message: 'Kode supplier sudah digunakan' }
      }

      SupplierModel.create(data)
      return { success: true, message: 'Supplier berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(kd: string, data: {
    nama_suplier?: string
    alamat_suplier?: string
    no_telp_hp?: string
    email?: string
    status?: string
    nama_pengguna: string
  }) {
    try {
      SupplierModel.update(kd, data)
      return { success: true, message: 'Supplier berhasil diupdate' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(kd: string) {
    try {
      SupplierModel.delete(kd)
      return { success: true, message: 'Supplier berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
