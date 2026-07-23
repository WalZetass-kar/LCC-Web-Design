import { useState } from 'react'
import { Plug, MessageCircle, FileSpreadsheet, Bot, CreditCard, Globe, CheckCircle2, XCircle, ExternalLink, Settings, ArrowRight } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useNavigate } from 'react-router-dom'

interface Integration {
  key: string
  name: string
  description: string
  icon: typeof MessageCircle
  color: string
  route: string
  status: 'connected' | 'disconnected' | 'coming_soon'
  features: string[]
}

const INTEGRATIONS: Integration[] = [
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Kirim struk, notifikasi, dan promosi ke pelanggan via WhatsApp',
    icon: MessageCircle,
    color: 'bg-emerald-500',
    route: '/whatsapp',
    status: 'connected',
    features: ['Kirim struk digital', 'Notifikasi stok', 'Promo broadcast', 'Chat customer'],
  },
  {
    key: 'google_sheets',
    name: 'Google Sheets',
    description: 'Export data penjualan dan laporan otomatis ke Google Sheets',
    icon: FileSpreadsheet,
    color: 'bg-green-600',
    route: '/settings',
    status: 'connected',
    features: ['Auto-export dashboard', 'Laporan penjualan harian', 'Sinkronisasi stok', 'Template Apps Script'],
  },
  {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'Asisten cerdas untuk analisis data dan rekomendasi bisnis',
    icon: Bot,
    color: 'bg-violet-500',
    route: '/assistant',
    status: 'connected',
    features: ['Analisis penjualan', 'Prediksi stok', 'Rekomendasi harga', 'Laporan otomatis'],
  },
  {
    key: 'payment_gateway',
    name: 'Payment Gateway',
    description: 'Terima pembayaran QRIS dan transfer digital dari pelanggan',
    icon: CreditCard,
    color: 'bg-blue-500',
    route: '/payment-automation',
    status: 'connected',
    features: ['QRIS Midtrans', 'QRIS Statis', 'Auto-check status', 'Refund digital'],
  },
  {
    key: 'ecommerce',
    name: 'E-commerce API',
    description: 'Sinkronisasi produk dan stok dengan marketplace online',
    icon: Globe,
    color: 'bg-orange-500',
    route: '/ecommerce-api',
    status: 'connected',
    features: ['Sync produk', 'Update stok otomatis', 'Import order', 'Multi-platform'],
  },
  {
    key: 'printer',
    name: 'Thermal Printer',
    description: 'Cetak struk langsung ke printer thermal Bluetooth/USB tanpa dialog',
    icon: Settings,
    color: 'bg-slate-600',
    route: '/print-queue',
    status: 'coming_soon',
    features: ['Print langsung tanpa dialog', 'Bluetooth & USB', '58mm & 80mm', 'Antrian print'],
  },
]

export default function Integrations() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'connected' | 'coming_soon'>('all')

  const filtered = INTEGRATIONS.filter(i => filter === 'all' || i.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Plug size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Integrasi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Hub satu pintu untuk semua koneksi eksternal</p>
        </div>
      </div>

      <Card>
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'Semua' },
            { key: 'connected', label: 'Terhubung' },
            { key: 'coming_soon', label: 'Segera' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(integ => {
          const Icon = integ.icon
          return (
            <Card key={integ.key}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${integ.color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{integ.name}</h3>
                    {integ.status === 'connected' ? (
                      <Badge label="Terhubung" variant="green" />
                    ) : (
                      <Badge label="Segera" variant="yellow" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{integ.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {integ.features.map(f => (
                      <span key={f} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={integ.status === 'connected' ? 'secondary' : 'ghost'}
                    icon={<ArrowRight size={14} />}
                    onClick={() => navigate(integ.route)}
                  >
                    {integ.status === 'connected' ? 'Kelola' : 'Info Selengkapnya'}
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
