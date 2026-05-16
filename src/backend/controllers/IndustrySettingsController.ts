import { sqlite } from '../../database/connection.js'
import { normalizeIndustrySettings, type IndustrySettings } from '../../shared/industrySettings.js'
import { dashboardSummaryToSheetsPayload, testGoogleSheetsPayload } from '../../shared/googleSheetsExport.js'
import type { DashboardSummary } from '../../shared/types.js'

const TABLE = 'mediasoft_industry_settings'

function initTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY DEFAULT 1,
      ai_enabled INTEGER DEFAULT 0,
      ai_provider TEXT DEFAULT 'local',
      ai_model TEXT DEFAULT '',
      ai_base_url TEXT DEFAULT '',
      ai_api_key TEXT DEFAULT '',
      google_sheets_enabled INTEGER DEFAULT 0,
      google_sheets_webapp_url TEXT DEFAULT '',
      auto_backup_enabled INTEGER DEFAULT 1,
      backup_retention_days INTEGER DEFAULT 30,
      updated_at TEXT
    )
  `)

  const columns = sqlite.prepare(`PRAGMA table_info(${TABLE})`).all() as Array<{ name: string }>
  const ensure = (name: string, definition: string) => {
    if (!columns.some(column => column.name === name)) {
      sqlite.exec(`ALTER TABLE ${TABLE} ADD COLUMN ${name} ${definition}`)
    }
  }

  ensure('ai_enabled', 'INTEGER DEFAULT 0')
  ensure('ai_provider', "TEXT DEFAULT 'local'")
  ensure('ai_model', "TEXT DEFAULT ''")
  ensure('ai_base_url', "TEXT DEFAULT ''")
  ensure('ai_api_key', "TEXT DEFAULT ''")
  ensure('google_sheets_enabled', 'INTEGER DEFAULT 0')
  ensure('google_sheets_webapp_url', "TEXT DEFAULT ''")
  ensure('auto_backup_enabled', 'INTEGER DEFAULT 1')
  ensure('backup_retention_days', 'INTEGER DEFAULT 30')
  ensure('updated_at', 'TEXT')

  sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
}

try { initTable() } catch (error) { console.error('Industry settings init failed:', error) }

function readSettings(): IndustrySettings {
  initTable()
  sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
  const row = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as Record<string, unknown> | undefined
  return normalizeIndustrySettings(row)
}

function assertWebAppUrl(url: string) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\//i.test(url)) {
    throw new Error('URL Apps Script harus diawali https://script.google.com/macros/s/')
  }
}

async function postToGoogleSheets(url: string, payload: unknown) {
  assertWebAppUrl(url)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null) as { success?: boolean; message?: string } | null
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || `Google Sheets HTTP ${response.status}`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

export class IndustrySettingsController {
  static get() {
    try {
      return { success: true, data: readSettings() }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static save(data: Partial<IndustrySettings>) {
    try {
      const settings = normalizeIndustrySettings({ ...readSettings(), ...data })
      sqlite.prepare(`
        UPDATE ${TABLE} SET
          ai_enabled = ?,
          ai_provider = ?,
          ai_model = ?,
          ai_base_url = ?,
          ai_api_key = ?,
          google_sheets_enabled = ?,
          google_sheets_webapp_url = ?,
          auto_backup_enabled = ?,
          backup_retention_days = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        settings.aiEnabled ? 1 : 0,
        settings.aiProvider,
        settings.aiModel,
        settings.aiBaseUrl,
        settings.aiApiKey,
        settings.googleSheetsEnabled ? 1 : 0,
        settings.googleSheetsWebAppUrl,
        settings.autoBackupEnabled ? 1 : 0,
        settings.backupRetentionDays,
        new Date().toISOString()
      )
      return { success: true, data: readSettings(), message: 'Pengaturan industri disimpan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getSettings() {
    return readSettings()
  }

  static async testGoogleSheets() {
    try {
      const settings = readSettings()
      if (!settings.googleSheetsEnabled || !settings.googleSheetsWebAppUrl) {
        return { success: false, message: 'Google Sheets belum diaktifkan atau URL Apps Script belum diisi' }
      }
      const result = await postToGoogleSheets(settings.googleSheetsWebAppUrl, testGoogleSheetsPayload())
      return { success: true, data: result, message: 'Koneksi Google Sheets berhasil' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  static async exportDashboardToSheets(summary: DashboardSummary) {
    try {
      const settings = readSettings()
      if (!settings.googleSheetsEnabled || !settings.googleSheetsWebAppUrl) {
        return {
          success: false,
          data: { mode: 'clipboard' },
          message: 'Google Sheets otomatis belum dikonfigurasi',
        }
      }

      const result = await postToGoogleSheets(settings.googleSheetsWebAppUrl, dashboardSummaryToSheetsPayload(summary))
      return {
        success: true,
        data: { mode: 'apps-script', result },
        message: 'Dashboard berhasil dikirim ke Google Sheets',
      }
    } catch (error) {
      return {
        success: false,
        data: { mode: 'clipboard' },
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
