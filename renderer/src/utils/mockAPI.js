// Mock API for browser development (when Electron is not available)

const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    fullName: 'Administrator',
    role: 'admin',
    isActive: true
  },
  {
    id: 2,
    username: 'kasir1',
    password: 'kasir123',
    fullName: 'Kasir Satu',
    role: 'cashier',
    isActive: true
  }
];

const mockCategories = [
  { id: 1, name: 'Makanan', description: 'Produk makanan dan snack', isActive: true },
  { id: 2, name: 'Minuman', description: 'Produk minuman', isActive: true },
  { id: 3, name: 'Elektronik', description: 'Produk elektronik', isActive: true },
  { id: 4, name: 'Alat Tulis', description: 'Produk alat tulis dan kantor', isActive: true },
  { id: 5, name: 'Lainnya', description: 'Produk lainnya', isActive: true }
];

const mockUnits = [
  { id: 1, name: 'Kg' },
  { id: 4, name: 'Lembar' },
  { id: 5, name: 'pcs' },
  { id: 6, name: 'dus' },
  { id: 12, name: 'Liter' }
];

const mockProducts = [
  {
    id: 1,
    categoryId: 1,
    categoryName: 'Makanan',
    code: 'MKN001',
    name: 'Indomie Goreng',
    description: 'Mie instan rasa goreng',
    price: 3500,
    stock: 100,
    unit: 'pcs',
    isActive: true
  },
  {
    id: 2,
    categoryId: 1,
    categoryName: 'Makanan',
    code: 'MKN002',
    name: 'Chitato Rasa Sapi Panggang',
    description: 'Keripik kentang rasa sapi panggang',
    price: 12000,
    stock: 50,
    unit: 'pcs',
    isActive: true
  },
  {
    id: 3,
    categoryId: 2,
    categoryName: 'Minuman',
    code: 'MNM001',
    name: 'Aqua 600ml',
    description: 'Air mineral dalam kemasan',
    price: 4000,
    stock: 200,
    unit: 'botol',
    isActive: true
  },
  {
    id: 4,
    categoryId: 2,
    categoryName: 'Minuman',
    code: 'MNM002',
    name: 'Teh Botol Sosro',
    description: 'Teh dalam kemasan botol',
    price: 5000,
    stock: 150,
    unit: 'botol',
    isActive: true
  },
  {
    id: 5,
    categoryId: 4,
    categoryName: 'Alat Tulis',
    code: 'ATK001',
    name: 'Pulpen Standard AE7',
    description: 'Pulpen warna hitam',
    price: 2500,
    stock: 75,
    unit: 'pcs',
    isActive: true
  }
];

