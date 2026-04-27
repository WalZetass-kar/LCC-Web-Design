import { db } from '../../database/connection.js'
import { satuan } from '../../database/schema.js'

export class SatuanModel {
  static getAll() {
    return db.select().from(satuan).all()
  }
}
