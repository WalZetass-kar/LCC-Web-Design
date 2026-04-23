import DatabaseConnection from '../database/connection.js';

function mapCategoryRow(row) {
  return {
    id: row.kd_kategori_barang,
    name: row.kategori_barang,
    description: null,
    isActive: true
  };
}

class CategoryController {
  static async getAllCategories() {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const rows = sqlite
        .prepare(
          `SELECT kd_kategori_barang, kategori_barang
           FROM mediasoft_kategori_barang
           ORDER BY kategori_barang COLLATE NOCASE ASC`
        )
        .all();

      return {
        success: true,
        data: rows.map(mapCategoryRow)
      };
    } catch (error) {
      console.error('Get categories error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data kategori',
        data: []
      };
    }
  }

  static async getCategoryById(id) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const row = sqlite
        .prepare(
          `SELECT kd_kategori_barang, kategori_barang
           FROM mediasoft_kategori_barang
           WHERE kd_kategori_barang = ?
           LIMIT 1`
        )
        .get(id);

      if (!row) {
        return {
          success: false,
          message: 'Kategori tidak ditemukan'
        };
      }

      return {
        success: true,
        data: mapCategoryRow(row)
      };
    } catch (error) {
      console.error('Get category error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data kategori'
      };
    }
  }

  static async createCategory(categoryData) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const name = String(categoryData.name || '').trim();

      if (!name) {
        return {
          success: false,
          message: 'Nama kategori wajib diisi'
        };
      }

      const duplicate = sqlite
        .prepare(
          `SELECT kd_kategori_barang
           FROM mediasoft_kategori_barang
           WHERE lower(kategori_barang) = lower(?)
           LIMIT 1`
        )
        .get(name);

      if (duplicate) {
        return {
          success: false,
          message: 'Nama kategori sudah digunakan'
        };
      }

      const result = sqlite
        .prepare(
          `INSERT INTO mediasoft_kategori_barang (kategori_barang)
           VALUES (?)`
        )
        .run(name);

      return await this.getCategoryById(result.lastInsertRowid);
    } catch (error) {
      console.error('Create category error:', error);
      return {
        success: false,
        message: 'Gagal menambahkan kategori'
      };
    }
  }

  static async updateCategory(id, categoryData) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const name = String(categoryData.name || '').trim();

      if (!name) {
        return {
          success: false,
          message: 'Nama kategori wajib diisi'
        };
      }

      const duplicate = sqlite
        .prepare(
          `SELECT kd_kategori_barang
           FROM mediasoft_kategori_barang
           WHERE lower(kategori_barang) = lower(?)
             AND kd_kategori_barang <> ?
           LIMIT 1`
        )
        .get(name, id);

      if (duplicate) {
        return {
          success: false,
          message: 'Nama kategori sudah digunakan'
        };
      }

      const result = sqlite
        .prepare(
          `UPDATE mediasoft_kategori_barang
           SET kategori_barang = ?
           WHERE kd_kategori_barang = ?`
        )
        .run(name, id);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Kategori tidak ditemukan'
        };
      }

      return {
        success: true,
        message: 'Kategori berhasil diupdate',
        data: (await this.getCategoryById(id)).data
      };
    } catch (error) {
      console.error('Update category error:', error);
      return {
        success: false,
        message: 'Gagal mengupdate kategori'
      };
    }
  }

  static async deleteCategory(id) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const usage = sqlite
        .prepare(
          `SELECT COUNT(*) AS total
           FROM mediasoft_barang
           WHERE kd_kategori_barang = ?`
        )
        .get(id)?.total ?? 0;

      if (usage > 0) {
        return {
          success: false,
          message: 'Kategori masih dipakai oleh produk dan tidak bisa dihapus'
        };
      }

      const result = sqlite
        .prepare(
          `DELETE FROM mediasoft_kategori_barang
           WHERE kd_kategori_barang = ?`
        )
        .run(id);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Kategori tidak ditemukan'
        };
      }

      return {
        success: true,
        message: 'Kategori berhasil dihapus'
      };
    } catch (error) {
      console.error('Delete category error:', error);
      return {
        success: false,
        message: 'Gagal menghapus kategori'
      };
    }
  }
}

export default CategoryController;
