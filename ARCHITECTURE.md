# Architecture Documentation - MediaSoft POS WalDevelop

Dokumentasi lengkap arsitektur aplikasi Point of Sale.

## 🏗️ Arsitektur Aplikasi

### Overview

MediaSoft POS menggunakan arsitektur **MVC (Model-View-Controller)** dengan **OOP (Object-Oriented Programming)** dan **IPC (Inter-Process Communication)** untuk komunikasi antara Electron dan React.

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    IPC HANDLERS                         │ │
│  │  - AuthHandler                                          │ │
│  │  - ProductHandler                                       │ │
│  │  - CategoryHandler                                      │ │
│  │  - TransactionHandler                                   │ │
│  │  - DatabaseHandler                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   CONTROLLERS (OOP)                     │ │
│  │  - AuthController (static methods)                      │ │
│  │  - ProductController (static methods)                   │ │
│  │  - CategoryController (static methods)                  │ │
│  │  - TransactionController (static methods)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  DATABASE LAYER                         │ │
│  │  - Drizzle ORM                                          │ │
│  │  - Better-SQLite3                                       │ │
│  │  - Schema Definitions                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                  ELECTRON RENDERER PROCESS                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    REACT APP (VIEW)                     │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              PAGES (Views)                        │  │ │
│  │  │  - LoginPage                                      │  │ │
│  │  │  - DashboardPage                                  │  │ │
│  │  │  - ProductsPage                                   │  │ │
│  │  │  - TransactionPage                                │  │ │
│  │  │  - HistoryPage                                    │  │ │
│  │  │  - SettingsPage                                   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │         COMPONENTS (Reusable UI)                  │  │ │
│  │  │  - Button, Input, Select, Modal, Card, Table     │  │ │
│  │  │  - Sidebar, Topbar, MainLayout                   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              CONTEXT (State)                      │  │ │
│  │  │  - AuthContext (User state)                       │  │ │
│  │  │  - ThemeContext (Theme state)                     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📊 MVC Pattern Implementation

### Model (backend/models/)

**Responsibility:** Representasi struktur data dan schema database

```javascript
// schema.js - Drizzle ORM Schema
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  // ... other fields
});
```

**Karakteristik:**
- Menggunakan Drizzle ORM untuk type-safe queries
- Definisi relasi antar tabel
- Validasi data di level database

### Controller (backend/controllers/)

**Responsibility:** Business logic dan data processing

```javascript
// ProductController.js - OOP dengan static methods
class ProductController {
  static async getAllProducts(filters = {}) {
    const db = DatabaseConnection.getInstance();
    // Business logic here
    return { success: true, data: products };
  }
  
  static async createProduct(productData) {
    // Validation & creation logic
  }
}
```

**Karakteristik:**
- OOP dengan static methods (tidak perlu instantiate)
- Semua business logic ada di controller
- Return format konsisten: `{ success, message?, data? }`
- Error handling yang proper

### View (src/pages/ & src/components/)

**Responsibility:** User Interface dan User Experience

```jsx
// TransactionPage.jsx - React Component
const TransactionPage = () => {
  const [cart, setCart] = useState([]);
  
  const handleCheckout = async () => {
    const result = await window.electronAPI.createTransaction(data);
    // Handle response
  };
  
  return <div>...</div>;
};
```

**Karakteristik:**
- React functional components dengan hooks
- Komunikasi dengan backend via IPC
- State management dengan Context API
- Reusable components

## 🔌 IPC Communication Flow

### Request Flow

```
1. User Action (Click button)
   ↓
2. React Component (TransactionPage.jsx)
   ↓
3. window.electronAPI.createTransaction(data)
   ↓
4. Preload Script (main/preload.js)
   ↓
5. IPC Renderer → IPC Main
   ↓
6. IPC Handler (TransactionHandler.js)
   ↓
7. Controller (TransactionController.js)
   ↓
8. Database (Drizzle ORM + SQLite)
   ↓
9. Response back through same path
```

### Implementation

**1. Preload Script (Context Bridge)**
```javascript
// main/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  createTransaction: (data) => 
    ipcRenderer.invoke('transactions:create', data)
});
```

**2. IPC Handler**
```javascript
// main/ipc/TransactionHandler.js
ipcMain.handle('transactions:create', async (event, data) => {
  return await TransactionController.createTransaction(data);
});
```

**3. React Component**
```javascript
// src/pages/TransactionPage.jsx
const result = await window.electronAPI.createTransaction(data);
```

## 🗄️ Database Architecture

### Connection Management

```javascript
// Singleton Pattern
class DatabaseConnection {
  static instance = null;
  
  static getInstance() {
    if (!this.instance) {
      const sqlite = new Database('sistem_pos.db');
      this.db = drizzle(sqlite, { schema });
      this.instance = this;
    }
    return this.db;
  }
}
```

### Schema Relations

```
users (1) ──────────── (N) transactions
                            │
categories (1) ─┐           │
                │           │
                ├─ (N) products (1) ── (N) transaction_details
```

### Query Examples

**Simple Query:**
```javascript
const products = await db
  .select()
  .from(products)
  .where(eq(products.isActive, true));
```

