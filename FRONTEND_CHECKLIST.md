# ✅ Frontend Implementation Checklist

## 📋 Halaman yang Perlu Dibuat

### 1. **Customer Management** (`/customer`)

#### Components:
- [ ] `Customer.tsx` - Main page
- [ ] `CustomerTable.tsx` - DataTable component
- [ ] `CustomerModal.tsx` - Add/Edit modal
- [ ] `CustomerDetailModal.tsx` - Detail modal

#### Features:
- [ ] List all customers dengan pagination
- [ ] Search customer
- [ ] Filter by status (Aktif/Nonaktif)
- [ ] Add new customer
- [ ] Edit customer
- [ ] Delete customer
- [ ] Toggle status
- [ ] Display loyalty poin
- [ ] Display total belanja
- [ ] Birthday indicator

#### API Integration:
```typescript
// Get all customers
const { data } = await api('customer:getAll')

// Search customer
const { data } = await api('customer:search', query)

// Create customer
await api('customer:create', customerData)

// Update customer
await api('customer:update', kd_customer, customerData)

// Delete customer
await api('customer:delete', kd_customer)

// Toggle status
await api('customer:toggleStatus', kd_customer)
```

---

### 2. **Kas Management** (`/kas`)

#### Components:
- [ ] `Kas.tsx` - Main page
- [ ] `BukaKasModal.tsx` - Buka kas modal
- [ ] `TutupKasModal.tsx` - Tutup kas modal
- [ ] `PengeluaranModal.tsx` - Tambah pengeluaran modal
- [ ] `KasTransaksiTable.tsx` - Transaksi table

#### Features:
- [ ] Check active kas
- [ ] Buka kas baru (jika belum ada active)
- [ ] Display kas info (modal awal, total penjualan, pengeluaran)
- [ ] List transaksi kas
- [ ] Add pengeluaran
- [ ] Tutup kas dengan rekonsiliasi
- [ ] Display selisih kas
- [ ] Riwayat kas

#### API Integration:
```typescript
// Get active kas
const { data } = await api('kas:getActiveKas', username)

// Buka kas
await api('kas:bukaKas', username, modal_awal, catatan)

// Add pengeluaran
await api('kas:addPengeluaran', kd_kas, jumlah, keterangan, username)

// Tutup kas
await api('kas:tutupKas', kd_kas, saldo_akhir_fisik, catatan)

// Get transaksi
const { data } = await api('kas:getTransaksi', kd_kas)
```

---

### 3. **Pembelian/Purchase Order** (`/pembelian`)

#### Components:
- [ ] `Pembelian.tsx` - Main page (list)
- [ ] `PembelianCreate.tsx` - Create PO page
- [ ] `PembelianDetailModal.tsx` - Detail modal
- [ ] `PembelianItemTable.tsx` - Items table
- [ ] `UpdateStatusModal.tsx` - Update payment status

#### Features:
- [ ] List all pembelian
- [ ] Filter by status (LUNAS/HUTANG)
- [ ] Filter by date range
- [ ] Create new PO
  - Select supplier
  - Add multiple items
  - Set qty & harga beli
  - Calculate total
  - Set pembayaran
- [ ] View detail pembelian
- [ ] Update status pembayaran
- [ ] Delete pembelian
- [ ] Print PO

#### API Integration:
```typescript
// Get all pembelian
const { data } = await api('pembelian:getAll')

// Get detail
const { data } = await api('pembelian:getById', kd_pembelian)

// Create PO
await api('pembelian:create', {
  kd_suplier,
  username,
  catatan,
  items: [{ kd_barang, qty, harga_beli }],
  yang_dibayar
})

// Update status
await api('pembelian:updateStatus', kd_pembelian, yang_dibayar)

// Delete
await api('pembelian:delete', kd_pembelian)
```

---

### 4. **Notifikasi System**

#### Components:
- [ ] `NotificationBell.tsx` - Bell icon dengan badge (di Topbar)
- [ ] `NotificationDropdown.tsx` - Dropdown notifikasi
- [ ] `Notifikasi.tsx` - Full page notifikasi (`/notifikasi`)
- [ ] `NotificationItem.tsx` - Single notification item

