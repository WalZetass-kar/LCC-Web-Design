import DatabaseConnection from '../database/connection.js';
import {
  calculateDiscountedPrice,
  toSqliteDateTime
} from '../utils/legacyDb.js';

function mapProductRow(row) {
  const originalPrice = Number(row.original_price || 0);
  const discount = Number(row.discount || 0);
  const price = Number(row.price ?? calculateDiscountedPrice(originalPrice, discount));

  return {
    id: row.kd_barang,
    categoryId: row.kd_kategori_barang,
    categoryName: row.category_name || '-',
    code: row.kd_barang,
    name: row.nama_barang,
    description: row.deskripsi_barang || '',
    price,
    originalPrice,
    capitalPrice: Number(row.capital_price || 0),
    discount,
    stock: Number(row.stok || 0),
    unit: row.unit_name || '',
    unitCode: row.kd_satuan,
    transactionType: row.jenis_transaksi || 'INCOME',
    photo: row.foto_barang || '',
    isActive: true,
    createdAt: row.tgl_wkt_simpan,
    updatedAt: row.tgl_wkt_ubah
  };
}

class ProductController {
  static async getAllUnits() {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const rows = sqlite
        .prepare(
          `SELECT kd_satuan AS id, nama_satuan AS name
           FROM mediasoft_satuan
           ORDER BY nama_satuan COLLATE NOCASE ASC`
        )
        .all();

      return {
        success: true,
        data: rows
      };
    } catch (error) {
      console.error('Get units error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data satuan',
        data: []
      };
    }
  }

  static buildProductQuery(filters = {}) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
      whereClauses.push('(lower(b.nama_barang) LIKE lower(?) OR lower(b.kd_barang) LIKE lower(?))');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.categoryId) {
      whereClauses.push('b.kd_kategori_barang = ?');
      params.push(Number(filters.categoryId));
    }

    if (filters.transactionType) {
      whereClauses.push('upper(COALESCE(b.jenis_transaksi, \'INCOME\')) = ?');
      params.push(String(filters.transactionType).toUpperCase());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT
        b.kd_barang,
        b.nama_barang,
        b.tgl_wkt_simpan,
        b.tgl_wkt_ubah,
        b.foto_barang,
        b.deskripsi_barang,
        b.stok,
        b.kd_satuan,
        b.jenis_transaksi,
        b.kd_kategori_barang,
        c.kategori_barang AS category_name,
        s.nama_satuan AS unit_name,
        COALESCE(h.harga_barang, 0) AS original_price,
        COALESCE(h.potongan, 0) AS discount,
        COALESCE(h.harga_modal, 0) AS capital_price,
        COALESCE(h.harga_barang - ((h.harga_barang * COALESCE(h.potongan, 0)) / 100.0), 0) AS price
      FROM mediasoft_barang b
      LEFT JOIN mediasoft_kategori_barang c ON c.kd_kategori_barang = b.kd_kategori_barang
      LEFT JOIN mediasoft_satuan s ON s.kd_satuan = b.kd_satuan
      LEFT JOIN mediasoft_harga h ON h.kd_barang = b.kd_barang
      ${whereSql}
      ORDER BY b.nama_barang COLLATE NOCASE ASC
    `;

    return { query, params };
  }

  static async getAllProducts(filters = {}) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const { query, params } = this.buildProductQuery(filters);
      const rows = sqlite.prepare(query).all(...params);

      return {
        success: true,
        data: rows.map(mapProductRow)
      };
    } catch (error) {
      console.error('Get products error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data produk',
        data: []
      };
    }
  }

  static async getProductById(id) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const row = sqlite
        .prepare(
          `SELECT
             b.kd_barang,
             b.nama_barang,
             b.tgl_wkt_simpan,
             b.tgl_wkt_ubah,
             b.foto_barang,
             b.deskripsi_barang,
             b.stok,
             b.kd_satuan,
             b.jenis_transaksi,
             b.kd_kategori_barang,
             c.kategori_barang AS category_name,
             s.nama_satuan AS unit_name,
             COALESCE(h.harga_barang, 0) AS original_price,
             COALESCE(h.potongan, 0) AS discount,
             COALESCE(h.harga_modal, 0) AS capital_price,
             COALESCE(h.harga_barang - ((h.harga_barang * COALESCE(h.potongan, 0)) / 100.0), 0) AS price
           FROM mediasoft_barang b
           LEFT JOIN mediasoft_kategori_barang c ON c.kd_kategori_barang = b.kd_kategori_barang
           LEFT JOIN mediasoft_satuan s ON s.kd_satuan = b.kd_satuan
           LEFT JOIN mediasoft_harga h ON h.kd_barang = b.kd_barang
           WHERE b.kd_barang = ?
           LIMIT 1`
        )
        .get(id);

      if (!row) {
        return {
          success: false,
          message: 'Produk tidak ditemukan'
        };
      }

      return {
        success: true,
        data: mapProductRow(row)
      };
    } catch (error) {
      console.error('Get product error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data produk'
      };
    }
  }

  static resolveUnitId(sqlite, unitName) {
    const normalizedUnit = String(unitName || '').trim();

    if (!normalizedUnit) {
      return 5;
    }

    const existing = sqlite
      .prepare(
        `SELECT kd_satuan
         FROM mediasoft_satuan
         WHERE lower(nama_satuan) = lower(?)
         LIMIT 1`
      )
      .get(normalizedUnit);

    if (existing) {
      return existing.kd_satuan;
    }

    const result = sqlite
      .prepare(
        `INSERT INTO mediasoft_satuan (nama_satuan)
         VALUES (?)`
      )
      .run(normalizedUnit);

    return Number(result.lastInsertRowid);
  }

  static async createProduct(productData) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const productCode = String(productData.code || '').trim();

      if (!productCode || !productData.name) {
        return {
          success: false,
          message: 'Kode dan nama produk wajib diisi'
        };
      }

      const duplicate = sqlite
        .prepare(
          `SELECT kd_barang
           FROM mediasoft_barang
           WHERE kd_barang = ?
           LIMIT 1`
        )
        .get(productCode);

      if (duplicate) {
        return {
          success: false,
          message: 'Kode produk sudah digunakan'
        };
      }

      const now = toSqliteDateTime();
      const unitId = this.resolveUnitId(sqlite, productData.unit);
      const transactionType = String(productData.transactionType || 'INCOME').toUpperCase();

      sqlite
        .prepare(
          `INSERT INTO mediasoft_barang (
             kd_barang, nama_barang, tgl_wkt_simpan, tgl_wkt_ubah, foto_barang,
             deskripsi_barang, nama_pengguna, stok, kd_satuan, jenis_transaksi, kd_kategori_barang
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          productCode,
          productData.name,
          now,
          now,
          productData.photo || '',
          productData.description || '',
          productData.username || 'system',
          Number(productData.stock || 0),
          unitId,
          transactionType,
          Number(productData.categoryId)
        );

      sqlite
        .prepare(
          `INSERT INTO mediasoft_harga (kd_barang, harga_barang, potongan, harga_modal)
           VALUES (?, ?, ?, ?)`
        )
        .run(
          productCode,
          Number(productData.originalPrice ?? productData.price ?? 0),
          Number(productData.discount || 0),
          Number(productData.capitalPrice || 0)
        );

      return {
        success: true,
        message: 'Produk berhasil ditambahkan',
        data: (await this.getProductById(productCode)).data
      };
    } catch (error) {
      console.error('Create product error:', error);
      return {
        success: false,
        message: 'Gagal menambahkan produk'
      };
    }
  }

  static async updateProduct(id, productData) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const nextCode = String(productData.code || '').trim();

      if (nextCode && nextCode !== id) {
        return {
          success: false,
          message: 'Perubahan kode produk belum didukung agar riwayat transaksi tetap aman'
        };
      }

      const existing = await this.getProductById(id);
      if (!existing.success) {
        return existing;
      }

      const now = toSqliteDateTime();
      const unitId = this.resolveUnitId(sqlite, productData.unit || existing.data.unit);
      const transactionType = String(productData.transactionType || existing.data.transactionType || 'INCOME').toUpperCase();

      sqlite
        .prepare(
          `UPDATE mediasoft_barang
           SET nama_barang = ?,
               tgl_wkt_ubah = ?,
               deskripsi_barang = ?,
               stok = ?,
               kd_satuan = ?,
               jenis_transaksi = ?,
               kd_kategori_barang = ?
           WHERE kd_barang = ?`
        )
        .run(
          productData.name,
          now,
          productData.description || '',
          Number(productData.stock || 0),
          unitId,
          transactionType,
          Number(productData.categoryId),
          id
        );

      sqlite
        .prepare(
          `INSERT INTO mediasoft_harga (kd_barang, harga_barang, potongan, harga_modal)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(kd_barang) DO UPDATE SET
             harga_barang = excluded.harga_barang,
             potongan = excluded.potongan,
             harga_modal = excluded.harga_modal`
        )
        .run(
          id,
          Number(productData.originalPrice ?? productData.price ?? 0),
          Number(productData.discount || 0),
          Number(productData.capitalPrice || 0)
        );

      return {
        success: true,
        message: 'Produk berhasil diupdate',
        data: (await this.getProductById(id)).data
      };
    } catch (error) {
      console.error('Update product error:', error);
      return {
        success: false,
        message: 'Gagal mengupdate produk'
      };
    }
  }

  static async deleteProduct(id) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const usage = sqlite
        .prepare(
          `SELECT COUNT(*) AS total
           FROM mediasoft_penjualan_detail
           WHERE kd_barang = ?`
        )
        .get(id)?.total ?? 0;

      if (usage > 0) {
        return {
          success: false,
          message: 'Produk sudah memiliki riwayat transaksi dan tidak bisa dihapus'
        };
      }

      sqlite.prepare(`DELETE FROM mediasoft_harga WHERE kd_barang = ?`).run(id);
      const result = sqlite.prepare(`DELETE FROM mediasoft_barang WHERE kd_barang = ?`).run(id);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Produk tidak ditemukan'
        };
      }

      return {
        success: true,
        message: 'Produk berhasil dihapus'
      };
    } catch (error) {
      console.error('Delete product error:', error);
      return {
        success: false,
        message: 'Gagal menghapus produk'
      };
    }
  }

  static async updateStock(id, quantity) {
    try {
      const product = await this.getProductById(id);
      if (!product.success) {
        return product;
      }

      const sqlite = DatabaseConnection.getSqlite();
      const newStock = Number(product.data.stock) + Number(quantity);

      if (newStock < 0) {
        return {
          success: false,
          message: 'Stok tidak mencukupi'
        };
      }

      sqlite
        .prepare(
          `UPDATE mediasoft_barang
           SET stok = ?, tgl_wkt_ubah = ?
           WHERE kd_barang = ?`
        )
        .run(newStock, toSqliteDateTime(), id);

      return {
        success: true,
        message: 'Stok berhasil diupdate',
        data: (await this.getProductById(id)).data
      };
    } catch (error) {
      console.error('Update stock error:', error);
      return {
        success: false,
        message: 'Gagal mengupdate stok'
      };
    }
  }
}

export default ProductController;
