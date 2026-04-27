import { ActivityLogModel } from '../models/ActivityLogModel.js'

export class ActivityLogController {
  static getAll() {
    try {
      const logs = ActivityLogModel.getAll()
      return { success: true, data: logs }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil activity log: ' + (error as Error).message }
    }
  }

  static getByUsername(username: string) {
    try {
      const logs = ActivityLogModel.getByUsername(username)
      return { success: true, data: logs }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil activity log: ' + (error as Error).message }
    }
  }

  static getByModul(modul: string) {
    try {
      const logs = ActivityLogModel.getByModul(modul)
      return { success: true, data: logs }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil activity log: ' + (error as Error).message }
    }
  }

  static search(filters: {
    username?: string
    modul?: string
    startDate?: string
    endDate?: string
    keyword?: string
  }) {
    try {
      const logs = ActivityLogModel.search(filters)
      return { success: true, data: logs }
    } catch (error) {
      return { success: false, message: 'Gagal mencari activity log: ' + (error as Error).message }
    }
  }

  static log(username: string, aktivitas: string, modul: string, detail?: string) {
    try {
      ActivityLogModel.log(username, aktivitas, modul, detail)
      return { success: true }
    } catch (error) {
      return { success: false, message: 'Gagal mencatat log: ' + (error as Error).message }
    }
  }

  static delete(kd_log: number) {
    try {
      ActivityLogModel.delete(kd_log)
      return { success: true, message: 'Log berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus log: ' + (error as Error).message }
    }
  }

  static deleteOldLogs(daysToKeep: number = 90) {
    try {
      ActivityLogModel.deleteOldLogs(daysToKeep)
      return { success: true, message: `Log lebih dari ${daysToKeep} hari berhasil dihapus` }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus log lama: ' + (error as Error).message }
    }
  }
}
