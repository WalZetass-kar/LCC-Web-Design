const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
  login: (username, password) => invoke('auth:login', username, password),
  getUserById: (userId) => invoke('auth:getUserById', userId),
  getAllProducts: (filters) => invoke('products:getAll', filters),
  getProductById: (id) => invoke('products:getById', id),
  getAllUnits: () => invoke('products:getUnits'),
  createProduct: (data) => invoke('products:create', data),
  updateProduct: (id, data) => invoke('products:update', id, data),
  deleteProduct: (id) => invoke('products:delete', id),
  updateStock: (id, quantity) => invoke('products:updateStock', id, quantity),
  getAllCategories: (activeOnly) => invoke('categories:getAll', activeOnly),
  getCategoryById: (id) => invoke('categories:getById', id),
  createCategory: (data) => invoke('categories:create', data),
  updateCategory: (id, data) => invoke('categories:update', id, data),
  deleteCategory: (id) => invoke('categories:delete', id),
  createTransaction: (data) => invoke('transactions:create', data),
  getAllTransactions: (filters) => invoke('transactions:getAll', filters),
  getTransactionById: (id) => invoke('transactions:getById', id),
  getDashboardStats: (startDate, endDate) => invoke('transactions:getDashboardStats', startDate, endDate),
  initializeDatabase: () => invoke('database:initialize'),
  seedDatabase: () => invoke('database:seed')
});
