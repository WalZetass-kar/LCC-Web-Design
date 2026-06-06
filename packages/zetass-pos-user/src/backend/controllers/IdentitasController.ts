import { IdentitasModel } from '../models/IdentitasModel.js'

export class IdentitasController {
  static get() {
    return { success: true, data: IdentitasModel.get() }
  }

  static save(data: Parameters<typeof IdentitasModel.save>[0]) {
    IdentitasModel.save(data)
    return { success: true, message: 'Identitas toko berhasil disimpan' }
  }
}
