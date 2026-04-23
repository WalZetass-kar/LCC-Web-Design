# API Documentation - MediaSoft POS WalDevelop

Dokumentasi lengkap API IPC (Inter-Process Communication) antara Electron dan React.

## 📡 IPC API Overview

Semua API diakses melalui `window.electronAPI` dari React components.

## 🔐 Authentication API

### login(username, password)

Login user ke sistem.

**Parameters:**
- `username` (string) - Username user
- `password` (string) - Password user

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: {
    id: number,
    username: string,
    fullName: string,
    role: string,
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

**Example:**
```javascript
const result = await window.electronAPI.login('admin', 'admin123');
if (result.success) {
  console.log('Login berhasil:', result.data);
}
```

### getUserById(userId)

Mendapatkan data user berdasarkan ID.

**Parameters:**
- `userId` (number) - ID user

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data?: UserObject
}
```

## 📦 Products API

### getAllProducts(filters)

Mendapatkan semua produk dengan filter opsional.

**Parameters:**
- `filters` (object) - Filter options
  - `search` (string) - Cari berdasarkan nama/kode
  - `categoryId` (number) - Filter berdasarkan kategori
  - `isActive` (boolean) - Filter produk aktif/nonaktif

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data: [
    {
      id: number,
      categoryId: number,
      categoryName: string,
      code: string,
      name: string,
      description: string,
      price: number,
      stock: number,
      unit: string,
      isActive: boolean,
      createdAt: string,
      updatedAt: string
    }
  ]
}
```

**Example:**
```javascript
// Get all active products
const result = await window.electronAPI.getAllProducts({ isActive: true });

// Search products
const result = await window.electronAPI.getAllProducts({ 
  search: 'indomie' 
});

// Filter by category
const result = await window.electronAPI.getAllProducts({ 
  categoryId: 1 
});
```

### getProductById(id)

Mendapatkan detail produk berdasarkan ID.

**Parameters:**
- `id` (number) - ID produk

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data?: ProductObject
}
```

### createProduct(data)

Membuat produk baru.

**Parameters:**
- `data` (object) - Data produk
  - `categoryId` (number) - ID kategori
  - `code` (string) - Kode produk (unique)
  - `name` (string) - Nama produk
  - `description` (string) - Deskripsi
  - `price` (number) - Harga
  - `stock` (number) - Stok
  - `unit` (string) - Satuan (pcs, kg, liter, dll)

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: ProductObject
}
```

**Example:**
```javascript
const result = await window.electronAPI.createProduct({
  categoryId: 1,
  code: 'MKN003',
  name: 'Mie Sedaap Goreng',
  description: 'Mie instan goreng',
  price: 3000,
  stock: 100,
  unit: 'pcs'
});
```

### updateProduct(id, data)

Update data produk.

**Parameters:**
- `id` (number) - ID produk
- `data` (object) - Data yang akan diupdate

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: ProductObject
}
```

### deleteProduct(id)

Hapus produk (soft delete).

**Parameters:**
- `id` (number) - ID produk

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

### updateStock(id, quantity)

Update stok produk.

**Parameters:**
- `id` (number) - ID produk
- `quantity` (number) - Jumlah perubahan (positif untuk tambah, negatif untuk kurang)

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: ProductObject
}
```

**Example:**
```javascript
// Tambah stok 50
await window.electronAPI.updateStock(1, 50);

// Kurangi stok 10
await window.electronAPI.updateStock(1, -10);
```

## 🏷️ Categories API

### getAllCategories(activeOnly)

Mendapatkan semua kategori.

**Parameters:**
- `activeOnly` (boolean) - Hanya kategori aktif

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data: [
    {
      id: number,
      name: string,
      description: string,
      isActive: boolean,
      createdAt: string,
      updatedAt: string
    }
  ]
}
```

### getCategoryById(id)

Mendapatkan detail kategori.

**Parameters:**
- `id` (number) - ID kategori

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data?: CategoryObject
}
```

### createCategory(data)

Membuat kategori baru.

**Parameters:**
- `data` (object)
  - `name` (string) - Nama kategori (unique)
  - `description` (string) - Deskripsi

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: CategoryObject
}
```

### updateCategory(id, data)

Update kategori.

**Parameters:**
- `id` (number) - ID kategori
- `data` (object) - Data yang akan diupdate

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: CategoryObject
}
```

### deleteCategory(id)

Hapus kategori (soft delete).

**Parameters:**
- `id` (number) - ID kategori

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

## 💰 Transactions API

### createTransaction(data)

Membuat transaksi baru.

**Parameters:**
- `data` (object)
  - `userId` (number) - ID user yang melakukan transaksi
  - `items` (array) - Array of items
    - `productId` (number) - ID produk
    - `quantity` (number) - Jumlah
    - `price` (number) - Harga saat transaksi
  - `paymentAmount` (number) - Jumlah pembayaran
  - `paymentMethod` (string) - Metode pembayaran (cash, card, transfer)
  - `notes` (string) - Catatan (optional)

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  data?: {
    id: number,
    invoiceNumber: string,
    userId: number,
    totalAmount: number,
    paymentAmount: number,
    changeAmount: number,
    paymentMethod: string,
    notes: string,
    transactionDate: string,
    createdAt: string,
    items: [
      {
        productId: number,
        productName: string,
        quantity: number,
        price: number,
        subtotal: number
      }
    ]
  }
}
```

**Example:**
```javascript
const result = await window.electronAPI.createTransaction({
  userId: 1,
  items: [
    { productId: 1, quantity: 2, price: 3500 },
    { productId: 3, quantity: 1, price: 4000 }
  ],
  paymentAmount: 15000,
  paymentMethod: 'cash',
  notes: 'Pelanggan reguler'
});