**Join Query:**
```javascript
const productsWithCategory = await db
  .select({
    id: products.id,
    name: products.name,
    categoryName: categories.name
  })
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id));
```

## 🎨 Frontend Architecture

### Component Hierarchy

```
App.jsx
├── ThemeProvider
│   └── AuthProvider
│       └── Router
│           ├── LoginPage
│           └── MainLayout
│               ├── Sidebar
│               ├── Topbar
│               └── Outlet (Pages)
│                   ├── DashboardPage
│                   ├── ProductsPage
│                   ├── TransactionPage
│                   ├── HistoryPage
│                   └── SettingsPage
```

### State Management

**1. Local State (useState)**
- Component-specific state
- Form inputs
- UI state (modals, loading)

**2. Context API**
- Global state (Auth, Theme)
- Shared across components
- Avoid prop drilling

**3. No Redux**
- Aplikasi tidak terlalu kompleks
- Context API sudah cukup
- Lebih simple dan maintainable

### Reusable Components

**UI Components (src/components/ui/)**
- Button - Berbagai variant dan size
- Input - Text, number, dengan validation
- Select - Dropdown dengan options
- Modal - Dialog dengan backdrop
- Card - Container dengan glass effect
- Table - TanStack Table dengan sorting & filtering

**Layout Components (src/components/layout/)**
- MainLayout - Main app layout
- Sidebar - Navigation menu
- Topbar - Header dengan clock & logout

## 🔐 Security Architecture

### Context Isolation

```javascript
// main.js
webPreferences: {
  nodeIntegration: false,      // Disable Node.js in renderer
  contextIsolation: true,      // Enable context isolation
  preload: path.join(__dirname, 'preload.js')
}
```

### Secure IPC

- Hanya expose API yang diperlukan
- Validasi input di controller
- No direct database access from renderer
- Error handling yang proper

### Authentication Flow

```
1. User input credentials
   ↓
2. Send to AuthController.login()
   ↓
3. Validate credentials
   ↓
4. Return user data (without password)
   ↓
5. Store in AuthContext
   ↓
6. Save to localStorage
   ↓
7. Redirect to dashboard
```

## 🎯 Design Patterns

### 1. Singleton Pattern
- DatabaseConnection
- Satu instance untuk seluruh aplikasi

### 2. Factory Pattern
- Component creation
- Dynamic rendering

### 3. Observer Pattern
- React Context
- State updates trigger re-renders

### 4. Strategy Pattern
- Different payment methods
- Theme switching

## 📦 Module Organization

### Backend Modules
```
backend/
├── controllers/     # Business logic (OOP)
├── models/         # Data schema (Drizzle)
└── database/       # DB config & utilities
```

### Frontend Modules
```
src/
├── components/     # Reusable UI
├── pages/         # Application views
├── context/       # Global state
└── utils/         # Helper functions
```

### Electron Modules
```
main/
├── ipc/           # IPC handlers
├── main.js        # Main process
└── preload.js     # Context bridge
```

## 🚀 Performance Optimization

### Database
- Indexed columns (id, code, invoice_number)
- Efficient queries dengan Drizzle ORM
- Connection pooling (singleton)

### Frontend
- Code splitting dengan React Router
- Lazy loading components
- Memoization dengan useMemo/useCallback
- Virtual scrolling untuk large lists

### Electron
- Preload script untuk security
- IPC untuk async communication
- Separate processes (main & renderer)

## 🔄 Data Flow

### Create Transaction Flow

```
1. User adds products to cart (Local State)
2. User clicks checkout
3. Modal opens for payment input
4. User enters payment amount
5. Click "Bayar" button
6. Validate payment amount
7. Call window.electronAPI.createTransaction()
8. IPC → TransactionController.createTransaction()
9. Validate stock availability
10. Create transaction record
11. Create transaction details
12. Update product stock
13. Return success with invoice number
14. Show success message
15. Clear cart
16. Reload products (updated stock)
```

## 📈 Scalability Considerations

### Current Architecture
- Suitable untuk single-user desktop app
- SQLite untuk local database
- No network communication

### Future Enhancements
- Multi-user support dengan server
- PostgreSQL/MySQL untuk production
- REST API atau GraphQL
- Real-time updates dengan WebSocket
- Cloud sync
- Mobile app (React Native)

## 🧪 Testing Strategy

### Unit Tests
- Controller methods
- Utility functions
- Component logic

### Integration Tests
- IPC communication
- Database operations
- API endpoints

### E2E Tests
- User workflows
- Transaction flow
- Authentication

## 📚 Best Practices

### Code Organization
✅ Separation of concerns
✅ Single responsibility principle
✅ DRY (Don't Repeat Yourself)
✅ Clear naming conventions

### Error Handling
✅ Try-catch blocks
✅ Consistent error format
✅ User-friendly messages
✅ Logging untuk debugging

### Security
✅ Context isolation
✅ Input validation
✅ SQL injection prevention (ORM)
✅ XSS prevention (React)

### Performance
✅ Efficient queries
✅ Lazy loading
✅ Code splitting
✅ Memoization

---

**MediaSoft POS WalDevelop**
Architecture designed for scalability, maintainability, and security.
