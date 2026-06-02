import { db } from '../../database/connection.js'
import { identitas } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export class IdentitasModel {
  static get() {
    return db.select().from(identitas).get()
  }

  static save(data: typeof identitas.$inferInsert) {
    const existing = db.select().from(identitas).get()
    if (existing) {
      db.update(identitas).set(data).where(eq(identitas.kode, existing.kode)).run()
    } else {
      db.insert(identitas).values({ ...data, kode: 1 }).run()
    }
  }
}
