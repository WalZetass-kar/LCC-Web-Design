import cron from 'node-cron'
import { NotifikasiController } from '../controllers/NotifikasiController.js'
import { BackupController } from '../controllers/BackupController.js'
import { ActivityLogController } from '../controllers/ActivityLogController.js'
import { IndustrySettingsController } from '../controllers/IndustrySettingsController.js'

export class SchedulerService {
  private static tasks: cron.ScheduledTask[] = []

  static start() {
    console.log('🕐 Starting scheduler service...')

    // Check stok minimum every day at 8 AM
    const stokTask = cron.schedule('0 8 * * *', () => {
      console.log('⏰ Running stok minimum check...')
      NotifikasiController.checkStokMinimum()
    })
    this.tasks.push(stokTask)

    // Check expired products every day at 8 AM
    const expiredTask = cron.schedule('0 8 * * *', () => {
      console.log('⏰ Running expired products check...')
      NotifikasiController.checkExpiredProducts()
    })
    this.tasks.push(expiredTask)

    // Check debt due dates every day at 8 AM
    const debtTask = cron.schedule('0 8 * * *', () => {
      console.log('⏰ Running debt due date check...')
      NotifikasiController.checkDebtDueDate()
    })
    this.tasks.push(debtTask)

    // Auto backup every day at 2 AM
    const backupTask = cron.schedule('0 2 * * *', () => {
      console.log('⏰ Running auto backup...')
      const settings = IndustrySettingsController.getSettings()
      if (!settings.autoBackupEnabled) {
        console.log('Auto backup skipped: disabled in production settings')
        return
      }
      BackupController.create('system', 'Auto backup harian')
    })
    this.tasks.push(backupTask)

    // Clean old activity logs every week (Sunday at 3 AM)
    const cleanLogTask = cron.schedule('0 3 * * 0', () => {
      console.log('⏰ Cleaning old activity logs...')
      ActivityLogController.deleteOldLogs(90) // Keep 90 days
    })
    this.tasks.push(cleanLogTask)

    console.log('✅ Scheduler service started')
  }

  static stop() {
    console.log('🛑 Stopping scheduler service...')
    this.tasks.forEach((task) => task.stop())
    this.tasks = []
    console.log('✅ Scheduler service stopped')
  }

  // Manual triggers for testing
  static async runStokCheck() {
    return NotifikasiController.checkStokMinimum()
  }

  static async runExpiredCheck() {
    return NotifikasiController.checkExpiredProducts()
  }

  static async runDebtCheck() {
    return NotifikasiController.checkDebtDueDate()
  }

  static async runBackup(username: string = 'system') {
    return BackupController.create(username, 'Manual backup')
  }

  static async runCleanLogs(days: number = 90) {
    return ActivityLogController.deleteOldLogs(days)
  }
}
