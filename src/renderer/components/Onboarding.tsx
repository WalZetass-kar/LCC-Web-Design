import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'

const TOUR_STEPS = [
  {
    title: 'Selamat Datang di MediaSoft POS! 🎉',
    content: 'Aplikasi kasir modern untuk mengelola toko Anda dengan mudah dan efisien.',
  },
  {
    title: 'Keyboard Shortcuts ⌨️',
    content: 'Gunakan F1-F10 untuk navigasi cepat:\n• F1: Transaksi\n• F2: Produk\n• F3: Riwayat\n• F4: Customer\n• Ctrl+K: Quick Search',
  },
  {
    title: 'Barcode Scanner 📷',
    content: 'Scan barcode produk langsung di halaman transaksi untuk menambahkan ke keranjang dengan cepat.',
  },
  {
    title: 'Multi-Payment 💳',
    content: 'Terima pembayaran dengan berbagai metode: Tunai, Transfer, Kartu, E-Wallet, dan QRIS.',
  },
  {
    title: 'Shift Management ⏰',
    content: 'Kelola shift kasir dengan mudah. Buka shift di awal, tutup di akhir, dan lihat laporan per shift.',
  },
  {
    title: 'Siap Memulai! 🚀',
    content: 'Anda siap menggunakan MediaSoft POS. Jika butuh bantuan, tekan Ctrl+K untuk quick search.',
  },
]

export default function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('hasSeenTour', 'true')
    setIsOpen(false)
    setStep(0) // Reset step for next time
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

  return (
    <Modal open={isOpen} onClose={handleClose} title="">
      <div className="text-center space-y-6 py-4">
        <div className="text-6xl">{step === 0 ? '👋' : step === TOUR_STEPS.length - 1 ? '🎉' : '💡'}</div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{TOUR_STEPS[step].title}</h2>
          <p className="text-gray-600 whitespace-pre-line">{TOUR_STEPS[step].content}</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-pink-500' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={handlePrev} icon={<ChevronLeft />} className="flex-1">
              Kembali
            </Button>
          )}
          <Button onClick={handleNext} icon={step < TOUR_STEPS.length - 1 ? <ChevronRight /> : undefined} className="flex-1">
            {step < TOUR_STEPS.length - 1 ? 'Lanjut' : 'Mulai'}
          </Button>
        </div>

        <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700">
          Lewati tutorial
        </button>
      </div>
    </Modal>
  )
}
