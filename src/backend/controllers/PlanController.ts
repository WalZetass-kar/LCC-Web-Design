import { PlanModel } from '../models/PlanModel.js'

export class PlanController {
  /** Get all plans (admin — includes inactive) */
  static getAll() {
    const plans = PlanModel.getAll()
    return {
      success: true,
      data: plans.map(p => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        is_active: !!p.is_active,
        is_recommended: !!p.is_recommended,
      })),
    }
  }

  /** Get active plans only (for pricing popup) */
  static getActive() {
    const plans = PlanModel.getActive()
    return {
      success: true,
      data: plans.map(p => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        is_active: true,
        is_recommended: !!p.is_recommended,
      })),
    }
  }

  /** Create a new plan */
  static create(data: {
    name: string
    price: number
    duration_days: number
    features: string[]
    is_active?: boolean
    is_recommended?: boolean
  }) {
    if (!data.name?.trim()) {
      return { success: false, message: 'Nama paket wajib diisi' }
    }
    if (!data.price || data.price <= 0) {
      return { success: false, message: 'Harga harus lebih dari 0' }
    }
    if (!data.duration_days || data.duration_days <= 0) {
      return { success: false, message: 'Durasi harus lebih dari 0 hari' }
    }

    PlanModel.create(data)
    return { success: true, message: 'Paket berhasil ditambahkan' }
  }

  /** Update an existing plan */
  static update(id: number, data: {
    name?: string
    price?: number
    duration_days?: number
    features?: string[]
    is_active?: boolean
    is_recommended?: boolean
  }) {
    const existing = PlanModel.getById(id)
    if (!existing) {
      return { success: false, message: 'Paket tidak ditemukan' }
    }

    if (data.name !== undefined && !data.name.trim()) {
      return { success: false, message: 'Nama paket wajib diisi' }
    }
    if (data.price !== undefined && data.price <= 0) {
      return { success: false, message: 'Harga harus lebih dari 0' }
    }

    PlanModel.update(id, data)
    return { success: true, message: 'Paket berhasil diperbarui' }
  }

  /** Soft-deactivate a plan */
  static deactivate(id: number) {
    const existing = PlanModel.getById(id)
    if (!existing) {
      return { success: false, message: 'Paket tidak ditemukan' }
    }

    PlanModel.deactivate(id)
    return { success: true, message: 'Paket berhasil dinonaktifkan' }
  }
}