#### Features:
- [ ] Bell icon di topbar
- [ ] Badge unread count
- [ ] Dropdown dengan 5 notifikasi terbaru
- [ ] Mark as read on click
- [ ] Link to full page
- [ ] Full page dengan all notifications
- [ ] Filter by type (STOK, EXPIRED, SYSTEM, INFO)
- [ ] Mark all as read
- [ ] Delete notification
- [ ] Auto refresh every 30 seconds

#### API Integration:
```typescript
// Get unread count
const { data } = await api('notifikasi:getUnreadCount', username)

// Get unread
const { data } = await api('notifikasi:getUnread', username)

// Get all
const { data } = await api('notifikasi:getAll', username)

// Mark as read
await api('notifikasi:markAsRead', kd_notifikasi)

// Mark all as read
await api('notifikasi:markAllAsRead', username)

// Delete
await api('notifikasi:delete', kd_notifikasi)
```

---

### 5. **Backup & Restore** (`/backup`)

#### Components:
- [ ] `Backup.tsx` - Main page
- [ ] `BackupTable.tsx` - Backup history table
- [ ] `BackupModal.tsx` - Create backup modal
- [ ] `RestoreConfirmModal.tsx` - Restore confirmation

#### Features:
- [ ] List backup history
- [ ] Display file size
- [ ] Display backup date
- [ ] Button backup now
- [ ] Button restore (with confirmation)
- [ ] Button download backup file
- [ ] Button delete backup
- [ ] Auto backup indicator

#### API Integration:
```typescript
// Get all backups
const { data } = await api('backup:getAll')

// Create backup
await api('backup:create', username, keterangan)

// Restore
await api('backup:restore', kd_backup)

// Download
const { data } = await api('backup:download', kd_backup)

// Delete
await api('backup:delete', kd_backup)
```

---

### 6. **Laporan** (`/laporan`)

#### Components:
- [ ] `Laporan.tsx` - Main page dengan tabs
- [ ] `LaporanPenjualan.tsx` - Tab penjualan
- [ ] `LaporanLabaRugi.tsx` - Tab laba rugi
- [ ] `LaporanProdukTerlaris.tsx` - Tab produk terlaris
- [ ] `LaporanStok.tsx` - Tab stok
- [ ] `LaporanKas.tsx` - Tab kas
- [ ] `LaporanCustomer.tsx` - Tab customer
- [ ] `DateRangePicker.tsx` - Date range picker
- [ ] `ExportButton.tsx` - Export button (Excel/PDF)
- [ ] `ChartComponent.tsx` - Chart wrapper

#### Features:
- [ ] Tab navigation
- [ ] Date range picker
- [ ] Export to Excel
- [ ] Export to PDF
- [ ] Print laporan
- [ ] Charts dengan Recharts
- [ ] Summary cards
- [ ] Detailed table

#### API Integration:
```typescript
// Laporan Penjualan
const { data } = await api('laporan:penjualan', startDate, endDate)

// Laporan Laba Rugi
const { data } = await api('laporan:labaRugi', startDate, endDate)

// Produk Terlaris
const { data } = await api('laporan:produkTerlaris', startDate, endDate, limit)

// Laporan Stok
const { data } = await api('laporan:stok')

// Laporan Kas
const { data } = await api('laporan:kas', startDate, endDate)

// Laporan Customer
const { data } = await api('laporan:customer')

// Export
await api('export:penjualanExcel', startDate, endDate)
await api('export:penjualanPDF', startDate, endDate)
await api('export:stokExcel')
await api('export:stokPDF')
```

---

### 7. **Activity Log** (`/activity-log`)

#### Components:
- [ ] `ActivityLog.tsx` - Main page (Admin only)
- [ ] `ActivityLogTable.tsx` - Log table
- [ ] `ActivityLogFilter.tsx` - Filter component

#### Features:
- [ ] List all activity logs
- [ ] Filter by username
- [ ] Filter by modul
- [ ] Filter by date range
- [ ] Search log
- [ ] Pagination
- [ ] Export log
- [ ] Delete old logs (Admin only)

