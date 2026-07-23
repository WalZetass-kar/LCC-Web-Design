import { SatuanModel } from '../models/SatuanModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class SatuanController {
  static getAll() {
    return { success: true, data: SatuanModel.getAll() }
  }

  static async create(data: Record<string, unknown>) {
    const authError = await requireAuth()
    if (authError) return authError

    if (!data.nama_satuan) {
      return { success: false, message: 'Nama satuan wajib diisi' }
    }
    SatuanModel.create(data as Parameters<typeof SatuanModel.create>[0])
    return { success: true, message: 'Satuan berhasil ditambahkan' }
  }

  static async update(kd: number, data: Record<string, unknown>) {
    const authError = await requireAuth()
    if (authError) return authError

    SatuanModel.update(kd, data as Parameters<typeof SatuanModel.update>[1])
    return { success: true, message: 'Satuan berhasil diperbarui' }
  }

  static async delete(kd: number) {
    const authError = await requireAuth()
    if (authError) return authError
    SatuanModel.delete(kd)
    return { success: true, message: 'Satuan berhasil dihapus' }
  }
}
