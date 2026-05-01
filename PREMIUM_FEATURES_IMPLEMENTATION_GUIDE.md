# 🚀 Premium Features Implementation Guide

## Overview
Panduan lengkap implementasi 3 fitur premium:
1. **Payment Gateway** (Midtrans, QRIS, E-wallet)
2. **Cloud Backup & Sync** (AWS S3 / Google Cloud)
3. **Mobile App** (React Native - Owner Dashboard)

**Estimasi Waktu Total:** 8-10 minggu
**Estimasi Biaya Pengembangan:** Rp 40-50 juta
**Potensi Revenue:** Rp 300k-500k/bulan per user

---

## 📦 Files Created

### Configuration
- ✅ `.env.example` - Environment variables template
- ✅ `.kiro/specs/premium-features/.config.kiro` - Spec configuration
- ✅ `.kiro/specs/premium-features/requirements.md` - Detailed requirements

### Payment Gateway
- ✅ `PAYMENT_GATEWAY_SCHEMA.sql` - Database schema
- ✅ `src/backend/services/midtransService.ts` - Midtrans integration service

### Documentation
- ✅ `FITUR_POS_KOMERSIAL.md` - Commercial POS features comparison
- ✅ `PREMIUM_FEATURES_IMPLEMENTATION_GUIDE.md` - This file

---

## 🎯 PHASE 1: Payment Gateway (Week 1-2)

### Step 1: Setup Midtrans Account

1. **Register di Midtrans:**
   - Kunjungi: https://dashboard.midtrans.com/register
   - Pilih account type: Business
   - Lengkapi data bisnis

2. **Get API Keys:**
   - Login ke dashboard
   - Go to: Settings → Access Keys
   - Copy:
     - Server Key
     - Client Key
     - Merchant ID

3. **Configure Environment:**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and fill in your Midtrans keys
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
MIDTRANS_MERCHANT_ID=G123456789
MIDTRANS_IS_PRODUCTION=false
```

### Step 2: Setup Database

```bash
# Run payment gateway schema
sqlite3 sistem_pos.db < PAYMENT_GATEWAY_SCHEMA.sql

# Verify tables created
sqlite3 sistem_pos.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'mediasoft_payment%';"
```

Expected output:
```
mediasoft_payment_method
mediasoft_payment_transaction
mediasoft_payment_settlement
mediasoft_payment_refund
mediasoft_payment_webhook_log
```

### Step 3: Update Types

Add to `src/shared/types.ts`:

```typescript
export interface PaymentMethod {
  kd_payment_method: string
  nama_method: string
  jenis: 'CASH' | 'CARD' | 'EWALLET' | 'QRIS' | 'TRANSFER' | 'CREDIT'
  status: string | null
  icon: string | null
  fee_persen: number | null
  fee_fixed: number | null
  min_amount: number | null
  max_amount: number | null
  deskripsi: string | null
}

export interface PaymentTransaction {
  kd_payment_transaction: string
  kd_transaksi_jual: string
  kd_payment_method: string
  jumlah: number
  fee: number | null
  net_amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'
  midtrans_order_id: string | null
  midtrans_transaction_id: string | null
  payment_type: string | null
  va_number: string | null
  bank: string | null
  qr_code_url: string | null
  deeplink_url: string | null
  expired_at: string | null
  paid_at: string | null
  tgl_dibuat: string
}

