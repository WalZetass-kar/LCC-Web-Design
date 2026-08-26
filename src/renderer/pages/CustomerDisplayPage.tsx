import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, ExternalLink, Copy, Eye } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useToast } from '../contexts/ToastContext'
import { api } from '../utils/api'

export default function CustomerDisplayPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)
  const displayUrl = `${window.location.origin}${window.location.pathname}#/customer-display`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl)
      toast('URL Customer Display disalin', 'success')
    } catch {
      toast('Gagal menyalin URL', 'error')
    }
  }

  const openDisplay = async () => {
    setOpening(true)
    try {
      // 1. In Electron desktop app, open a dedicated native secondary window
      const res = await api<any>('window:openCustomerDisplay')
      if (res?.success) {
        toast('Layar Customer Display dibuka di jendela baru', 'success')
        return
      }
    } catch {
      // Ignore IPC fallback error
    } finally {
      setOpening(false)
    }

    // 2. Web browser fallback: window.open
    try {
      const win = window.open(displayUrl, '_blank', 'noopener,noreferrer')
      if (win) {
        toast('Layar Customer Display dibuka di tab baru', 'success')
        return
      }
    } catch {}

    // 3. If popup is blocked, offer direct route navigation
    navigate('/customer-display')
  }

  const openPreview = () => {
    navigate('/customer-display')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm shadow-red-600/30">
          <Monitor size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Customer Display</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tampilan layar kedua untuk customer melihat item dan total belanja</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mb-4">
              <Monitor size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Buka Customer Display</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 font-medium">
              Buka halaman display di layar/monitor kedua. Halaman akan otomatis menampilkan item yang discan kasir secara real-time.
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <Button
                icon={<ExternalLink size={14} />}
                onClick={openDisplay}
                loading={opening}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 border-0"
              >
                Buka di Jendela Baru
              </Button>
              <Button
                variant="secondary"
                icon={<Eye size={14} />}
                onClick={openPreview}
                className="font-bold text-xs border-slate-200 dark:border-slate-800"
              >
                Pratinjau Layar
              </Button>
              <Button
                variant="secondary"
                icon={<Copy size={14} />}
                onClick={copyUrl}
                className="font-bold text-xs border-slate-200 dark:border-slate-800"
              >
                Salin URL
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Cara Penggunaan">
          <div className="space-y-4 mt-2">
            {[
              { step: 1, title: 'Sambungkan Monitor Kedua', desc: 'Hubungkan monitor/TV kedua ke komputer kasir via HDMI atau VGA' },
              { step: 2, title: 'Buka Display di Monitor Kedua', desc: 'Klik "Buka di Tab Baru" lalu pindahkan tab ke monitor kedua dan fullscreen (F11)' },
              { step: 3, title: 'Mulai Transaksi', desc: 'Lakukan transaksi seperti biasa di monitor utama. Display akan auto-sync.' },
              { step: 4, title: 'Customer Melihat Total', desc: 'Customer bisa melihat item yang discan dan total belanja di layar mereka' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{s.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="URL Display">
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-300 truncate">
            {displayUrl}
          </div>
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copyUrl}>Copy</Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Gunakan URL ini di browser monitor kedua. Bisa juga diakses dari device lain di jaringan yang sama.
        </p>
      </Card>
    </div>
  )
}
