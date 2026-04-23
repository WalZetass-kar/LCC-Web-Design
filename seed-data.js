import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './backend/models/schema.js';

const sqlite = new Database('./sistem_pos.db');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

console.log('🌱 Starting database seeding...');

try {
  // Seed Users
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'Administrator',
      role: 'admin',
      isActive: 1
    },
    {
      username: 'kasir1',
      password: 'kasir123',
      fullName: 'Kasir Satu',
      role: 'cashier',
      isActive: 1
    }
  ];

  for (const user of defaultUsers) {
    const stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO users (username, password, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(user.username, user.password, user.fullName, user.role, user.isActive);
  }
  console.log('✅ Users seeded');

  // Seed Categories
  const defaultCategories = [
    { name: 'Makanan', description: 'Produk makanan dan snack' },
    { name: 'Minuman', description: 'Produk minuman' },
    { name: 'Elektronik', description: 'Produk elektronik' },
    { name: 'Alat Tulis', description: 'Produk alat tulis dan kantor' },
    { name: 'Lainnya', description: 'Produk lainnya' }
  ];

  for (const category of defaultCategories) {
    const stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO categories (name, description, is_active)
      VALUES (?, ?, 1)
    `);
    stmt.run(category.name, category.description);
  }
  console.log('✅ Categories seeded');

  // Seed Products
  const defaultProducts = [
    {
      categoryId: 1,
      code: 'MKN001',
      name: 'Indomie Goreng',
      description: 'Mie instan rasa goreng',
      price: 3500,
      stock: 100,
      unit: 'pcs'
    },
    {
      categoryId: 1,
      code: 'MKN002',
      name: 'Chitato Rasa Sapi Panggang',
      description: 'Keripik kentang rasa sapi panggang',
      price: 12000,
      stock: 50,
      unit: 'pcs'
    },
    {
      categoryId: 2,
      code: 'MNM001',
      name: 'Aqua 600ml',
      description: 'Air mineral dalam kemasan',
      price: 4000,
      stock: 200,
      unit: 'botol'
    },
    {
      categoryId: 2,
      code: 'MNM002',
      name: 'Teh Botol Sosro',
      description: 'Teh dalam kemasan botol',
      price: 5000,
      stock: 150,
      unit: 'botol'
    },
    {
      categoryId: 4,
      code: 'ATK001',
      name: 'Pulpen Standard AE7',
      description: 'Pulpen warna hitam',
      price: 2500,
      stock: 75,
      unit: 'pcs'
    }
  ];

  for (const product of defaultProducts) {
    const stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO products (category_id, code, name, description, price, stock, unit, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(
      product.categoryId,
      product.code,
      product.name,
      product.description,
      product.price,
      product.stock,
      product.unit
    );
  }
  console.log('✅ Products seeded');

  console.log('🎉 Database seeding completed!');
} catch (error) {
  console.error('❌ Seeding error:', error);
} finally {
  sqlite.close();
}
