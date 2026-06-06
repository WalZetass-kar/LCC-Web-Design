import { sqlite } from '../../database/connection.js'

export class BarcodeController {
  static generateBarcode(): { barcode: string } {
    const settings = sqlite.prepare('SELECT * FROM mediasoft_barcode_settings WHERE id = 1').get() as any
    if (!settings) {
      sqlite.prepare('INSERT INTO mediasoft_barcode_settings (prefix, next_number, length) VALUES (?, ?, ?)').run('MS', 1, 13)
      return this.generateBarcode()
    }
    
    const barcode = `${settings.prefix}${String(settings.next_number).padStart(settings.length - settings.prefix.length, '0')}`
    sqlite.prepare('UPDATE mediasoft_barcode_settings SET next_number = next_number + 1 WHERE id = 1').run()
    
    return { barcode }
  }

  static searchByBarcode(barcode: string) {
    const product = sqlite.prepare(`
      SELECT b.*, k.nama_kategori, s.nama_satuan, h.harga_jual, h.harga_modal
      FROM mediasoft_barang b
      LEFT JOIN mediasoft_kategori_barang k ON b.kd_kategori_barang = k.id
      LEFT JOIN mediasoft_satuan s ON b.kd_satuan = s.id
      LEFT JOIN mediasoft_harga h ON b.kd_barang = h.kd_barang
      WHERE b.barcode = ?
    `).get(barcode)
    
    return product || null
  }

  static updateSettings(data: any) {
    sqlite.prepare('UPDATE mediasoft_barcode_settings SET prefix = ?, length = ? WHERE id = 1').run(data.prefix, data.length)
    return { success: true }
  }

  static getSettings() {
    return sqlite.prepare('SELECT * FROM mediasoft_barcode_settings WHERE id = 1').get()
  }
}
