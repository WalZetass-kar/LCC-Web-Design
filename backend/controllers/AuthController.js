import DatabaseConnection from '../database/connection.js';
import {
  hashSha1,
  isActiveLegacyUser,
  toSqliteDateTime
} from '../utils/legacyDb.js';

function mapUserRow(row, permissionCount = 0) {
  return {
    id: row.nama_pengguna,
    username: row.nama_pengguna,
    fullName: row.nama_lengkap || row.nama_pengguna,
    role: permissionCount >= 10 ? 'admin' : 'cashier',
    isActive: isActiveLegacyUser(row.status_user),
    lastLogin: row.terakhir_login
  };
}

class AuthController {
  static async login(username, password) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const user = sqlite
        .prepare(
          `SELECT nama_pengguna, kata_sandi, nama_lengkap, status_user, terakhir_login
           FROM mediasoft_pengguna
           WHERE lower(nama_pengguna) = lower(?)
           LIMIT 1`
        )
        .get(username);

      if (!user) {
        return {
          success: false,
          message: 'Username tidak ditemukan'
        };
      }

      const incomingHash = hashSha1(password);
      const storedPassword = String(user.kata_sandi || '');
      const passwordMatches =
        storedPassword === password ||
        storedPassword.toLowerCase() === incomingHash.toLowerCase();

      if (!passwordMatches) {
        return {
          success: false,
          message: 'Password salah'
        };
      }

      if (!isActiveLegacyUser(user.status_user)) {
        return {
          success: false,
          message: 'Akun tidak aktif'
        };
      }

      const permissionCount = sqlite
        .prepare(
          `SELECT COUNT(*) AS total
           FROM mediasoft_pengguna_hak_akses
           WHERE nama_pengguna = ? AND status = 'True'`
        )
        .get(user.nama_pengguna)?.total ?? 0;

      sqlite
        .prepare(
          `UPDATE mediasoft_pengguna
           SET terakhir_login = ?
           WHERE nama_pengguna = ?`
        )
        .run(toSqliteDateTime(), user.nama_pengguna);

      return {
        success: true,
        message: 'Login berhasil',
        data: mapUserRow(
          {
            ...user,
            terakhir_login: toSqliteDateTime()
          },
          permissionCount
        )
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat login'
      };
    }
  }

  static async getUserById(userId) {
    try {
      const sqlite = DatabaseConnection.getSqlite();
      const user = sqlite
        .prepare(
          `SELECT nama_pengguna, nama_lengkap, status_user, terakhir_login
           FROM mediasoft_pengguna
           WHERE nama_pengguna = ?
           LIMIT 1`
        )
        .get(userId);

      if (!user) {
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const permissionCount = sqlite
        .prepare(
          `SELECT COUNT(*) AS total
           FROM mediasoft_pengguna_hak_akses
           WHERE nama_pengguna = ? AND status = 'True'`
        )
        .get(user.nama_pengguna)?.total ?? 0;

      return {
        success: true,
        data: mapUserRow(user, permissionCount)
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan'
      };
    }
  }
}

export default AuthController;
