import { CustomerModel } from '../models/CustomerModel.js'
import type { Customer } from '../../shared/types'

export class CustomerController {
  static getAll() {
    try {
      const customers = CustomerModel.getAll()
      return { success: true, data: customers }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data customer: ' + (error as Error).message }
    }
  }

  static getById(kd_customer: string) {
    try {
      const customer = CustomerModel.getById(kd_customer)
      if (!customer) {
        return { success: false, message: 'Customer tidak ditemukan' }
      }
      return { success: true, data: customer }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data customer: ' + (error as Error).message }
    }
  }

  static search(query: string) {
    try {
      const customers = CustomerModel.search(query)
      return { success: true, data: customers }
    } catch (error) {
      return { success: false, message: 'Gagal mencari customer: ' + (error as Error).message }
    }
  }

  static create(data: Partial<Customer>) {
    try {
      if (!data.nama_customer?.trim()) {
        return { success: false, message: 'Nama customer wajib diisi' }
      }

      const kd_customer = CustomerModel.generateKode()
      const tgl_daftar = new Date().toISOString()

      CustomerModel.create({
        kd_customer,
        nama_customer: data.nama_customer,
        no_telp: data.no_telp || undefined,
        email: data.email || undefined,
        alamat: data.alamat || undefined,
        tgl_lahir: data.tgl_lahir || undefined,
      })

      return { success: true, message: 'Customer berhasil ditambahkan', data: { kd_customer } }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan customer: ' + (error as Error).message }
    }
  }

  static update(kd_customer: string, data: Partial<Customer>) {
    try {
      if (!data.nama_customer?.trim()) {
        return { success: false, message: 'Nama customer wajib diisi' }
      }

      const existing = CustomerModel.getById(kd_customer)
      if (!existing) {
        return { success: false, message: 'Customer tidak ditemukan' }
      }

      CustomerModel.update(kd_customer, {
        nama_customer: data.nama_customer,
        no_telp: data.no_telp || undefined,
        email: data.email || undefined,
        alamat: data.alamat || undefined,
        tgl_lahir: data.tgl_lahir || undefined,
        status: data.status || 'Aktif',
      })

      return { success: true, message: 'Customer berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate customer: ' + (error as Error).message }
    }
  }

  static delete(kd_customer: string) {
    try {
      const existing = CustomerModel.getById(kd_customer)
      if (!existing) {
        return { success: false, message: 'Customer tidak ditemukan' }
      }

      CustomerModel.delete(kd_customer)
      return { success: true, message: 'Customer berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus customer: ' + (error as Error).message }
    }
  }

  static toggleStatus(kd_customer: string) {
    try {
      const customer = CustomerModel.getById(kd_customer)
      if (!customer) {
        return { success: false, message: 'Customer tidak ditemukan' }
      }

      const newStatus = customer.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
      CustomerModel.update(kd_customer, { status: newStatus })

      return { success: true, message: `Customer berhasil di${newStatus === 'Aktif' ? 'aktifkan' : 'nonaktifkan'}` }
    } catch (error) {
      return { success: false, message: 'Gagal mengubah status: ' + (error as Error).message }
    }
  }

  static addPoin(kd_customer: string, poin: number) {
    try {
      CustomerModel.addPoin(kd_customer, poin)
      return { success: true, message: 'Poin berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan poin: ' + (error as Error).message }
    }
  }

  static updateTotalBelanja(kd_customer: string, amount: number) {
    try {
      CustomerModel.updateTotalBelanja(kd_customer, amount)
      return { success: true }
    } catch (error) {
      return { success: false, message: 'Gagal update total belanja: ' + (error as Error).message }
    }
  }

  static getBirthdayToday() {
    try {
      const customers = CustomerModel.getBirthdayToday()
      return { success: true, data: customers }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data: ' + (error as Error).message }
    }
  }

  static getRiwayatPembelian(kd_customer: string) {
    try {
      const riwayat = CustomerModel.getRiwayatPembelian(kd_customer)
      return { success: true, data: riwayat }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil riwayat: ' + (error as Error).message }
    }
  }
}
