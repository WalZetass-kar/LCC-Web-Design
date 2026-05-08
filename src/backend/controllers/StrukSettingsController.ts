import { sqlite } from '../../database/connection.js'

interface StrukSettings {
  id: number
  printer_type: string
  show_logo: number
  show_alamat: number
  show_telepon: number
  show_email: number
  show_kasir: number
  show_customer: number
  footer_text: string
  qris_image: string | null
  qris_enabled: number
  updated_at: string
}

export class StrukSettingsController {
  /**
   * Get struk settings
   */
  static get(): { success: boolean; data?: StrukSettings; message?: string } {
    try {
      const row = sqlite
        .prepare('SELECT * FROM mediasoft_struk_settings WHERE id = 1')
        .get() as StrukSettings | undefined

      if (!row) {
        // Create default if not exists
        const now = new Date().toISOString()
        sqlite.prepare(`
          INSERT INTO mediasoft_struk_settings (id, updated_at) 
          VALUES (1, ?)
        `).run(now)
        
        return this.get()
      }

      return { success: true, data: row }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Update struk settings
   */
  static update(data: Partial<StrukSettings>) {
    try {
      const now = new Date().toISOString()
      
      const fields: string[] = []
      const values: any[] = []

      if (data.printer_type !== undefined) {
        fields.push('printer_type = ?')
        values.push(data.printer_type)
      }
      if (data.show_logo !== undefined) {
        fields.push('show_logo = ?')
        values.push(data.show_logo ? 1 : 0)
      }
      if (data.show_alamat !== undefined) {
        fields.push('show_alamat = ?')
        values.push(data.show_alamat ? 1 : 0)
      }
      if (data.show_telepon !== undefined) {
        fields.push('show_telepon = ?')
        values.push(data.show_telepon ? 1 : 0)
      }
      if (data.show_email !== undefined) {
        fields.push('show_email = ?')
        values.push(data.show_email ? 1 : 0)
      }
      if (data.show_kasir !== undefined) {
        fields.push('show_kasir = ?')
        values.push(data.show_kasir ? 1 : 0)
      }
      if (data.show_customer !== undefined) {
        fields.push('show_customer = ?')
        values.push(data.show_customer ? 1 : 0)
      }
      if (data.footer_text !== undefined) {
        fields.push('footer_text = ?')
        values.push(data.footer_text)
      }
      if (data.qris_image !== undefined) {
        fields.push('qris_image = ?')
        values.push(data.qris_image)
      }
      if (data.qris_enabled !== undefined) {
        fields.push('qris_enabled = ?')
        values.push(data.qris_enabled ? 1 : 0)
      }

      fields.push('updated_at = ?')
      values.push(now)

      if (fields.length === 1) {
        return { success: false, message: 'Tidak ada data yang diubah' }
      }

      values.push(1) // WHERE id = 1

      sqlite.prepare(`
        UPDATE mediasoft_struk_settings 
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values)

      return { success: true, message: 'Pengaturan struk berhasil disimpan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Upload QRIS image (base64)
   */
  static uploadQris(base64Image: string) {
    try {
      const now = new Date().toISOString()
      
      sqlite.prepare(`
        UPDATE mediasoft_struk_settings 
        SET qris_image = ?, qris_enabled = 1, updated_at = ?
        WHERE id = 1
      `).run(base64Image, now)

      return { success: true, message: 'QRIS berhasil diupload' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Remove QRIS image
   */
  static removeQris() {
    try {
      const now = new Date().toISOString()
      
      sqlite.prepare(`
        UPDATE mediasoft_struk_settings 
        SET qris_image = NULL, qris_enabled = 0, updated_at = ?
        WHERE id = 1
      `).run(now)

      return { success: true, message: 'QRIS berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
