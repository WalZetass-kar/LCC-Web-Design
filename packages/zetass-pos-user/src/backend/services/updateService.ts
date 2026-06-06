import { sqlite } from '../../database/connection.js'

export class UpdateService {
  static checkForUpdates() {
    const currentVersion = '2.0.0'
    const latestUpdate = sqlite.prepare('SELECT * FROM mediasoft_app_updates ORDER BY released_at DESC LIMIT 1').get() as any
    
    if (!latestUpdate) return { hasUpdate: false, currentVersion }
    
    const hasUpdate = latestUpdate.version !== currentVersion
    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestUpdate.version,
      releaseNotes: latestUpdate.release_notes,
      downloadUrl: latestUpdate.download_url,
      isCritical: latestUpdate.is_critical === 1,
    }
  }

  static addUpdate(version: string, releaseNotes: string, downloadUrl: string, isCritical: boolean = false) {
    sqlite.prepare('INSERT INTO mediasoft_app_updates (version, release_notes, download_url, is_critical, released_at) VALUES (?, ?, ?, ?, datetime("now"))').run(version, releaseNotes, downloadUrl, isCritical ? 1 : 0)
    return { success: true }
  }

  static getUpdateHistory() {
    return sqlite.prepare('SELECT * FROM mediasoft_app_updates ORDER BY released_at DESC').all()
  }
}
