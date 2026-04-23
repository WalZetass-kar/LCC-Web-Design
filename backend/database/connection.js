import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../models/schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseConnection {
  static instance = null;
  static db = null;
  static sqlite = null;

  static getInstance() {
    if (!this.instance) {
      const dbPath = path.join(process.cwd(), 'sistem_pos.db');
      const sqlite = new Database(dbPath);
      
      // Enable foreign keys
      sqlite.pragma('foreign_keys = ON');
      
      this.db = drizzle(sqlite, { schema });
      this.sqlite = sqlite;
      this.instance = this;
      
      console.log('✅ Database connected:', dbPath);
    }
    return this.db;
  }

  static close() {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
      this.instance = null;
      console.log('🔌 Database connection closed');
    }
  }

  static getSqlite() {
    if (!this.sqlite) {
      this.getInstance();
    }

    return this.sqlite;
  }
}

export default DatabaseConnection;
