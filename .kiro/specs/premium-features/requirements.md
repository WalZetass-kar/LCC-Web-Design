# Premium Features Suite - Requirements

## Overview
Implementasi 3 fitur premium untuk meningkatkan nilai jual POS:
1. Payment Gateway Integration (Midtrans, QRIS, E-wallet)
2. Cloud Backup & Sync (Multi-device support)
3. Mobile App (Owner Dashboard)

---

## Feature 1: Payment Gateway Integration

### Business Requirements
- Support multiple payment methods (Cash, Card, E-wallet, QRIS)
- Integration dengan Midtrans payment gateway
- Auto reconciliation
- Split payment support
- Refund management

### Technical Requirements
- Midtrans Snap API integration
- QRIS payment support
- E-wallet (GoPay, OVO, Dana, ShopeePay)
- Payment webhook handling
- Transaction status tracking
- Payment settlement report

### Database Schema
```sql
-- Payment methods table
CREATE TABLE mediasoft_payment_method (
    kd_payment_method TEXT PRIMARY KEY,
    nama_method TEXT NOT NULL,
    jenis TEXT NOT NULL, -- CASH, CARD, EWALLET, QRIS, TRANSFER
    status TEXT DEFAULT 'Aktif',
    icon TEXT,
    fee_persen REAL DEFAULT 0,
    fee_fixed REAL DEFAULT 0
);

-- Payment transactions table
CREATE TABLE mediasoft_payment_transaction (
    kd_payment_transaction TEXT PRIMARY KEY,
    kd_transaksi_jual TEXT NOT NULL,
    kd_payment_method TEXT NOT NULL,
    jumlah REAL NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, EXPIRED
    midtrans_order_id TEXT,
    midtrans_transaction_id TEXT,
    payment_type TEXT,
    va_number TEXT,
    qr_code TEXT,
    deeplink TEXT,
    expired_at TEXT,
    paid_at TEXT,
    settlement_time TEXT,
    tgl_dibuat TEXT NOT NULL,
    FOREIGN KEY (kd_transaksi_jual) REFERENCES mediasoft_penjualan(kd_tansaksi_jual),
    FOREIGN KEY (kd_payment_method) REFERENCES mediasoft_payment_method(kd_payment_method)
);

-- Payment settlement table
CREATE TABLE mediasoft_payment_settlement (
    kd_settlement INTEGER PRIMARY KEY AUTOINCREMENT,
    tgl_settlement TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    total_transaksi INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    total_fee REAL DEFAULT 0,
    net_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    settlement_file TEXT
);
```

### API Endpoints (IPC)
- `payment:get-methods` - Get all payment methods
- `payment:create-transaction` - Create payment transaction
- `payment:check-status` - Check payment status
- `payment:handle-webhook` - Handle Midtrans webhook
- `payment:get-qr-code` - Get QRIS QR code
- `payment:cancel-transaction` - Cancel payment
- `payment:refund` - Process refund
- `payment:get-settlement` - Get settlement report

### UI Components
- PaymentMethodSelector
- QRISPayment
- EwalletPayment
- CardPayment
- SplitPaymentModal
- PaymentStatusModal
- PaymentSettlementReport

---

## Feature 2: Cloud Backup & Sync

### Business Requirements
- Auto backup to cloud storage
- Multi-device sync
- Backup encryption
- Point-in-time restore
- Backup retention policy
- Disaster recovery

### Technical Requirements
- AWS S3 or Google Cloud Storage integration
- AES-256 encryption for backups
- Incremental backup support
- Backup compression
- Sync conflict resolution
- Offline queue for sync

### Database Schema
```sql
-- Cloud backup table
CREATE TABLE mediasoft_cloud_backup (
    kd_cloud_backup TEXT PRIMARY KEY,
    nama_file TEXT NOT NULL,
    ukuran INTEGER,
    cloud_path TEXT,
    cloud_provider TEXT, -- S3, GCS, AZURE
    encrypted INTEGER DEFAULT 1,
    compression TEXT DEFAULT 'gzip',
    backup_type TEXT, -- FULL, INCREMENTAL
    tgl_backup TEXT NOT NULL,
    tgl_uploaded TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, UPLOADING, COMPLETED, FAILED
    username TEXT,
    device_id TEXT,
    checksum TEXT,
    keterangan TEXT
);

-- Sync log table
CREATE TABLE mediasoft_sync_log (
    kd_sync_log INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    device_name TEXT,
    sync_type TEXT, -- PUSH, PULL, FULL
    table_name TEXT,
    records_synced INTEGER DEFAULT 0,
    tgl_sync TEXT NOT NULL,
    status TEXT DEFAULT 'SUCCESS',
    error_message TEXT
);

-- Sync queue table (for offline support)
CREATE TABLE mediasoft_sync_queue (
    kd_sync_queue INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    record_id TEXT NOT NULL,
    data TEXT, -- JSON data
    tgl_created TEXT NOT NULL,
    tgl_synced TEXT,
    status TEXT DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0
);

-- Device registry
CREATE TABLE mediasoft_device (
    device_id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_type TEXT, -- DESKTOP, MOBILE, TABLET
    os TEXT,
    app_version TEXT,
    last_sync TEXT,
    status TEXT DEFAULT 'Aktif',
    tgl_registered TEXT NOT NULL
);
```

