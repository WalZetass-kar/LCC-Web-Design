# Database Documentation - MediaSoft POS WalDevelop

## 📊 Database Overview

**Database Name:** `sistem_pos.db`  
**Type:** SQLite  
**ORM:** Drizzle ORM  
**Location:** Root project directory

## 🗄️ Database Schema

### 1. Users Table

Menyimpan data pengguna aplikasi (admin dan kasir).

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary key, auto increment
- `username` - Username untuk login (unique)
- `password` - Password (plain text untuk demo, gunakan bcrypt untuk production)
- `full_name` - Nama lengkap user
- `role` - Role user: 'admin' atau 'cashier'
- `is_active` - Status aktif (1 = aktif, 0 = nonaktif)
- `created_at` - Timestamp pembuatan
- `updated_at` - Timestamp update terakhir

**Sample Data:**
```
ID | Username | Full Name      | Role    | Active
1  | admin    | Administrator  | admin   | 1
2  | kasir1   | Kasir Satu     | cashier | 1
```

---

### 2. Categories Table

Menyimpan kategori produk.

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary key, auto increment
- `name` - Nama kategori (unique)
- `description` - Deskripsi kategori
- `is_active` - Status aktif (1 = aktif, 0 = nonaktif)
- `created_at` - Timestamp pembuatan
- `updated_at` - Timestamp update terakhir

**Sample Data:**
```
ID | Name        | Description
1  | Makanan     | Produk makanan dan snack
2  | Minuman     | Produk minuman
3  | Elektronik  | Produk elektronik
4  | Alat Tulis  | Produk alat tulis dan kantor
5  | Lainnya     | Produk lainnya
```

---

### 3. Products Table

Menyimpan data produk yang dijual.

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**Columns:**
- `id` - Primary key, auto increment
- `category_id` - Foreign key ke categories table
- `code` - Kode produk (unique)
- `name` - Nama produk
- `description` - Deskripsi produk
- `price` - Harga produk (REAL/float)
- `stock` - Jumlah stok
- `unit` - Satuan (pcs, kg, liter, box, pack, dll)
- `is_active` - Status aktif (1 = aktif, 0 = nonaktif)
- `created_at` - Timestamp pembuatan
- `updated_at` - Timestamp update terakhir

**Sample Data:**
```
Code    | Name                        | Price  | Stock | Unit
MKN001  | Indomie Goreng             | 3500   | 100   | pcs
MKN002  | Chitato Rasa Sapi Panggang | 12000  | 50    | pcs
MNM001  | Aqua 600ml                 | 4000   | 200   | botol
MNM002  | Teh Botol Sosro            | 5000   | 150   | botol
ATK001  | Pulpen Standard AE7        | 2500   | 75    | pcs
```

---

### 4. Transactions Table

Menyimpan header transaksi penjualan.

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  payment_amount REAL NOT NULL,
  change_amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  transaction_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Columns:**
- `id` - Primary key, auto increment
- `invoice_number` - Nomor invoice (unique, auto-generated)
- `user_id` - Foreign key ke users table (kasir yang melakukan transaksi)
- `total_amount` - Total belanja
- `payment_amount` - Jumlah uang yang dibayarkan
- `change_amount` - Kembalian
- `payment_method` - Metode pembayaran: 'cash', 'card', 'transfer'
- `notes` - Catatan transaksi (optional)
- `transaction_date` - Tanggal transaksi
- `created_at` - Timestamp pembuatan

**Invoice Format:**
```
INV/YYYYMMDD/HHMMSS
Example: INV/20240120/143052
```

---

### 5. Transaction Details Table

Menyimpan detail item dalam transaksi.

```sql
CREATE TABLE transaction_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  subtotal REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Columns:**
- `id` - Primary key, auto increment
- `transaction_id` - Foreign key ke transactions table
- `product_id` - Foreign key ke products table
- `product_name` - Nama produk (disimpan untuk history)
- `quantity` - Jumlah item dibeli
- `price` - Harga per item saat transaksi
- `subtotal` - Total harga (quantity × price)
- `created_at` - Timestamp pembuatan

---

## 🔗 Database Relations

```
users (1) ──────────── (N) transactions
                            │
categories (1) ─┐           │
                │           │
                ├─ (N) products (1) ── (N) transaction_details
```

**Relationships:**
1. **users → transactions**: One-to-Many (1 user bisa buat banyak transaksi)
2. **categories → products**: One-to-Many (1 kategori bisa punya banyak produk)
3. **products → transaction_details**: One-to-Many (1 produk bisa ada di banyak transaksi)
4. **transactions → transaction_details**: One-to-Many (1 transaksi bisa punya banyak item)

---

## 🔧 Database Operations

### Setup Database

```bash
# Create tables
node backend/database/migrate.js

# Seed initial data
node seed-data.js
```

### Query Examples

**Get all active products with category:**
```sql
SELECT 
  p.id, p.code, p.name, p.price, p.stock,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1;
```

**Get transaction with details:**
```sql
SELECT 
  t.invoice_number, t.total_amount, t.transaction_date,
  u.full_name as cashier,
  td.product_name, td.quantity, td.price, td.subtotal
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN transaction_details td ON t.id = td.transaction_id
WHERE t.id = 1;
```

**Get sales statistics:**
```sql
SELECT 
  COUNT(*) as total_transactions,
  SUM(total_amount) as total_sales,
  AVG(total_amount) as avg_transaction
