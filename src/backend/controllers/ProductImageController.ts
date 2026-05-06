import { sqlite } from '../../database/connection.js'

export class ProductImageController {
  static add(barangId: number, imagePath: string, isPrimary: boolean = false) {
    if (isPrimary) {
      sqlite.prepare('UPDATE mediasoft_product_images SET is_primary = 0 WHERE barang_id = ?').run(barangId)
    }
    const result = sqlite.prepare('INSERT INTO mediasoft_product_images (barang_id, image_path, is_primary) VALUES (?, ?, ?)').run(barangId, imagePath, isPrimary ? 1 : 0)
    return { success: true, data: { id: result.lastInsertRowid } }
  }

  static getByProduct(barangId: number) {
    return sqlite.prepare('SELECT * FROM mediasoft_product_images WHERE barang_id = ? ORDER BY is_primary DESC, created_at ASC').all(barangId)
  }

  static delete(id: number) {
    sqlite.prepare('DELETE FROM mediasoft_product_images WHERE id = ?').run(id)
    return { success: true }
  }

  static setPrimary(id: number, barangId: number) {
    sqlite.prepare('UPDATE mediasoft_product_images SET is_primary = 0 WHERE barang_id = ?').run(barangId)
    sqlite.prepare('UPDATE mediasoft_product_images SET is_primary = 1 WHERE id = ?').run(id)
    return { success: true }
  }
}
