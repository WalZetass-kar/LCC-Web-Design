import { db } from '../../database/connection.js'
import { backup } from '../../database/schema.js'
import { eq, desc, lt } from 'drizzle-orm'

export class BackupModel {
  static getAll() {
    return db.select().from(backup).orderBy(desc(backup.tgl_backup)).all()
  }

  static getById(kd_backup: number) {
    return db.select().from(backup).where(eq(backup.kd_backup, kd_backup)).get()
  }

  static create(data: typeof backup.$inferInsert) {
    return db.insert(backup).values(data).run()
  }

  static delete(kd_backup: number) {
    return db.delete(backup).where(eq(backup.kd_backup, kd_backup)).run()
  }

  static deleteOldBackups(keepCount: number = 10) {
    const allBackups = this.getAll()
    if (allBackups.length > keepCount) {
      const toDelete = allBackups.slice(keepCount)
      for (const b of toDelete) {
        this.delete(b.kd_backup)
      }
    }
  }

  static getOlderThan(cutoffIso: string) {
    return db.select().from(backup).where(lt(backup.tgl_backup, cutoffIso)).all()
  }
}
