import { DeliveryModel } from '../models/DeliveryModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class DeliveryController {
  static getOrders(status?: string) {
    try {
      const data = DeliveryModel.getOrders(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data pengiriman: ' + (error as Error).message }
    }
  }

  static getOrderById(id: number) {
    try {
      const data = DeliveryModel.getOrderById(id)
      if (!data) {
        return { success: false, message: 'Pengiriman tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data pengiriman: ' + (error as Error).message }
    }
  }

  static async createOrder(data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError

    try {
      DeliveryModel.createOrder({
        ...data,
        dibuat_oleh: username,
      } as any)
      return { success: true, message: 'Pesanan pengiriman berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat pesanan: ' + (error as Error).message }
    }
  }

  static async updateOrderStatus(id: number, status: string, data?: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError

    try {
      const order = DeliveryModel.getOrderById(id)
      if (!order) {
        return { success: false, message: 'Pengiriman tidak ditemukan' }
      }
      DeliveryModel.updateOrderStatus(id, status, data as any)
      return { success: true, message: 'Status pengiriman berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate status: ' + (error as Error).message }
    }
  }

  static async assignCourier(id: number, kurir: string, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError

    try {
      const order = DeliveryModel.getOrderById(id)
      if (!order) {
        return { success: false, message: 'Pengiriman tidak ditemukan' }
      }
      DeliveryModel.assignCourier(id, kurir)
      return { success: true, message: 'Kurir berhasil ditugaskan' }
    } catch (error) {
      return { success: false, message: 'Gagal menugaskan kurir: ' + (error as Error).message }
    }
  }

  static getVehicles(status?: string) {
    try {
      const data = DeliveryModel.getVehicles(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data kendaraan: ' + (error as Error).message }
    }
  }

  static getVehicleById(id: number) {
    try {
      const data = DeliveryModel.getVehicleById(id)
      if (!data) {
        return { success: false, message: 'Kendaraan tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data kendaraan: ' + (error as Error).message }
    }
  }

  static async createVehicle(data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError

    try {
      DeliveryModel.createVehicle(data as any)
      return { success: true, message: 'Kendaraan berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan kendaraan: ' + (error as Error).message }
    }
  }

  static async updateVehicle(id: number, data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const vehicle = DeliveryModel.getVehicleById(id)
      if (!vehicle) {
        return { success: false, message: 'Kendaraan tidak ditemukan' }
      }
      DeliveryModel.updateVehicle(id, data as any)
      return { success: true, message: 'Kendaraan berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate kendaraan: ' + (error as Error).message }
    }
  }

  static async deleteVehicle(id: number, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const vehicle = DeliveryModel.getVehicleById(id)
      if (!vehicle) {
        return { success: false, message: 'Kendaraan tidak ditemukan' }
      }
      DeliveryModel.deleteVehicle(id)
      return { success: true, message: 'Kendaraan berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus kendaraan: ' + (error as Error).message }
    }
  }
}
