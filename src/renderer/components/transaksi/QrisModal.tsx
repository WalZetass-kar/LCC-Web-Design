import React from 'react'
import { QrCode } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { formatRupiah } from '../../utils/format'
import { QrisPayment } from './types'

interface QrisModalProps {
  open: boolean
  totalBayar: number
  qrisPayment: QrisPayment | null
  qrisStatus: string
  qrisChecking: boolean
  qrisCompleting: boolean
  isStaticQrisPayment: boolean
  onCancel: () => void
  onCompleteQrisSale: () => void
  onCheckStatus: () => void
}

export default function QrisModal({
  open, totalBayar, qrisPayment, qrisStatus, qrisChecking, qrisCompleting, isStaticQrisPayment,
  onCancel, onCompleteQrisSale, onCheckStatus
}: QrisModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Pembayaran QRIS Dinamis"
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <Button
            variant="danger"
            onClick={onCancel}
            disabled={qrisCompleting}
            className="w-full sm:w-auto font-bold rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 shadow-sm"
          >
            Batalkan
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isStaticQrisPayment ? (
              <Button
                variant="success"
                onClick={onCompleteQrisSale}
                loading={qrisCompleting}
                disabled={!qrisPayment}
                className="w-full sm:w-auto font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 px-6 py-2.5"
              >
                Konfirmasi Pembayaran Selesai
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={onCheckStatus}
                loading={qrisChecking}
                disabled={!qrisPayment || qrisCompleting}
                className="w-full sm:w-auto font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-2.5"
              >
                Cek Status Sekarang
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Hero Tagihan Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-950 p-5 text-white shadow-2xl border border-red-900/50">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-600/20 blur-2xl" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-300/80 block">
                Total Tagihan Pembayaran
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {formatRupiah(totalBayar)}
              </span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold shadow-inner">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Live QRIS
              </span>
              {qrisPayment?.orderId && (
                <p className="mt-1 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                  {qrisPayment.orderId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner">
          {qrisPayment?.qrImageUrl ? (
            <div className="relative p-4 bg-white rounded-3xl shadow-2xl ring-4 ring-red-600/10 border border-slate-100 flex flex-col items-center">
              {/* Official QRIS Header */}
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-black tracking-tighter text-red-600">QRIS</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pembayaran Nasional</span>
              </div>

              {/* Target Corners Frame */}
              <div className="relative">
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-red-600 rounded-tl-lg" />
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-red-600 rounded-tr-lg" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-red-600 rounded-bl-lg" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-red-600 rounded-br-lg" />

                <img
                  src={qrisPayment.qrImageUrl}
                  alt="QRIS Pembayaran"
                  className="h-60 w-60 sm:h-64 sm:w-64 object-contain rounded-xl"
                />
              </div>

              <p className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                NMID: {qrisPayment.orderId?.slice(-12) || 'ZETASS-POS'}
              </p>
            </div>
          ) : qrisPayment?.qrString ? (
            <textarea
              readOnly
              value={qrisPayment.qrString}
              className="h-32 w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-xs text-slate-900 dark:text-white font-mono"
            />
          ) : (
            <div className="flex h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 text-slate-400">
              <QrCode size={52} className="mb-2 text-red-500 animate-pulse" />
              <p className="text-sm font-extrabold text-slate-800 dark:text-white">Menyiapkan QRIS...</p>
              <p className="text-xs text-slate-400 mt-0.5">Menghubungkan payment gateway</p>
            </div>
          )}

          {/* Supported Wallets Pill Grid */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {['BCA', 'GoPay', 'OVO', 'Dana', 'ShopeePay', 'LinkAja', 'Mobile Banking'].map(w => (
              <span
                key={w}
                className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* Real-time Status Alert Bar */}
        <div className={`rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-3 ${
          qrisCompleting
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-sm'
            : qrisStatus.includes('gagal') || qrisStatus.includes('dibatalkan')
              ? 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200 border border-red-300 dark:border-red-800 shadow-sm'
              : 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-sm'
        }`}>
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="truncate">{qrisStatus}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