### API Endpoints (IPC)
- `cloud:configure` - Configure cloud storage
- `cloud:backup-now` - Trigger manual backup
- `cloud:restore` - Restore from cloud backup
- `cloud:list-backups` - List all cloud backups
- `cloud:download-backup` - Download backup file
- `cloud:delete-backup` - Delete cloud backup
- `sync:push` - Push local changes to cloud
- `sync:pull` - Pull cloud changes to local
- `sync:full-sync` - Full synchronization
- `sync:get-status` - Get sync status
- `sync:resolve-conflict` - Resolve sync conflict

### Services
- CloudStorageService (S3/GCS abstraction)
- BackupService (backup/restore logic)
- SyncService (sync orchestration)
- EncryptionService (backup encryption)
- ConflictResolver (handle sync conflicts)

### UI Components
- CloudBackupSettings
- BackupScheduler
- BackupHistory
- RestoreModal
- SyncStatusIndicator
- DeviceManager
- ConflictResolutionModal

---

## Feature 3: Mobile App (Owner Dashboard)

### Business Requirements
- Owner can monitor sales from mobile
- Real-time dashboard
- View reports
- Approve transactions
- Receive notifications
- Multi-store support

### Technical Requirements
- React Native (iOS & Android)
- Real-time sync with desktop app
- Push notifications
- Offline support
- Biometric authentication
- Dark mode support

### Tech Stack
```json
{
  "framework": "React Native",
  "navigation": "React Navigation",
  "state": "Zustand",
  "api": "Axios",
  "charts": "Victory Native",
  "notifications": "React Native Firebase",
  "auth": "React Native Biometrics",
  "storage": "AsyncStorage + SQLite"
}
```

### Mobile App Features

#### 1. Authentication
- Login with username/password
- Biometric login (fingerprint/face)
- Remember device
- Auto logout

#### 2. Dashboard
- Today's sales summary
- Sales chart (7 days)
- Top products
- Low stock alerts
- Recent transactions
- Quick stats

#### 3. Reports
- Sales report
- Profit report
- Stock report
- Customer report
- Date range filter
- Export to PDF

#### 4. Transactions
- View all transactions
- Transaction details
- Search & filter
- Refund approval

#### 5. Products
- View all products
- Product details
- Stock check
- Low stock alerts

#### 6. Notifications
- Real-time notifications
- Push notifications
- Low stock alerts
- High value transactions
- System alerts

#### 7. Settings
- Profile
- Change password
- Notification settings
- Theme settings
- Logout

### API Requirements
- RESTful API or GraphQL
- WebSocket for real-time updates
- JWT authentication
- API rate limiting
- API documentation

### Mobile App Structure
```
mobile-app/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── BiometricScreen.tsx
│   │   ├── Dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── Reports/
│   │   │   ├── SalesReportScreen.tsx
│   │   │   ├── ProfitReportScreen.tsx
│   │   │   └── StockReportScreen.tsx
│   │   ├── Transactions/
│   │   │   ├── TransactionListScreen.tsx
│   │   │   └── TransactionDetailScreen.tsx
│   │   ├── Products/
│   │   │   ├── ProductListScreen.tsx
│   │   │   └── ProductDetailScreen.tsx
│   │   ├── Notifications/
│   │   │   └── NotificationScreen.tsx
│   │   └── Settings/
│   │       └── SettingsScreen.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── charts/
│   │   └── cards/
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── storage.ts
│   │   └── notifications.ts
│   ├── store/
│   │   └── useStore.ts
│   ├── utils/
│   └── types/
├── android/
├── ios/
├── package.json
└── tsconfig.json
```

---

## Implementation Plan

### Phase 1: Payment Gateway (Week 1-2)
1. Setup Midtrans account & API keys
2. Create database schema
3. Implement backend services
4. Create payment UI components
5. Test payment flow
6. Implement webhook handler
7. Create settlement report

### Phase 2: Cloud Backup & Sync (Week 3-4)
1. Setup AWS S3 or Google Cloud Storage
2. Create database schema
3. Implement backup service
4. Implement sync service
5. Create encryption service
6. Build UI for backup settings
7. Test backup & restore
8. Test multi-device sync

### Phase 3: Mobile App (Week 5-8)
1. Setup React Native project
2. Create navigation structure
3. Implement authentication
4. Build dashboard screen
5. Build reports screens
6. Build transaction screens
7. Implement push notifications
8. Setup API server
9. Test on iOS & Android
10. Deploy to App Store & Play Store

---

## Dependencies

### NPM Packages
```json
{
  "midtrans-client": "^1.3.1",
  "aws-sdk": "^2.1400.0",
  "@google-cloud/storage": "^6.10.0",
  "express": "^4.18.2",
  "socket.io": "^4.6.1",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "compression": "^1.7.4",
  "archiver": "^5.3.1"
}
```

