# Payment Gateway Options

Ringkasan pilihan untuk lisensi online MediaSoft POS.

## Implementasi Saat Ini

Fase saat ini memakai **manual WhatsApp developer**.

Alasan:

- Tidak perlu verifikasi merchant gateway dulu.
- Tetap tercatat di Supabase sebagai payment `pending`.
- Developer approve pembayaran manual dari License Center.
- User langsung diarahkan ke WhatsApp dengan invoice dan detail paket.

Secret Supabase:

```bash
supabase secrets set DEVELOPER_WHATSAPP=628xxxxxxxxxx
```

Flow:

```text
Frontend POS
  -> license:createManualPaymentRequest
  -> Edge Function /payments/manual-request
  -> payments.status = pending, provider = manual_whatsapp
  -> WhatsApp developer terbuka
  -> Developer approve dari License Center
  -> payments.status = paid
  -> subscription auto-extend
  -> POS sync /check-license
```

## Gateway Otomatis Nanti

Gateway otomatis yang sudah disiapkan di server: **Midtrans Snap**. UI user belum memakai ini sampai akun merchant siap.

Alasan:

- Cocok untuk Indonesia.
- Support QRIS melalui GoPay/QRIS flow, e-wallet, virtual account, dan metode retail.
- Punya webhook HTTP notification.
- Integrasi ringan dari Supabase Edge Function tanpa mengekspos server key ke frontend.
- Sudah ada service Midtrans untuk QRIS transaksi POS lokal di repo ini.

Secrets Supabase:

```bash
supabase secrets set MIDTRANS_SERVER_KEY=YOUR_SERVER_KEY
supabase secrets set MIDTRANS_IS_PRODUCTION=false
```

Webhook:

```text
https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license/payments/midtrans/webhook
```

## Alternatif

### Xendit

Kuat untuk Indonesia dan internasional Asia Tenggara. Mendukung QRIS, e-wallet, VA, API, dan webhook. Cocok bila akun Midtrans belum disetujui atau butuh dashboard/API Xendit.

### Duitku

Alternatif Indonesia dengan QRIS, e-wallet, VA, callback, dan harga kompetitif. Cocok bila ingin onboarding lokal lain.

### Stripe

Bagus untuk internasional, API dan webhook sangat matang. Kurang ideal untuk QRIS Indonesia karena fokus metode global/kartu/local methods per negara.

### Tripay

Bisa dipertimbangkan untuk pasar Indonesia, tetapi validasi production/onboarding dan SLA perlu dicek ulang sebelum dipakai untuk lisensi production.

## Flow Teknis Yang Diimplementasikan

```text
Frontend POS
  -> license:createManualPaymentRequest
  -> Edge Function /payments/manual-request
  -> payments.status = pending
  -> WhatsApp developer
  -> Admin approve manual
  -> payments.status = paid
  -> subscription auto-extend
  -> POS sync /check-license
```