if (result.success) {
  console.log('Invoice:', result.data.invoiceNumber);
  console.log('Kembalian:', result.data.changeAmount);
}
```

### getAllTransactions(filters)

Mendapatkan semua transaksi dengan filter.

**Parameters:**
- `filters` (object)
  - `startDate` (string) - Tanggal mulai (ISO format)
  - `endDate` (string) - Tanggal akhir (ISO format)
  - `userId` (number) - Filter berdasarkan user

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data: [
    {
      id: number,
      invoiceNumber: string,
      userId: number,
      userName: string,
      totalAmount: number,
      paymentAmount: number,
      changeAmount: number,
      paymentMethod: string,
      notes: string,
      transactionDate: string,
      createdAt: string
    }
  ]
}
```

**Example:**
```javascript
// Get all transactions
const result = await window.electronAPI.getAllTransactions({});

// Filter by date range
const result = await window.electronAPI.getAllTransactions({
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-12-31T23:59:59.999Z'
});

// Filter by user
const result = await window.electronAPI.getAllTransactions({
  userId: 1
});
```

### getTransactionById(id)

Mendapatkan detail transaksi dengan items.

**Parameters:**
- `id` (number) - ID transaksi

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data?: {
    ...TransactionObject,
    items: [TransactionDetailObject]
  }
}
```

### getDashboardStats(startDate, endDate)

Mendapatkan statistik untuk dashboard.

**Parameters:**
- `startDate` (string) - Tanggal mulai (ISO format)
- `endDate` (string) - Tanggal akhir (ISO format)

**Returns:**
```javascript
{
  success: boolean,
  message?: string,
  data: {
    totalSales: number,
    totalTransactions: number,
    topProducts: [
      {
        productName: string,
        totalQuantity: number,
        totalRevenue: number
      }
    ]
  }
}
```

**Example:**
```javascript
const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const result = await window.electronAPI.getDashboardStats(
  startOfMonth.toISOString(),
  endOfMonth.toISOString()
);

console.log('Total Penjualan:', result.data.totalSales);
console.log('Total Transaksi:', result.data.totalTransactions);
console.log('Produk Terlaris:', result.data.topProducts);
```

## 🗄️ Database API

### initializeDatabase()

Inisialisasi database (create tables & seed data).

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

### seedDatabase()

Seed data awal ke database.

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

## 📝 Response Format

Semua API menggunakan format response yang konsisten:

### Success Response
```javascript
{
  success: true,
  message: "Operasi berhasil",
  data: { ... }
}
```

### Error Response
```javascript
{
  success: false,
  message: "Pesan error yang user-friendly"
}
```

## 🔒 Error Handling

### Common Errors

**Validation Error:**
```javascript
{
  success: false,
  message: "Mohon lengkapi semua field yang wajib diisi"
}
```

**Not Found Error:**
```javascript
{
  success: false,
  message: "Produk tidak ditemukan"
}
```

**Unique Constraint Error:**
```javascript
{
  success: false,
  message: "Kode produk sudah digunakan"
}
```

**Stock Error:**
```javascript
{
  success: false,
  message: "Stok tidak mencukupi"
}
```

## 💡 Best Practices

### 1. Always Check Success
```javascript
const result = await window.electronAPI.createProduct(data);
if (result.success) {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  alert(result.message);
}
```

### 2. Use Try-Catch
```javascript
try {
  const result = await window.electronAPI.getAllProducts({});
  if (result.success) {
    setProducts(result.data);
  }
} catch (error) {
  console.error('Error:', error);
  alert('Terjadi kesalahan');
}
```

### 3. Loading States
```javascript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    const result = await window.electronAPI.createProduct(data);
    // Handle result
  } finally {
    setLoading(false);
  }
};
```

### 4. Validate Before API Call
```javascript
const handleSubmit = async () => {
  // Client-side validation
  if (!formData.name || !formData.price) {
    alert('Mohon lengkapi form');
    return;
  }
  
  // API call
  const result = await window.electronAPI.createProduct(formData);
};
```

## 🧪 Testing Examples

### Test Login
```javascript
// Valid credentials
const result = await window.electronAPI.login('admin', 'admin123');
console.assert(result.success === true);

// Invalid credentials
const result = await window.electronAPI.login('admin', 'wrong');
console.assert(result.success === false);
```

### Test Product CRUD
```javascript
// Create
const created = await window.electronAPI.createProduct({
  categoryId: 1,
  code: 'TEST001',
  name: 'Test Product',
  price: 10000,
  stock: 50,
  unit: 'pcs'
});
console.assert(created.success === true);

// Read
const product = await window.electronAPI.getProductById(created.data.id);
console.assert(product.data.name === 'Test Product');

// Update
const updated = await window.electronAPI.updateProduct(created.data.id, {
  price: 12000
});
console.assert(updated.data.price === 12000);

// Delete
const deleted = await window.electronAPI.deleteProduct(created.data.id);
console.assert(deleted.success === true);
```

---

**MediaSoft POS WalDevelop API Documentation v1.0.0**

Untuk pertanyaan atau issue, silakan hubungi developer.
