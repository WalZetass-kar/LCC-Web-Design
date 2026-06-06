import { db } from '../../database/connection.js'
import { satuan } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export class SatuanModel {
  static getAll() {
    return db.select().from(satuan).all()
  }

  static create(data: typeof satuan.$inferInsert) {
    return db.insert(satuan).values(data).run()
  }

  static update(kd: number, data: Partial<typeof satuan.$inferInsert>) {
    return db.update(satuan).set(data).where(eq(satuan.kd_satuan, kd)).run()
  }

  static delete(kd: number) {
    return db.delete(satuan).where(eq(satuan.kd_satuan, kd)).run()
  }
}