export interface PaymentRefund {
  kd_refund: string
  kd_payment_transaction: string
  kd_transaksi_jual: string
  jumlah_refund: number
  alasan: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'COMPLETED' | 'FAILED'
  requested_by: string
  approved_by: string | null
  tgl_request: string
  tgl_approved: string | null
}
```

### Step 4: Create Models

Create `src/backend/models/PaymentModel.ts`:

```typescript
import { db } from '../../database/connection'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export class PaymentModel {
  // Get all payment methods
  static getAllMethods() {
    return db.query.paymentMethod.findMany({
      where: eq(paymentMethod.status, 'Aktif'),
      orderBy: [paymentMethod.jenis, paymentMethod.nama_method],
    })
  }

  // Create payment transaction
  static createTransaction(data: any) {
    return db.insert(paymentTransaction).values(data).run()
  }

  // Get transaction by order ID
  static getByOrderId(orderId: string) {
    return db.query.paymentTransaction.findFirst({
      where: eq(paymentTransaction.midtrans_order_id, orderId),
    })
  }

  // Update transaction status
  static updateStatus(kdPaymentTransaction: string, status: string, data: any = {}) {
    return db.update(paymentTransaction)
      .set({
        status,
        ...data,
        tgl_diupdate: new Date().toISOString(),
      })
      .where(eq(paymentTransaction.kd_payment_transaction, kdPaymentTransaction))
      .run()
  }

  // Get transactions by date range
  static getByDateRange(startDate: string, endDate: string) {
    return db.query.paymentTransaction.findMany({
      where: and(
        gte(paymentTransaction.tgl_dibuat, startDate),
        lte(paymentTransaction.tgl_dibuat, endDate)
      ),
      orderBy: [desc(paymentTransaction.tgl_dibuat)],
    })
  }

  // Create refund request
  static createRefund(data: any) {
    return db.insert(paymentRefund).values(data).run()
  }

  // Log webhook
  static logWebhook(data: any) {
    return db.insert(paymentWebhookLog).values(data).run()
  }
}
```

### Step 5: Create Controller

Create `src/backend/controllers/PaymentController.ts`:

```typescript
import midtransService from '../services/midtransService'
import { PaymentModel } from '../models/PaymentModel'
import { generateId } from '../utils/idGenerator'

