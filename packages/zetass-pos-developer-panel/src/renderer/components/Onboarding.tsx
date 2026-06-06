import { useState, useEffect } from 'react'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Keyboard,
  LayoutDashboard,
  ScanLine,
  X,
} from 'lucide-react'
import { secureStorage } from '../utils/secureStorage'

const TOUR_STEPS = [
  {
    title: 'Mulai Dari Dashboard',
    content: 'Pantau ringkasan penjualan, stok menipis, dan akses cepat ke transaksi.',
    icon: LayoutDashboard,
  },
  {
    title: 'Keyboard Shortcuts',
    content: 'Gunakan F1-F10 untuk navigasi cepat:\nF1: Transaksi\nF2: Produk\nF3: Riwayat\nCtrl+K: Quick Search',
    icon: Keyboard,
  },
  {
    title: 'Barcode Scanner',
    content: 'Scan barcode produk langsung di halaman transaksi untuk menambahkan item ke keranjang.',
    icon: ScanLine,
  },
  {
    title: 'Multi-Payment',
    content: 'Terima pembayaran Tunai, Transfer, dan QRIS dari panel pembayaran kasir.',
    icon: CreditCard,
  },
  {
    title: 'Shift Management',
    content: 'Buka shift sebelum mulai transaksi, lalu tutup shift untuk rekonsiliasi kas.',
    icon: Clock,
  },
  {
    title: 'Siap Digunakan',
    content: 'Panel ini tidak mengunci layar kerja. Tutup kapan saja, atau lanjutkan sambil memakai aplikasi.',
    icon: CheckCircle,
  },
]

export default function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const open = () => {
      setStep(0)
      setIsOpen(true)
    }
    window.addEventListener('app:show-onboarding', open)
    return () => window.removeEventListener('app:show-onboarding', open)
  }, [])

  const handleClose = () => {
    secureStorage.setItem('hasSeenTour', 'true')
    setIsOpen(false)
    setStep(0)
  }

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  if (!isOpen) return null

  const StepIcon = TOUR_STEPS[step].icon

  return (
    <section
      role="dialog"
      aria-label="Panduan singkat aplikasi"
      className="fixed bottom-10 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
          <StepIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Panduan Singkat</p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{TOUR_STEPS[step].title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup panduan"
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-2 whitespace-pre-line text-sm leading-5 text-slate-600 dark:text-slate-300">
            {TOUR_STEPS[step].content}
          </p>

          <div className="mt-4 flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-7 bg-primary-500' : 'w-2 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={15} />
              Kembali
            </button>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {step < TOUR_STEPS.length - 1 ? 'Lanjut' : 'Selesai'}
              {step < TOUR_STEPS.length - 1 && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
