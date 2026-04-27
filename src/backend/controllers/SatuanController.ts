import { SatuanModel } from '../models/SatuanModel.js'

export class SatuanController {
  static getAll() {
    return { success: true, data: SatuanModel.getAll() }
  }
}