export class PaymentController {
  // Get all payment methods
  static async getPaymentMethods() {
    try {
      const methods = PaymentModel.getAllMethods()
      return { success: true, data: methods }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // Create payment transaction
  static async createPayment(data: {
    kdTransaksiJual: string
    paymentMethod: string
    amount: number
    customerDetails: any
    itemDetails: any[]
  }) {
    try {
      const orderId = `ORDER-${Date.now()}`
      const kdPaymentTransaction = generateId('PAY')

      // Create payment transaction record
      PaymentModel.createTransaction({
        kd_payment_transaction: kdPaymentTransaction,
        kd_transaksi_jual: data.kdTransaksiJual,
        kd_payment_method: data.paymentMethod,
        jumlah: data.amount,
        fee: 0,
        net_amount: data.amount,
        status: 'PENDING',
        midtrans_order_id: orderId,
        tgl_dibuat: new Date().toISOString(),
      })

      // If cash, mark as success immediately
      if (data.paymentMethod === 'CASH') {
        PaymentModel.updateStatus(kdPaymentTransaction, 'SUCCESS', {
          paid_at: new Date().toISOString(),
        })
        return {
          success: true,
          data: {
            paymentMethod: 'CASH',
            status: 'SUCCESS',
          },
        }
      }

      // For digital payments, create Midtrans transaction
      let paymentData: any = {}

      if (data.paymentMethod === 'QRIS') {
        paymentData = await midtransService.createQRISTransaction({
          orderId,
          grossAmount: data.amount,
          customerDetails: data.customerDetails,
          itemDetails: data.itemDetails,
        })

        PaymentModel.updateStatus(kdPaymentTransaction, 'PENDING', {
          qr_code_url: paymentData.qrCodeUrl,
          expired_at: paymentData.expiryTime,
        })
      } else if (data.paymentMethod === 'GOPAY') {
        paymentData = await midtransService.createGoPayTransaction({
          orderId,
          grossAmount: data.amount,
          customerDetails: data.customerDetails,
          itemDetails: data.itemDetails,
        })

        PaymentModel.updateStatus(kdPaymentTransaction, 'PENDING', {
          deeplink_url: paymentData.deeplinkUrl,
          qr_code_url: paymentData.qrCodeUrl,
          expired_at: paymentData.expiryTime,
        })
      } else {
        // Use Snap for other payment methods
        paymentData = await midtransService.createSnapTransaction({
          orderId,
          grossAmount: data.amount,
          customerDetails: data.customerDetails,
          itemDetails: data.itemDetails,
        })
      }

      return {
        success: true,
        data: {
          kdPaymentTransaction,
          orderId,
          ...paymentData,
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // Handle Midtrans webhook
  static async handleWebhook(notification: any) {
    try {
      // Log webhook
      PaymentModel.logWebhook({
        order_id: notification.order_id,
        transaction_status: notification.transaction_status,
        payment_type: notification.payment_type,
        gross_amount: parseFloat(notification.gross_amount),
        signature_key: notification.signature_key,
        raw_payload: JSON.stringify(notification),
        tgl_received: new Date().toISOString(),
      })

      // Verify signature
      const isValid = midtransService.verifySignature(
        notification.order_id,
        notification.status_code,
        notification.gross_amount,
        notification.signature_key
      )

      if (!isValid) {
        throw new Error('Invalid signature')
      }

      // Get payment transaction
      const payment = PaymentModel.getByOrderId(notification.order_id)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Update payment status
      const status = midtransService.getPaymentStatus(
        notification.transaction_status,
        notification.fraud_status
      )

      const updateData: any = {
        midtrans_transaction_id: notification.transaction_id,
        payment_type: notification.payment_type,
      }

      if (status === 'SUCCESS') {
        updateData.paid_at = notification.settlement_time || new Date().toISOString()
        updateData.settlement_time = notification.settlement_time
      }

      PaymentModel.updateStatus(payment.kd_payment_transaction, status, updateData)

      return { success: true, status }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // Check payment status
  static async checkStatus(orderId: string) {
    try {
      const status = await midtransService.checkTransactionStatus(orderId)
      return { success: true, data: status }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // Request refund
  static async requestRefund(data: {
    kdPaymentTransaction: string
    kdTransaksiJual: string
    amount: number
    reason: string
    requestedBy: string
  }) {
    try {
      const kdRefund = generateId('REF')

      PaymentModel.createRefund({
        kd_refund: kdRefund,
        kd_payment_transaction: data.kdPaymentTransaction,
        kd_transaksi_jual: data.kdTransaksiJual,
        jumlah_refund: data.amount,
        alasan: data.reason,
        status: 'PENDING',
        requested_by: data.requestedBy,
        tgl_request: new Date().toISOString(),
      })

      return { success: true, data: { kdRefund } }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}
```

### Step 6: Add IPC Handlers

Add to `src/main/ipcHandlers.ts`:

```typescript
// Payment Gateway Handlers
ipcMain.handle('payment:get-methods', async () => {
  return PaymentController.getPaymentMethods()
})

ipcMain.handle('payment:create', async (_, data) => {
  return PaymentController.createPayment(data)
})

ipcMain.handle('payment:check-status', async (_, orderId) => {
  return PaymentController.checkStatus(orderId)
})

ipcMain.handle('payment:request-refund', async (_, data) => {
  return PaymentController.requestRefund(data)
})
```

### Step 7: Create UI Components

Create `src/renderer/components/payment/PaymentMethodSelector.tsx`:

```typescript
import { useState, useEffect } from 'react'

interface PaymentMethod {
  kd_payment_method: string
  nama_method: string
  jenis: string
  icon: string
  fee_persen: number
  fee_fixed: number
}

export function PaymentMethodSelector({ onSelect, amount }: {
  onSelect: (method: PaymentMethod) => void
  amount: number
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    const result = await window.api.invoke('payment:get-methods')
    if (result.success) {
      setMethods(result.data)
    }
  }

  const calculateFee = (method: PaymentMethod) => {
    const percentFee = (amount * method.fee_persen) / 100
    const totalFee = percentFee + method.fee_fixed
    return totalFee
  }

  const handleSelect = (method: PaymentMethod) => {
    setSelected(method.kd_payment_method)
    onSelect(method)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {methods.map((method) => {
        const fee = calculateFee(method)
        const total = amount + fee

        return (
          <button
            key={method.kd_payment_method}
            onClick={() => handleSelect(method)}
            className={`
              p-4 rounded-lg border-2 transition-all
              ${selected === method.kd_payment_method
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
              }
            `}
          >
            <div className="text-3xl mb-2">{method.icon}</div>
            <div className="font-medium">{method.nama_method}</div>
            {fee > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Fee: Rp {fee.toLocaleString()}
              </div>
            )}
            <div className="text-sm font-bold mt-2">
              Total: Rp {total.toLocaleString()}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

### Step 8: Testing

1. **Test Cash Payment:**
```typescript
const result = await window.api.invoke('payment:create', {
  kdTransaksiJual: 'TRX001',
  paymentMethod: 'CASH',
  amount: 100000,
  customerDetails: {
    firstName: 'John',
    email: 'john@example.com',
    phone: '08123456789',
  },
  itemDetails: [],
})
```

2. **Test QRIS Payment:**
```typescript
const result = await window.api.invoke('payment:create', {
  kdTransaksiJual: 'TRX002',
  paymentMethod: 'QRIS',
  amount: 50000,
  customerDetails: {
    firstName: 'Jane',
    email: 'jane@example.com',
    phone: '08123456789',
  },
  itemDetails: [
    { id: 'ITEM1', name: 'Product 1', price: 50000, quantity: 1 }
  ],
})
// Will return QR code URL
```

3. **Test Webhook:**
- Use Midtrans webhook simulator
- Or use ngrok to expose local server

---

## 🎯 PHASE 2: Cloud Backup & Sync (Week 3-4)

### Coming Soon...
Dokumentasi lengkap untuk Cloud Backup & Sync akan dibuat setelah Payment Gateway selesai.

**Preview:**
- AWS S3 setup
- Backup encryption
- Sync service
- Conflict resolution
- Multi-device support

---

## 🎯 PHASE 3: Mobile App (Week 5-8)

### Coming Soon...
Dokumentasi lengkap untuk Mobile App akan dibuat setelah Cloud Backup selesai.

**Preview:**
- React Native setup
- API server
- Push notifications
- Offline support
- App deployment

---

## 📊 Progress Tracking

### Phase 1: Payment Gateway
- [x] Midtrans service created
- [x] Database schema created
- [x] Environment setup
- [ ] Models implementation
- [ ] Controllers implementation
- [ ] IPC handlers
- [ ] UI components
- [ ] Testing
- [ ] Documentation

### Phase 2: Cloud Backup
- [ ] AWS S3 setup
- [ ] Backup service
- [ ] Sync service
- [ ] Encryption
- [ ] UI components
- [ ] Testing

### Phase 3: Mobile App
- [ ] React Native setup
- [ ] API server
- [ ] Authentication
- [ ] Dashboard
- [ ] Reports
- [ ] Notifications
- [ ] Testing
- [ ] Deployment

---

## 💰 Cost Breakdown

### Development (One-time)
- Payment Gateway: Rp 10.000.000
- Cloud Backup: Rp 10.000.000
- Mobile App: Rp 20.000.000
- **Total: Rp 40.000.000**

### Operational (Monthly)
- Midtrans: 2.9% per transaction
- AWS S3: ~Rp 100.000 (100GB)
- VPS/API Server: ~Rp 500.000
- Firebase: Free tier
- **Total: ~Rp 600.000/month**

### Revenue Potential
- Basic Plan: Rp 150.000/month
- Professional Plan: Rp 300.000/month
- Enterprise Plan: Rp 500.000/month
- Transaction Fee: 0.5-1% (optional)

**Break-even:** 67 users (Professional Plan)
**Target:** 200 users = Rp 60.000.000/month

---

## 🚀 Next Steps

1. **Complete Payment Gateway Implementation**
   - Finish models, controllers, IPC handlers
   - Create UI components
   - Test all payment methods
   - Document API

2. **Start Cloud Backup Implementation**
   - Setup AWS S3 account
   - Create backup service
   - Implement sync logic
   - Test multi-device sync

3. **Plan Mobile App Development**
   - Design UI/UX
   - Setup React Native project
   - Create API server
   - Implement features

---

**Need Help?** Contact the development team or refer to:
- `.kiro/specs/premium-features/requirements.md` - Detailed requirements
- `FITUR_POS_KOMERSIAL.md` - Feature comparison
- Midtrans Documentation: https://docs.midtrans.com/

**Status:** Phase 1 In Progress (30% complete)
**Last Updated:** 2026-04-28
