import { BackupModel } from '../models/BackupModel.js'
import { IndustrySettingsController } from './IndustrySettingsController.js'
import * as fs from 'fs'
import * as path from 'path'

function backupDir() {
  const dir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function dbPath() {
  return path.join(process.cwd(), 'sistem_pos.db')
}

function isSqliteDatabase(buffer: Buffer) {
  return buffer.subarray(0, 16).toString('binary') === 'SQLite format 3\0'
}

function cleanOldBackupFiles(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const oldBackups = BackupModel.getOlderThan(cutoff)
  for (const backup of oldBackups) {
    const file = path.join(backupDir(), backup.nama_file)
    if (fs.existsSync(file)) fs.rmSync(file, { force: true })
    BackupModel.delete(backup.kd_backup)
  }
}

export class BackupController {
  /**
   * Auto backup before critical operations
   * Returns backup filename or null if failed
   */
  static autoBackup(operation: string): string | null {
    try {
      const sourceDb = dbPath()
      const dir = backupDir()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFileName = `auto_${operation}_${timestamp}.db`
      const backupPath = path.join(dir, backupFileName)

      fs.copyFileSync(sourceDb, backupPath)

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
      const settings = IndustrySettingsController.getSettings()
      const sourceDb = dbPath()
      const dir = backupDir()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFileName = `backup_${timestamp}.db`
      const backupPath = path.join(dir, backupFileName)

      // Copy database file
      fs.copyFileSync(sourceDb, backupPath)

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

      cleanOldBackupFiles(settings.backupRetentionDays)

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

      const backupPath = path.join(backupDir(), backup.nama_file)
      const targetDb = dbPath()

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'File backup tidak ditemukan' }
      }
      const backupBuffer = fs.readFileSync(backupPath)
      if (!isSqliteDatabase(backupBuffer)) {
        return { success: false, message: 'File backup bukan database SQLite yang valid' }
      }

      // Create backup of current database before restore
      const currentBackupPath = path.join(backupDir(), `before_restore_${Date.now()}.db`)
      fs.copyFileSync(targetDb, currentBackupPath)

      // Restore from backup
      fs.copyFileSync(backupPath, targetDb)

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

      const backupPath = path.join(backupDir(), backup.nama_file)

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
      const targetDb = dbPath()
      const backupsDir = backupDir()
      
      // Backup current database before import
      const currentBackupPath = path.join(backupsDir, `before_import_${Date.now()}.db`)
      fs.copyFileSync(targetDb, currentBackupPath)
      
      // Write imported file
      const buffer = Buffer.from(base64Data, 'base64')
      if (!isSqliteDatabase(buffer)) {
        return { success: false, message: 'File import bukan database SQLite yang valid' }
      }
      fs.writeFileSync(targetDb, buffer)
      
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

      const backupPath = path.join(backupDir(), backup.nama_file)

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'File backup tidak ditemukan' }
      }

      return { success: true, data: { path: backupPath, nama_file: backup.nama_file } }
    } catch (error) {
      return { success: false, message: 'Gagal download backup: ' + (error as Error).message }
    }
  }
}
