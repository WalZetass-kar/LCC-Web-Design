import { SatuanModel } from '../models/SatuanModel.js'
import { validateDemoMode } from '../utils/demoMode.js'

export class SatuanController {
  static getAll() {
    return { success: true, data: SatuanModel.getAll() }
  }

  static create(data: Record<string, unknown>) {
    const demoError = validateDemoMode(data.nama_pengguna as string)
    if (demoError) return demoError

    if (!data.nama_satuan) {
      return { success: false, message: 'Nama satuan wajib diisi' }
    }
    SatuanModel.create(data as Parameters<typeof SatuanModel.create>[0])
    return { success: true, message: 'Satuan berhasil ditambahkan' }
  }

  static update(kd: number, data: Record<string, unknown>) {
    const demoError = validateDemoMode(data.nama_pengguna as string)
    if (demoError) return demoError

    SatuanModel.update(kd, data as Parameters<typeof SatuanModel.update>[1])
    return { success: true, message: 'Satuan berhasil diperbarui' }
  }

  static delete(kd: number) {
    SatuanModel.delete(kd)
    return { success: true, message: 'Satuan berhasil dihapus' }
  }
}
