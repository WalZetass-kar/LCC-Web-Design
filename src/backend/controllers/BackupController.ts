import { BackupModel } from '../models/BackupModel.js'
import * as fs from 'fs'
import * as path from 'path'

export class BackupController {
  /**
   * Auto backup before critical operations
   * Returns backup filename or null if failed
   */
  static autoBackup(operation: string): string | null {
    try {
      const dbPath = path.join(process.cwd(), 'sistem_pos.db')
      const backupDir = path.join(process.cwd(), 'backups')

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFileName = `auto_${operation}_${timestamp}.db`
      const backupPath = path.join(backupDir, backupFileName)

      fs.copyFileSync(dbPath, backupPath)

      const stats = fs.statSync(backupPath)
      BackupModel.create({
        nama_file: backupFileName,
        ukuran: stats.size,
        tgl_backup: new Date().toISOString(),
        username: 'SYSTEM',
        keterangan: `Auto backup before ${operation}`,
      })

      return backupFileName
    } catch (error) {
      console.error('[AutoBackup] Failed:', error)
      return null
    }
  }

  static getAll() {
    try {
      const backups = BackupModel.getAll()
      return { success: true, data: backups }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data backup: ' + (error as Error).message }
    }
  }

  static create(username: string, keterangan?: string) {
    try {
      const dbPath = path.join(process.cwd(), 'sistem_pos.db')
      const backupDir = path.join(process.cwd(), 'backups')

      // Create backup directory if not exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFileName = `backup_${timestamp}.db`
      const backupPath = path.join(backupDir, backupFileName)

      // Copy database file
      fs.copyFileSync(dbPath, backupPath)

      // Get file size
      const stats = fs.statSync(backupPath)
      const ukuran = stats.size

      // Save to database
      const tgl_backup = new Date().toISOString()
      BackupModel.create({
        nama_file: backupFileName,
        ukuran,
        tgl_backup,
        username,
        keterangan: keterangan || null,
      })

      // Clean old backups (keep last 10)
      BackupModel.deleteOldBackups(10)

      return {
        success: true,
        message: 'Backup berhasil dibuat',
        data: { nama_file: backupFileName, ukuran },
      }
    } catch (error) {
      return { success: false, message: 'Gagal membuat backup: ' + (error as Error).message }
    }
  }

  static restore(kd_backup: number) {
    try {
      const backup = BackupModel.getById(kd_backup)
      if (!backup) {
        return { success: false, message: 'Backup tidak ditemukan' }
      }

      const backupPath = path.join(process.cwd(), 'backups', backup.nama_file)
      const dbPath = path.join(process.cwd(), 'sistem_pos.db')

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'File backup tidak ditemukan' }
      }

      // Create backup of current database before restore
      const currentBackupPath = path.join(process.cwd(), 'backups', `before_restore_${Date.now()}.db`)
      fs.copyFileSync(dbPath, currentBackupPath)

      // Restore from backup
      fs.copyFileSync(backupPath, dbPath)

      return {
        success: true,
        message: 'Database berhasil di-restore. Aplikasi akan restart.',
      }
    } catch (error) {
      return { success: false, message: 'Gagal restore database: ' + (error as Error).message }
    }
  }

  static delete(kd_backup: number) {
    try {
      const backup = BackupModel.getById(kd_backup)
      if (!backup) {
        return { success: false, message: 'Backup tidak ditemukan' }
      }

      const backupPath = path.join(process.cwd(), 'backups', backup.nama_file)

      // Delete file
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath)
      }

      // Delete from database
      BackupModel.delete(kd_backup)

      return { success: true, message: 'Backup berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus backup: ' + (error as Error).message }
    }
  }
  
  static import(base64Data: string, fileName: string) {
    try {
      const dbPath = path.join(process.cwd(), 'sistem_pos.db')
      const backupsDir = path.join(process.cwd(), 'backups')
      
      // Create backups directory if not exists
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true })
      }
      
      // Backup current database before import
      const currentBackupPath = path.join(backupsDir, `before_import_${Date.now()}.db`)
      fs.copyFileSync(dbPath, currentBackupPath)
      
      // Write imported file
      const buffer = Buffer.from(base64Data, 'base64')
      fs.writeFileSync(dbPath, buffer)
      
      return {
        success: true,
        message: 'Database berhasil di-import. Aplikasi akan restart.',
      }
    } catch (error) {
      return { success: false, message: 'Gagal import database: ' + (error as Error).message }
    }
  }

  static download(kd_backup: number) {
    try {
      const backup = BackupModel.getById(kd_backup)
      if (!backup) {
        return { success: false, message: 'Backup tidak ditemukan' }
      }

      const backupPath = path.join(process.cwd(), 'backups', backup.nama_file)

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'File backup tidak ditemukan' }
      }

      return { success: true, data: { path: backupPath, nama_file: backup.nama_file } }
    } catch (error) {
      return { success: false, message: 'Gagal download backup: ' + (error as Error).message }
    }
  }
}
