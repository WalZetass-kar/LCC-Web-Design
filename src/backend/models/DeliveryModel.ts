import { db } from '../../database/connection.js'
import { deliveryOrders, deliveryVehicles } from '../../database/schema.js'
import { eq, and, desc } from 'drizzle-orm'

export class DeliveryModel {
  static generateNomorDelivery(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `DEL${year}${month}${day}${random}`
  }

  static getOrders(status?: string) {
    const query = db.select().from(deliveryOrders)
    if (status) {
      return query.where(eq(deliveryOrders.status, status)).orderBy(desc(deliveryOrders.created_at)).all()
    }
    return query.orderBy(desc(deliveryOrders.created_at)).all()
  }

  static getOrderById(id: number) {
    return db.select().from(deliveryOrders).where(eq(deliveryOrders.id, id)).get()
  }

  static createOrder(data: typeof deliveryOrders.$inferInsert) {
    return db.insert(deliveryOrders).values({
      ...data,
      nomor_delivery: data.nomor_delivery || this.generateNomorDelivery(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).run()
  }

  static updateOrderStatus(id: number, status: string, data?: Partial<typeof deliveryOrders.$inferInsert>) {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'DIANTAR') {
      updateData.tgl_diantar = new Date().toISOString()
    }
    if (status === 'TERKIRIM' || status === 'GAGAL') {
      updateData.tgl_sampai = new Date().toISOString()
    }
    if (data) {
      Object.assign(updateData, data)
    }
    return db.update(deliveryOrders).set(updateData).where(eq(deliveryOrders.id, id)).run()
  }

  static assignCourier(id: number, kurir: string) {
    return db.update(deliveryOrders).set({
      kurir,
      status: 'DIPROSES',
      updated_at: new Date().toISOString(),
    }).where(eq(deliveryOrders.id, id)).run()
  }

  static getVehicles(status?: string) {
    const query = db.select().from(deliveryVehicles)
    if (status) {
      return query.where(eq(deliveryVehicles.status, status)).all()
    }
    return query.all()
  }

  static getVehicleById(id: number) {
    return db.select().from(deliveryVehicles).where(eq(deliveryVehicles.id, id)).get()
  }

  static createVehicle(data: typeof deliveryVehicles.$inferInsert) {
    return db.insert(deliveryVehicles).values({
      ...data,
      created_at: new Date().toISOString(),
    }).run()
  }

  static updateVehicle(id: number, data: Partial<typeof deliveryVehicles.$inferInsert>) {
    return db.update(deliveryVehicles).set(data).where(eq(deliveryVehicles.id, id)).run()
  }

  static deleteVehicle(id: number) {
    return db.delete(deliveryVehicles).where(eq(deliveryVehicles.id, id)).run()
  }
}
