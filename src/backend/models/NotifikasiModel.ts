import { db } from '../../database/connection.js'
import { notifikasi, barang } from '../../database/schema.js'
import { eq, and, desc, lte, sql } from 'drizzle-orm'

export class NotifikasiModel {
  static getAll(username?: string) {
    if (username) {
      return db.select().from(notifikasi)
        .where(eq(notifikasi.username, username))
        .orderBy(desc(notifikasi.tgl_dibuat))
        .all()
    }
    return db.select().from(notifikasi)
      .orderBy(desc(notifikasi.tgl_dibuat))
      .all()
  }

  static getUnread(username?: string) {
    if (username) {
      return db.select().from(notifikasi)
        .where(and(
          eq(notifikasi.username, username),
          eq(notifikasi.dibaca, 0)
        ))
        .orderBy(desc(notifikasi.tgl_dibuat))
        .all()
    }
    return db.select().from(notifikasi)
      .where(eq(notifikasi.dibaca, 0))
      .orderBy(desc(notifikasi.tgl_dibuat))
      .all()
  }

  static getUnreadCount(username?: string): number {
    const unread = this.getUnread(username)
    return unread.length
  }

  static create(data: {
    judul: string
    pesan: string
    jenis: 'STOK' | 'EXPIRED' | 'SYSTEM' | 'INFO'
    username?: string
    link?: string
  }) {
    return db.insert(notifikasi).values({
      judul: data.judul,
      pesan: data.pesan,
      jenis: data.jenis,
      tgl_dibuat: new Date().toISOString(),
      dibaca: 0,
      username: data.username || null,
      link: data.link || null,
    }).run()
  }

  static markAsRead(kd: number) {
    return db.update(notifikasi).set({
      dibaca: 1,
    }).where(eq(notifikasi.kd_notifikasi, kd)).run()
  }

  static markAllAsRead(username?: string) {
    if (username) {
      return db.update(notifikasi).set({
        dibaca: 1,
      }).where(eq(notifikasi.username, username)).run()
    }
    return db.update(notifikasi).set({
      dibaca: 1,
    }).run()
  }

  static delete(kd: number) {
    return db.delete(notifikasi).where(eq(notifikasi.kd_notifikasi, kd)).run()
  }

  static deleteAll(username?: string) {
    if (username) {
      return db.delete(notifikasi).where(eq(notifikasi.username, username)).run()
    }
    return db.delete(notifikasi).run()
  }

  // Auto notification creators
  static createStokMinimumNotifications(): number {
    const lowStockItems = db.select().from(barang)
      .where(sql`${barang.stok} <= ${barang.stok_minimum}`)
      .all()

    let count = 0
    for (const item of lowStockItems) {
      // Check if notification already exists
      const existing = db.select().from(notifikasi)
        .where(and(
          eq(notifikasi.jenis, 'STOK'),
          eq(notifikasi.link, `/produk?kd=${item.kd_barang}`)
        ))
        .get()

      if (!existing) {
        this.create({
          judul: 'Stok Menipis',
          pesan: `Produk "${item.nama_barang}" stok tinggal ${item.stok}`,
          jenis: 'STOK',
          link: `/produk?kd=${item.kd_barang}`,
        })
        count++
      }
    }

    return count
  }

  static createExpiredNotifications(): number {
    const today = new Date()
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0]

    const expiringItems = db.select().from(barang)
      .where(and(
        sql`${barang.expired_date} IS NOT NULL`,
        lte(barang.expired_date, sevenDaysStr)
      ))
      .all()

    let count = 0
    for (const item of expiringItems) {
      // Check if notification already exists
      const existing = db.select().from(notifikasi)
        .where(and(
          eq(notifikasi.jenis, 'EXPIRED'),
          eq(notifikasi.link, `/produk?kd=${item.kd_barang}`)
        ))
        .get()

      if (!existing) {
        this.create({
          judul: 'Produk Akan Expired',
          pesan: `Produk "${item.nama_barang}" akan expired pada ${item.expired_date}`,
          jenis: 'EXPIRED',
          link: `/produk?kd=${item.kd_barang}`,
        })
        count++
      }
    }

    return count
  }
}