### React Native Packages
```json
{
  "react-native": "^0.72.0",
  "@react-navigation/native": "^6.1.6",
  "@react-navigation/stack": "^6.3.16",
  "zustand": "^4.3.8",
  "axios": "^1.4.0",
  "victory-native": "^36.6.8",
  "@react-native-firebase/app": "^18.0.0",
  "@react-native-firebase/messaging": "^18.0.0",
  "react-native-biometrics": "^3.0.1",
  "@react-native-async-storage/async-storage": "^1.18.1",
  "react-native-sqlite-storage": "^6.0.1"
}
```

---

## Configuration Files

### Midtrans Config
```typescript
// src/config/midtrans.ts
export const midtransConfig = {
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
  merchantId: process.env.MIDTRANS_MERCHANT_ID,
}
```

### Cloud Storage Config
```typescript
// src/config/cloud.ts
export const cloudConfig = {
  provider: 'S3', // or 'GCS'
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET_NAME,
  },
  gcs: {
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEY_FILE,
    bucket: process.env.GCS_BUCKET_NAME,
  },
}
```

### API Server Config
```typescript
// src/config/api.ts
export const apiConfig = {
  port: process.env.API_PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: '7d',
  corsOrigin: '*',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
}
```

---

## Environment Variables

Create `.env` file:
```env
# Midtrans
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_MERCHANT_ID=your_merchant_id
MIDTRANS_IS_PRODUCTION=false

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1
AWS_BUCKET_NAME=mediasoft-pos-backups

# Google Cloud Storage (alternative)
GCS_PROJECT_ID=your_project_id
GCS_KEY_FILE=./gcs-key.json
GCS_BUCKET_NAME=mediasoft-pos-backups

# API Server
API_PORT=3000
JWT_SECRET=your_jwt_secret_key_here
API_BASE_URL=http://localhost:3000

# Firebase (for mobile push notifications)
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY=your_firebase_key
FIREBASE_CLIENT_EMAIL=your_firebase_email

# Encryption
BACKUP_ENCRYPTION_KEY=your_32_char_encryption_key
```

---

## Testing Checklist

### Payment Gateway
- [ ] Cash payment
- [ ] Card payment
- [ ] QRIS payment
- [ ] E-wallet payment (GoPay, OVO, Dana)
- [ ] Split payment
- [ ] Payment cancellation
- [ ] Refund process
- [ ] Webhook handling
- [ ] Settlement report

### Cloud Backup & Sync
- [ ] Manual backup
- [ ] Auto backup
- [ ] Backup encryption
- [ ] Backup compression
- [ ] Restore from backup
- [ ] Multi-device sync
- [ ] Conflict resolution
- [ ] Offline queue
- [ ] Backup retention

### Mobile App
- [ ] Login
- [ ] Biometric auth
- [ ] Dashboard display
- [ ] Sales report
- [ ] Transaction list
- [ ] Product list
- [ ] Push notifications
- [ ] Offline mode
- [ ] Dark mode
- [ ] iOS build
- [ ] Android build

---

## Success Criteria

### Payment Gateway
- ✅ Support 5+ payment methods
- ✅ Payment success rate > 95%
- ✅ Webhook response time < 2s
- ✅ Settlement report accuracy 100%

### Cloud Backup & Sync
- ✅ Backup success rate > 99%
- ✅ Sync latency < 5s
- ✅ Zero data loss
- ✅ Support 10+ devices

### Mobile App
- ✅ App load time < 3s
- ✅ Real-time sync < 2s
- ✅ Push notification delivery > 95%
- ✅ App crash rate < 1%
- ✅ 4.5+ star rating

---

## Documentation

- [ ] Payment Gateway Integration Guide
- [ ] Cloud Backup Setup Guide
- [ ] Mobile App User Guide
- [ ] API Documentation
- [ ] Deployment Guide
- [ ] Troubleshooting Guide

---

## Budget Estimate

### Development Cost
- Payment Gateway: 2 weeks × Rp 5jt/week = Rp 10jt
- Cloud Backup: 2 weeks × Rp 5jt/week = Rp 10jt
- Mobile App: 4 weeks × Rp 5jt/week = Rp 20jt
- **Total Development: Rp 40jt**

### Operational Cost (Monthly)
- Midtrans: 2.9% per transaction
- AWS S3: ~Rp 100k/month (100GB storage)
- API Server: ~Rp 500k/month (VPS)
- Firebase: Free tier (< 10k users)
- **Total Monthly: ~Rp 600k + transaction fees**

### Revenue Potential
- Subscription: Rp 300k-500k/month per user
- Transaction fee: 0.5-1% per transaction
- Setup fee: Rp 2-5jt one-time

---

**Status:** Ready for Implementation
**Priority:** HIGH
**Estimated Timeline:** 8 weeks
**Team Size:** 2-3 developers