FROM transactions
WHERE DATE(transaction_date) = DATE('now');
```

**Get top selling products:**
```sql
SELECT 
  td.product_name,
  SUM(td.quantity) as total_sold,
  SUM(td.subtotal) as total_revenue
FROM transaction_details td
LEFT JOIN transactions t ON td.transaction_id = t.id
WHERE DATE(t.transaction_date) >= DATE('now', '-30 days')
GROUP BY td.product_name
ORDER BY total_sold DESC
LIMIT 5;
```

---

## 📝 Current Database Status

### Data Summary

```bash
# Check data count
sqlite3 sistem_pos.db "
  SELECT 'Users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'Categories', COUNT(*) FROM categories
  UNION ALL
  SELECT 'Products', COUNT(*) FROM products
  UNION ALL
  SELECT 'Transactions', COUNT(*) FROM transactions
  UNION ALL
  SELECT 'Transaction Details', COUNT(*) FROM transaction_details;
"
```

**Current Data:**
- ✅ Users: 2 (admin, kasir1)
- ✅ Categories: 5 (Makanan, Minuman, Elektronik, Alat Tulis, Lainnya)
- ✅ Products: 5 (Sample products)
- ⏳ Transactions: 0 (akan bertambah saat ada transaksi)
- ⏳ Transaction Details: 0 (akan bertambah saat ada transaksi)

---

## 🔐 Security Notes

### Current Implementation (Demo)
- ❌ Password stored in **plain text**
- ❌ No password hashing
- ❌ No encryption

### Production Recommendations
1. **Password Hashing:**
   ```javascript
   import bcrypt from 'bcrypt';
   
   // Hash password
   const hashedPassword = await bcrypt.hash(password, 10);
   
   // Verify password
   const isValid = await bcrypt.compare(password, hashedPassword);
   ```

2. **Database Encryption:**
   - Use SQLCipher for encrypted SQLite
   - Encrypt sensitive data

3. **Access Control:**
   - Implement proper authentication
   - Use JWT tokens
   - Add rate limiting

---

## 🛠️ Database Maintenance

### Backup Database

```bash
# Backup
cp sistem_pos.db sistem_pos_backup_$(date +%Y%m%d).db

# Or using SQLite
sqlite3 sistem_pos.db ".backup sistem_pos_backup.db"
```

### Reset Database

```bash
# Delete database
rm sistem_pos.db

# Recreate tables
node backend/database/migrate.js

# Reseed data
node seed-data.js
```

### View Database

```bash
# Open SQLite CLI
sqlite3 sistem_pos.db

# Common commands:
.tables              # List all tables
.schema users        # Show table schema
SELECT * FROM users; # Query data
.quit                # Exit
```

### Database Browser

Gunakan tools seperti:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLiteStudio](https://sqlitestudio.pl/)
- VS Code Extension: SQLite Viewer

---

## 📊 Database Performance

### Indexes

Saat ini menggunakan default indexes:
- Primary keys (auto-indexed)
- Unique constraints (auto-indexed)

### Optimization Tips

1. **Add indexes untuk query yang sering:**
   ```sql
   CREATE INDEX idx_products_category ON products(category_id);
   CREATE INDEX idx_transactions_date ON transactions(transaction_date);
   CREATE INDEX idx_transactions_user ON transactions(user_id);
   ```

2. **Analyze query performance:**
   ```sql
   EXPLAIN QUERY PLAN SELECT * FROM products WHERE category_id = 1;
   ```

3. **Vacuum database:**
   ```bash
   sqlite3 sistem_pos.db "VACUUM;"
   ```

---

## 🔄 Migration Strategy

### Current Approach
- Manual SQL in `migrate.js`
- Simple CREATE TABLE statements

### Future Improvements
1. Use Drizzle Kit migrations
2. Version-controlled migrations
3. Rollback support
4. Migration history tracking

---

## 📈 Scaling Considerations

### Current Setup (SQLite)
- ✅ Perfect untuk single-user desktop app
- ✅ Fast local queries
- ✅ No network latency
- ❌ Limited untuk multi-user
- ❌ No concurrent writes

### Future Options

**For Multi-User:**
- PostgreSQL
- MySQL
- MongoDB

**For Cloud:**
- Supabase
- Firebase
- AWS RDS

---

## 🎯 Best Practices

1. **Always use transactions untuk multiple operations:**
   ```javascript
   const transaction = db.transaction(() => {
     // Multiple operations here
   });
   transaction();
   ```

2. **Use prepared statements (Drizzle ORM handles this):**
   ```javascript
   // Good (parameterized)
   db.select().from(users).where(eq(users.id, userId));
   
   // Bad (SQL injection risk)
   db.execute(`SELECT * FROM users WHERE id = ${userId}`);
   ```

3. **Regular backups:**
   - Daily backups
   - Keep multiple versions
   - Test restore process

4. **Monitor database size:**
   ```bash
   ls -lh sistem_pos.db
   ```

---

## 📚 Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)
- [Better-SQLite3 Docs](https://github.com/WiseLibs/better-sqlite3)

---

**MediaSoft POS WalDevelop**  
Database Documentation v1.0.0
