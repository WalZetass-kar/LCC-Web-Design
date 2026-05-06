import { sqlite } from '../../database/connection.js'

interface TutorialRow {
  id: number
  title: string
  content: string
  created_at: string
}

export class TutorialController {
  static getAll() {
    try {
      const rows = sqlite
        .prepare('SELECT * FROM mediasoft_tutorials ORDER BY created_at DESC')
        .all() as TutorialRow[]
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getById(id: number) {
    try {
      const row = sqlite
        .prepare('SELECT * FROM mediasoft_tutorials WHERE id = ?')
        .get(id) as TutorialRow | undefined
      if (!row) return { success: false, message: 'Tutorial tidak ditemukan' }
      return { success: true, data: row }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static create(data: { title: string; content: string }) {
    try {
      const now = new Date().toISOString()
      const result = sqlite
        .prepare('INSERT INTO mediasoft_tutorials (title, content, created_at) VALUES (?, ?, ?)')
        .run(data.title, data.content, now)
      return { success: true, message: 'Tutorial berhasil ditambahkan', data: { id: result.lastInsertRowid } }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static update(id: number, data: { title?: string; content?: string }) {
    try {
      const existing = sqlite
        .prepare('SELECT id FROM mediasoft_tutorials WHERE id = ?')
        .get(id)
      if (!existing) return { success: false, message: 'Tutorial tidak ditemukan' }

      const fields: string[] = []
      const values: unknown[] = []
      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
      if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
      if (fields.length === 0) return { success: false, message: 'Tidak ada data yang diubah' }

      values.push(id)
      sqlite.prepare(`UPDATE mediasoft_tutorials SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      return { success: true, message: 'Tutorial berhasil diupdate' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static delete(id: number) {
    try {
      sqlite.prepare('DELETE FROM mediasoft_tutorials WHERE id = ?').run(id)
      return { success: true, message: 'Tutorial berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
