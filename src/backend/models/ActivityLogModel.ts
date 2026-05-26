import { db } from '../../database/connection.js'
import { activityLog } from '../../database/schema.js'
import { eq, desc, and, like, gte, lte } from 'drizzle-orm'

function inferEventType(modul: string, aktivitas: string): string {
  const raw = `${modul} ${aktivitas}`.toLowerCase()
  if (raw.includes('login')) return 'login'
  if (raw.includes('revoke') || raw.includes('remote logout')) return 'revoke'
  if (raw.includes('device')) return 'device'
  if (raw.includes('logout')) return 'logout'
  if (raw.includes('subscription') || raw.includes('langganan') || raw.includes('paket') || raw.includes('masa akses')) return 'subscription'
  if (raw.includes('payment') || raw.includes('pembayaran') || raw.includes('gateway') || raw.includes('ecommerce')) return 'payment'
  if (raw.includes('api') || raw.includes('error') || raw.includes('gagal')) return 'error'
  return 'general'
}

export class ActivityLogModel {
  static getAll() {
    return db.select().from(activityLog).orderBy(desc(activityLog.tgl_aktivitas)).all()
  }

  static getByUsername(username: string) {
    return db
      .select()
      .from(activityLog)
      .where(eq(activityLog.username, username))
      .orderBy(desc(activityLog.tgl_aktivitas))
      .all()
  }

  static getByModul(modul: string) {
    return db
      .select()
      .from(activityLog)
      .where(eq(activityLog.modul, modul))
      .orderBy(desc(activityLog.tgl_aktivitas))
      .all()
  }

  static search(filters: {
    username?: string
    modul?: string
    eventType?: string
    startDate?: string
    endDate?: string
    keyword?: string
  }) {
    let query = db.select().from(activityLog)

    const conditions = []

    if (filters.username) {
      conditions.push(eq(activityLog.username, filters.username))
    }

    if (filters.modul) {
      conditions.push(eq(activityLog.modul, filters.modul))
    }

    if (filters.eventType) {
      conditions.push(eq(activityLog.event_type, filters.eventType))
    }

    if (filters.startDate) {
      conditions.push(gte(activityLog.tgl_aktivitas, filters.startDate))
    }

    if (filters.endDate) {
      conditions.push(lte(activityLog.tgl_aktivitas, filters.endDate))
    }

    if (filters.keyword) {
      conditions.push(like(activityLog.aktivitas, `%${filters.keyword}%`))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    return query.orderBy(desc(activityLog.tgl_aktivitas)).all()
  }

  static create(data: typeof activityLog.$inferInsert) {
    return db.insert(activityLog).values(data).run()
  }

  static log(username: string, aktivitas: string, modul: string, detail?: string, eventType?: string) {
    const tgl_aktivitas = new Date().toISOString()
    return this.create({
      username,
      aktivitas,
      modul,
      tgl_aktivitas,
      ip_address: null,
      detail: detail || null,
      event_type: eventType ?? inferEventType(modul, aktivitas),
    })
  }

  static delete(kd_log: number) {
    return db.delete(activityLog).where(eq(activityLog.kd_log, kd_log)).run()
  }

  static deleteOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffDateStr = cutoffDate.toISOString()

    return db.delete(activityLog).where(lte(activityLog.tgl_aktivitas, cutoffDateStr)).run()
  }
}