#### API Integration:
```typescript
// Get all logs
const { data } = await api('activityLog:getAll')

// Get by username
const { data } = await api('activityLog:getByUsername', username)

// Get by modul
const { data } = await api('activityLog:getByModul', modul)

// Search
const { data } = await api('activityLog:search', filters)

// Delete
await api('activityLog:delete', kd_log)

// Delete old logs
await api('activityLog:deleteOldLogs', days)
```

---

## 🎨 UI Components yang Perlu Dibuat

### Reusable Components:

- [ ] `DateRangePicker.tsx` - Date range picker
- [ ] `ExportButton.tsx` - Export button dengan dropdown (Excel/PDF)
- [ ] `StatusBadge.tsx` - Status badge (Aktif/Nonaktif, Lunas/Hutang)
- [ ] `EmptyState.tsx` - Empty state component
- [ ] `LoadingSpinner.tsx` - Loading spinner
- [ ] `ConfirmDialog.tsx` - Confirmation dialog
- [ ] `SearchInput.tsx` - Search input dengan debounce
- [ ] `FilterDropdown.tsx` - Filter dropdown
- [ ] `Pagination.tsx` - Pagination component
- [ ] `StatCard.tsx` - Statistic card
- [ ] `ChartCard.tsx` - Chart card wrapper

---

## 🔧 Utils yang Perlu Dibuat

### Frontend Utils:

- [x] `validation.ts` - Validation helpers ✅
- [ ] `dateHelper.ts` - Date formatting & manipulation
- [ ] `numberHelper.ts` - Number formatting (currency, etc)
- [ ] `exportHelper.ts` - Export helpers
- [ ] `storageHelper.ts` - LocalStorage helpers
- [ ] `debounce.ts` - Debounce function

---

## 🎯 Integration Checklist

### Per Halaman:

#### Customer:
- [ ] Integrate all API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add toast notifications
- [ ] Add confirmation dialogs
- [ ] Add form validation
- [ ] Test CRUD operations

#### Kas:
- [ ] Integrate all API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add toast notifications
- [ ] Add confirmation dialogs
- [ ] Add form validation
- [ ] Test buka/tutup kas flow

#### Pembelian:
- [ ] Integrate all API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add toast notifications
- [ ] Add confirmation dialogs
- [ ] Add form validation
- [ ] Test create PO flow

#### Notifikasi:
- [ ] Integrate all API calls
- [ ] Add auto refresh
- [ ] Add real-time updates
- [ ] Add badge count
- [ ] Test mark as read
- [ ] Test delete

#### Backup:
- [ ] Integrate all API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add confirmation dialogs
- [ ] Test backup/restore flow

#### Laporan:
- [ ] Integrate all API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add charts
- [ ] Test export Excel
- [ ] Test export PDF

#### Activity Log:
- [ ] Integrate all API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add filters
- [ ] Test search

---

## 📊 Progress Tracking

### Backend: ✅ 100% Complete
- [x] Controllers (13 files)
- [x] Models (11 files)
- [x] Services (4 files)
- [x] IPC Handlers (100+ handlers)

### Frontend: 🔄 0% Complete
- [ ] Pages (7 pages)
- [ ] Components (30+ components)
- [ ] Utils (6 files)
- [ ] Integration (7 modules)

---

## 🚀 Recommended Implementation Order

### Phase 1 - Critical (Week 1):
1. **Notifikasi System** - Penting untuk UX
2. **Customer Management** - Sering digunakan
3. **Kas Management** - Daily operations

### Phase 2 - High Priority (Week 2):
4. **Pembelian/PO** - Inventory management
5. **Backup & Restore** - Data safety
6. **Activity Log** - Audit trail

### Phase 3 - Enhancement (Week 3):
7. **Laporan** - Business intelligence
8. **Export Features** - Reporting
9. **Charts & Visualizations** - Analytics

### Phase 4 - Polish (Week 4):
10. **UI/UX Improvements**
11. **Testing**
12. **Bug Fixes**
13. **Documentation**

---

## 📝 Notes

- Semua backend sudah siap, tinggal integrate ke frontend
- Gunakan existing components (Button, Modal, Input, DataTable) sebagai base
- Follow existing code style & patterns
- Add proper TypeScript types
- Add proper error handling
- Add loading states
- Add toast notifications
- Test setiap fitur sebelum move to next

---

**Backend: 100% ✅**
**Frontend: Ready to implement 🚀**
