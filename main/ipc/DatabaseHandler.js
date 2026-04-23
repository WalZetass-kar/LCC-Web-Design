import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let DatabaseConnection;

async function loadModules() {
  const dbConnection = await import(path.join(__dirname, '../../backend/database/connection.js'));
  DatabaseConnection = dbConnection.default;
}

class DatabaseHandler {
  static async initialize() {
    try {
      await loadModules();
      DatabaseConnection.getInstance();

      console.log('[SUCCESS] Legacy MediaSoft database connected successfully');
      return { success: true, message: 'Database connected' };
    } catch (error) {
      console.error('[ERROR] Database initialization error:', error);
      throw error;
    }
  }

  static close() {
    if (DatabaseConnection) {
      DatabaseConnection.close();
    }
  }

  static register(ipcMain) {
    ipcMain.handle('database:initialize', async () => {
      try {
        return await this.initialize();
      } catch (error) {
        return { success: false, message: error.message };
      }
    });

    ipcMain.handle('database:seed', async () => {
      return {
        success: false,
        message: 'Mode seed demo dinonaktifkan karena aplikasi sekarang memakai data real dari tabel MediaSoft.'
      };
    });
  }
}

export default DatabaseHandler;
