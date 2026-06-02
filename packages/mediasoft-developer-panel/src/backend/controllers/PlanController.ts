import { PlanModel } from '../models/PlanModel.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function normalizeLimit(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

function serializePlan(p: ReturnType<typeof PlanModel.getAll>[number]) {
  return {
    ...p,
    features: parseJson<string[]>(p.features, []),
    is_active: !!p.is_active,
    is_recommended: !!p.is_recommended,
    max_devices: p.max_devices ?? 1,
    max_transactions_per_day: p.max_transactions_per_day ?? -1,
    max_products: p.max_products ?? -1,
    max_users: p.max_users ?? 1,
    feature_flags: parseJson<Record<string, boolean>>(p.feature_flags, {}),
  }
}

export class PlanController {
  /** Get all plans (admin — includes inactive) */
  static getAll() {
    const plans = PlanModel.getAll()
    return {
      success: true,
      data: plans.map(serializePlan),
    }
  }

  /** Get active plans only (for pricing popup) */
  static getActive() {
    const plans = PlanModel.getActive()
    return {
      success: true,
      data: plans.map(p => ({ ...serializePlan(p), is_active: true })),
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
    max_devices?: number
    max_transactions_per_day?: number
    max_products?: number
    max_users?: number
    feature_flags?: Record<string, boolean>
  }, caller?: string | null) {
    if (!data.name?.trim()) {
      return { success: false, message: 'Nama paket wajib diisi' }
    }
    if (!data.price || data.price <= 0) {
      return { success: false, message: 'Harga harus lebih dari 0' }
    }
    if (!data.duration_days || data.duration_days <= 0) {
      return { success: false, message: 'Durasi harus lebih dari 0 hari' }
    }

    PlanModel.create({
      ...data,
      max_devices: normalizeLimit(data.max_devices, 1),
      max_transactions_per_day: normalizeLimit(data.max_transactions_per_day, -1),
      max_products: normalizeLimit(data.max_products, -1),
      max_users: normalizeLimit(data.max_users, 1),
      feature_flags: data.feature_flags ?? {},
    })
    if (caller) {
      ActivityLogModel.log(
        caller,
        `Membuat paket langganan: ${data.name}`,
        'SUBSCRIPTION',
        `price=${data.price}; duration_days=${data.duration_days}`,
        'subscription'
      )
    }
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
    max_devices?: number
    max_transactions_per_day?: number
    max_products?: number
    max_users?: number
    feature_flags?: Record<string, boolean>
  }, caller?: string | null) {
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

    PlanModel.update(id, {
      ...data,
      max_devices: data.max_devices === undefined ? undefined : normalizeLimit(data.max_devices, 1),
      max_transactions_per_day: data.max_transactions_per_day === undefined ? undefined : normalizeLimit(data.max_transactions_per_day, -1),
      max_products: data.max_products === undefined ? undefined : normalizeLimit(data.max_products, -1),
      max_users: data.max_users === undefined ? undefined : normalizeLimit(data.max_users, 1),
      feature_flags: data.feature_flags,
    })
    if (caller) {
      ActivityLogModel.log(
        caller,
        `Mengubah paket langganan: ${existing.name}`,
        'SUBSCRIPTION',
        `plan_id=${id}; fields=${Object.keys(data).join(', ') || '-'}`,
        'subscription'
      )
    }
    return { success: true, message: 'Paket berhasil diperbarui' }
  }

  /** Soft-deactivate a plan */
  static deactivate(id: number, caller?: string | null) {
    const existing = PlanModel.getById(id)
    if (!existing) {
      return { success: false, message: 'Paket tidak ditemukan' }
    }

    PlanModel.deactivate(id)
    if (caller) {
      ActivityLogModel.log(
        caller,
        `Menonaktifkan paket langganan: ${existing.name}`,
        'SUBSCRIPTION',
        `plan_id=${id}`,
        'subscription'
      )
    }
    return { success: true, message: 'Paket berhasil dinonaktifkan' }
  }

  static delete(id: number, caller?: string | null) {
    const existing = PlanModel.getById(id)
    if (!existing) {
      return { success: false, message: 'Paket tidak ditemukan' }
    }

    const usageCount = PlanModel.getUsageCount(id)
    if (usageCount > 0) {
      return {
        success: false,
        message: `Paket masih dipakai oleh ${usageCount} user. Pindahkan user ke paket lain dulu.`,
      }
    }

    PlanModel.delete(id)
    if (caller) {
      ActivityLogModel.log(
        caller,
        `Menghapus paket langganan: ${existing.name}`,
        'SUBSCRIPTION',
        `plan_id=${id}`,
        'subscription'
      )
    }
    return { success: true, message: 'Paket berhasil dihapus' }
  }
}
