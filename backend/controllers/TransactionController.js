import DatabaseConnection from '../database/connection.js';
import ProductController from './ProductController.js';
import {
  normaliseAppPaymentMethod,
  normaliseDbPaymentMethod,
  toSqliteDateTime
} from '../utils/legacyDb.js';

function mapTransactionRow(row) {
  return {
    id: row.kd_tansaksi_jual,
    invoiceNumber: row.kd_tansaksi_jual,
    userId: row.username_transaksi,
    userName: row.user_name || row.username_transaksi,
    totalAmount: Number(row.sub_total || 0),
    paymentAmount: Number(row.yang_dibayar || 0),
    changeAmount: Number(row.kembalian || 0),
    paymentMethod: normaliseAppPaymentMethod(row.jenis_pembayaran),
    notes: row.deskripsi || '',
    transactionDate: row.tgl_wkt_transaksi,
    createdAt: row.tgl_wkt_transaksi,
    totalQuantity: Number(row.total_qty || 0)
  };
}

class TransactionController {
  static generateInvoiceNumber(sqlite) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const prefix = `FJ-${day}${month}${year}`;
    const latest = sqlite
      .prepare(
        `SELECT kd_tansaksi_jual
         FROM mediasoft_penjualan
         WHERE kd_tansaksi_jual LIKE ?
         ORDER BY kd_tansaksi_jual DESC
         LIMIT 1`
      )
      .get(`${prefix}%`);

    const lastSequence = latest
      ? Number(String(latest.kd_tansaksi_jual).replace(prefix, '')) || 0
      : 0;