let mockTransactions = [];
let transactionIdCounter = 1;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockElectronAPI = {
  // Auth
  login: async (username, password) => {
    await delay(500);
    const user = mockUsers.find(u => u.username === username && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        message: 'Login berhasil',
        data: userWithoutPassword
      };
    }
    return {
      success: false,
      message: 'Username atau password salah'
    };
  },

  getUserById: async (userId) => {
    await delay(200);
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, data: userWithoutPassword };
    }
    return { success: false, message: 'User tidak ditemukan' };
  },

  // Products
  getAllProducts: async (filters = {}) => {
    await delay(300);
    let filtered = [...mockProducts];
    
    if (filters.search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.code.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.categoryId) {
      filtered = filtered.filter(p => p.categoryId === filters.categoryId);
    }
    
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(p => p.isActive === filters.isActive);
    }

    if (filters.transactionType) {
      filtered = filtered.filter(p => (p.transactionType || 'INCOME') === filters.transactionType);
    }
    
    return { success: true, data: filtered };
  },

  getProductById: async (id) => {
    await delay(200);
    const product = mockProducts.find(p => p.id === id);
    if (product) {
      return { success: true, data: product };
    }
    return { success: false, message: 'Produk tidak ditemukan' };
  },

  getAllUnits: async () => {
    await delay(150);
    return { success: true, data: mockUnits };
  },

  createProduct: async (data) => {
    await delay(300);
    const newProduct = {
      id: mockProducts.length + 1,
      ...data,
      categoryName: mockCategories.find(c => c.id === data.categoryId)?.name || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockProducts.push(newProduct);
    return { success: true, message: 'Produk berhasil ditambahkan', data: newProduct };
  },

  updateProduct: async (id, data) => {
    await delay(300);
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index] = { ...mockProducts[index], ...data, updatedAt: new Date().toISOString() };
      return { success: true, message: 'Produk berhasil diupdate', data: mockProducts[index] };
    }
    return { success: false, message: 'Produk tidak ditemukan' };
  },

  deleteProduct: async (id) => {
    await delay(300);
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index].isActive = false;
      return { success: true, message: 'Produk berhasil dihapus' };
    }
    return { success: false, message: 'Produk tidak ditemukan' };
  },

  updateStock: async (id, quantity) => {
    await delay(200);
    const product = mockProducts.find(p => p.id === id);
    if (product) {
      product.stock += quantity;
      return { success: true, message: 'Stok berhasil diupdate', data: product };
    }
    return { success: false, message: 'Produk tidak ditemukan' };
  },

  // Categories
  getAllCategories: async (activeOnly = false) => {
    await delay(200);
    const filtered = activeOnly ? mockCategories.filter(c => c.isActive) : mockCategories;
    return { success: true, data: filtered };
  },

  getCategoryById: async (id) => {
    await delay(200);
    const category = mockCategories.find(c => c.id === id);
    if (category) {
      return { success: true, data: category };
    }
    return { success: false, message: 'Kategori tidak ditemukan' };
  },

  createCategory: async (data) => {
    await delay(300);
    const newCategory = {
      id: mockCategories.length + 1,
      ...data,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockCategories.push(newCategory);
    return { success: true, message: 'Kategori berhasil ditambahkan', data: newCategory };
  },

  updateCategory: async (id, data) => {
    await delay(300);
    const index = mockCategories.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCategories[index] = { ...mockCategories[index], ...data, updatedAt: new Date().toISOString() };
      return { success: true, message: 'Kategori berhasil diupdate', data: mockCategories[index] };
    }
    return { success: false, message: 'Kategori tidak ditemukan' };
  },

  deleteCategory: async (id) => {
    await delay(300);
    const index = mockCategories.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCategories[index].isActive = false;
      return { success: true, message: 'Kategori berhasil dihapus' };
    }
    return { success: false, message: 'Kategori tidak ditemukan' };
  },

  // Transactions
  createTransaction: async (data) => {
    await delay(500);
    const now = new Date();
    const invoiceNumber = `INV/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}/${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const transaction = {
      id: transactionIdCounter++,
      invoiceNumber,
      userId: data.userId,
      userName: mockUsers.find(u => u.id === data.userId)?.fullName || '',
      totalAmount: data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      paymentAmount: data.paymentAmount,
      changeAmount: data.paymentAmount - data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      transactionDate: now.toISOString(),
      createdAt: now.toISOString(),
      items: data.items.map(item => {
        const product = mockProducts.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || '',
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    };
    
    // Update stock
    data.items.forEach(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    });
    
    mockTransactions.push(transaction);
    return { success: true, message: 'Transaksi berhasil', data: transaction };
  },

  getAllTransactions: async (filters = {}) => {
    await delay(300);
    return { success: true, data: mockTransactions };
  },

  getTransactionById: async (id) => {
    await delay(200);
    const transaction = mockTransactions.find(t => t.id === id);
    if (transaction) {
      return { success: true, data: transaction };
    }
    return { success: false, message: 'Transaksi tidak ditemukan' };
  },

  getDashboardStats: async (startDate, endDate) => {
    await delay(300);
    const filtered = mockTransactions.filter(t => {
      const date = new Date(t.transactionDate);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
    
    const totalSales = filtered.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransactions = filtered.length;
    
    // Calculate top products
    const productSales = {};
    filtered.forEach(t => {
      t.items.forEach(item => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { totalQuantity: 0, totalRevenue: 0 };
        }
        productSales[item.productName].totalQuantity += item.quantity;
        productSales[item.productName].totalRevenue += item.subtotal;
      });
    });
    
    const topProducts = Object.entries(productSales)
      .map(([productName, stats]) => ({ productName, ...stats }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);
    
    return {
      success: true,
      data: {
        totalSales,
        totalTransactions,
        topProducts
      }
    };
  },

  // Database
  initializeDatabase: async () => {
    await delay(500);
    return { success: true, message: 'Database initialized (mock)' };
  },

  seedDatabase: async () => {
    await delay(500);
    return { success: true, message: 'Database seeded (mock)' };
  }
};

// Check if running in Electron or browser
export const getElectronAPI = () => {
  if (window.electronAPI) {
    console.log('✅ Using real Electron API');
    return window.electronAPI;
  } else {
    console.log('⚠️ Electron not available, using mock API for browser development');
    return mockElectronAPI;
  }
};