    return `${prefix}${lastSequence + 1}`;
  }

  static async createTransaction(transactionData) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const items = [];
      let totalAmount = 0;
      let totalQuantity = 0;

      for (const item of transactionData.items || []) {
        const product = await ProductController.getProductById(item.productId);

        if (!product.success) {
          return {
            success: false,
            message: `Produk dengan ID ${item.productId} tidak ditemukan`
          };
        }

        if (product.data.transactionType !== 'INCOME') {
          return {
            success: false,
            message: `${product.data.name} bukan item penjualan`
          };
        }

        if (Number(product.data.stock) < Number(item.quantity)) {
          return {
            success: false,
            message: `Stok ${product.data.name} tidak mencukupi`
          };
        }

        const quantity = Number(item.quantity);
        const subtotal = Number(item.price) * quantity;
        totalAmount += subtotal;
        totalQuantity += quantity;

        items.push({
          productId: product.data.id,
          productName: product.data.name,
          quantity,
          price: Number(item.price),
          originalPrice: Number(product.data.originalPrice || item.price),
          capitalPrice: Number(product.data.capitalPrice || 0),
          discount: Number(product.data.discount || 0),
          discountAmount: Number(product.data.originalPrice || item.price) * (Number(product.data.discount || 0) / 100),
          subtotal
        });
      }

      if (items.length === 0) {
        return {
          success: false,
          message: 'Item transaksi belum dipilih'
        };
      }

      if (Number(transactionData.paymentAmount) < totalAmount) {
        return {
          success: false,
          message: 'Jumlah pembayaran kurang'
        };
      }

      const now = toSqliteDateTime();
      const changeAmount = Number(transactionData.paymentAmount) - totalAmount;
      const invoiceNumber = this.generateInvoiceNumber(sqlite);
      const paymentMethod = normaliseDbPaymentMethod(transactionData.paymentMethod);
      const notes = transactionData.notes || '';
      const username = transactionData.userId;

      const runTransaction = sqlite.transaction(() => {
        sqlite
          .prepare(
            `INSERT INTO mediasoft_penjualan (
               kd_tansaksi_jual, tgl_wkt_transaksi, deskripsi, username_transaksi,
               total_qty, sub_total, yang_dibayar, kembalian, jenis_pembayaran
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            invoiceNumber,
            now,
            notes,
            username,
            totalQuantity,
            totalAmount,
            Number(transactionData.paymentAmount),
            changeAmount,
            paymentMethod
          );

        const insertDetail = sqlite.prepare(
          `INSERT INTO mediasoft_penjualan_detail (
             kd_tansaksi_jual, kd_barang, harga_modal, harga_jual, qty, disc,
             harga_disc, total_harga_jual, nama_pengguna, tgl_waktu_input
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        const updateStock = sqlite.prepare(
          `UPDATE mediasoft_barang
           SET stok = stok - ?, tgl_wkt_ubah = ?
           WHERE kd_barang = ?`
        );

        for (const item of items) {
          insertDetail.run(
            invoiceNumber,
            item.productId,
            item.capitalPrice,
            item.originalPrice,
            item.quantity,
            item.discount,
            item.discountAmount,
            item.subtotal,
            username,
            now
          );

          updateStock.run(item.quantity, now, item.productId);
        }
      });

      runTransaction();

      return {
        success: true,
        message: 'Transaksi berhasil',
        data: {
          id: invoiceNumber,
          invoiceNumber,
          userId: username,
          totalAmount,
          paymentAmount: Number(transactionData.paymentAmount),
          changeAmount,
          paymentMethod: normaliseAppPaymentMethod(paymentMethod),
          notes,
          transactionDate: now,
          items
        }
      };
    } catch (error) {
      console.error('Create transaction error:', error);
      return {
        success: false,
        message: 'Gagal membuat transaksi'
      };
    }
  }

  static async getAllTransactions(filters = {}) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const whereClauses = [];
      const params = [];

      if (filters.startDate) {
        whereClauses.push('p.tgl_wkt_transaksi >= ?');
        params.push(toSqliteDateTime(filters.startDate));
      }

      if (filters.endDate) {
        whereClauses.push('p.tgl_wkt_transaksi <= ?');
        params.push(toSqliteDateTime(filters.endDate));
      }

      if (filters.userId) {
        whereClauses.push('p.username_transaksi = ?');
        params.push(filters.userId);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const rows = sqlite
        .prepare(
          `SELECT
             p.kd_tansaksi_jual,
             p.tgl_wkt_transaksi,
             p.deskripsi,
             p.username_transaksi,
             p.total_qty,
             p.sub_total,
             p.yang_dibayar,
             p.kembalian,
             p.jenis_pembayaran,
             COALESCE(u.nama_lengkap, p.username_transaksi) AS user_name
           FROM mediasoft_penjualan p
           LEFT JOIN mediasoft_pengguna u ON u.nama_pengguna = p.username_transaksi
           ${whereSql}
           ORDER BY p.tgl_wkt_transaksi DESC, p.kd_tansaksi_jual DESC`
        )
        .all(...params);

      return {
        success: true,
        data: rows.map(mapTransactionRow)
      };
    } catch (error) {
      console.error('Get transactions error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data transaksi',
        data: []
      };
    }
  }

  static async getTransactionById(id) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const transactionRow = sqlite
        .prepare(
          `SELECT
             p.kd_tansaksi_jual,
             p.tgl_wkt_transaksi,
             p.deskripsi,
             p.username_transaksi,
             p.total_qty,
             p.sub_total,
             p.yang_dibayar,
             p.kembalian,
             p.jenis_pembayaran,
             COALESCE(u.nama_lengkap, p.username_transaksi) AS user_name
           FROM mediasoft_penjualan p
           LEFT JOIN mediasoft_pengguna u ON u.nama_pengguna = p.username_transaksi
           WHERE p.kd_tansaksi_jual = ?
           LIMIT 1`
        )
        .get(id);

      if (!transactionRow) {
        return {
          success: false,
          message: 'Transaksi tidak ditemukan'
        };
      }

      const detailRows = sqlite
        .prepare(
          `SELECT
             d.kd_barang,
             COALESCE(b.nama_barang, d.kd_barang) AS product_name,
             d.qty,
             d.harga_jual,
             d.disc,
             d.harga_disc,
             d.total_harga_jual
           FROM mediasoft_penjualan_detail d
           LEFT JOIN mediasoft_barang b ON b.kd_barang = d.kd_barang
           WHERE d.kd_tansaksi_jual = ?
           ORDER BY d.kd_trans_jual_detail ASC`
        )
        .all(id);

      return {
        success: true,
        data: {
          ...mapTransactionRow(transactionRow),
          items: detailRows.map((item) => ({
            productId: item.kd_barang,
            productName: item.product_name,
            quantity: Number(item.qty || 0),
            price: Number(item.harga_jual || 0) - Number(item.harga_disc || 0),
            originalPrice: Number(item.harga_jual || 0),
            discount: Number(item.disc || 0),
            discountAmount: Number(item.harga_disc || 0),
            subtotal: Number(item.total_harga_jual || 0)
          }))
        }
      };
    } catch (error) {
      console.error('Get transaction error:', error);
      return {
        success: false,
        message: 'Gagal mengambil data transaksi'
      };
    }
  }

  static async getDashboardStats(startDate, endDate) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const start = toSqliteDateTime(startDate);
      const end = toSqliteDateTime(endDate);

      const salesResult = sqlite
        .prepare(
          `SELECT
             COALESCE(SUM(sub_total), 0) AS total_sales,
             COUNT(kd_tansaksi_jual) AS total_transactions
           FROM mediasoft_penjualan
           WHERE tgl_wkt_transaksi >= ?
             AND tgl_wkt_transaksi <= ?`
        )
        .get(start, end);

      const topProducts = sqlite
        .prepare(
          `SELECT
             COALESCE(b.nama_barang, d.kd_barang) AS product_name,
             SUM(d.qty) AS total_quantity,
             SUM(d.total_harga_jual) AS total_revenue
           FROM mediasoft_penjualan_detail d
           LEFT JOIN mediasoft_penjualan p ON p.kd_tansaksi_jual = d.kd_tansaksi_jual
           LEFT JOIN mediasoft_barang b ON b.kd_barang = d.kd_barang
           WHERE p.tgl_wkt_transaksi >= ?
             AND p.tgl_wkt_transaksi <= ?
           GROUP BY d.kd_barang, b.nama_barang
           ORDER BY total_quantity DESC, total_revenue DESC
           LIMIT 5`
        )
        .all(start, end)
        .map((item) => ({
          productName: item.product_name,
          totalQuantity: Number(item.total_quantity || 0),
          totalRevenue: Number(item.total_revenue || 0)
        }));

      return {
        success: true,
        data: {
          totalSales: Number(salesResult.total_sales || 0),
          totalTransactions: Number(salesResult.total_transactions || 0),
          topProducts
        }
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik dashboard',
        data: {
          totalSales: 0,
          totalTransactions: 0,
          topProducts: []
        }
      };
    }
  }
}

export default TransactionController;
