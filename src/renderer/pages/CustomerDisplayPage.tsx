import { Monitor, ExternalLink, Copy, CheckCircle2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useToast } from '../contexts/ToastContext'

export default function CustomerDisplayPage() {
  const toast = useToast()
  const displayUrl = `${window.location.origin}${window.location.pathname}#/customer-display`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl)
      toast('URL Customer Display disalin', 'success')
    } catch {
      toast('Gagal menyalin URL', 'error')
    }
  }

  const openDisplay = () => {
    window.open(displayUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Monitor size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Customer Display</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tampilan layar kedua untuk customer melihat item dan total belanja</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
              <Monitor size={36} className="text-primary-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Buka Customer Display</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Buka halaman display di layar/monitor kedua. Halaman akan otomatis menampilkan item yang discan kasir secara real-time.
            </p>
            <div className="flex gap-3">
              <Button icon={<ExternalLink size={14} />} onClick={openDisplay}>Buka di Tab Baru</Button>
              <Button variant="secondary" icon={<Copy size={14} />} onClick={copyUrl}>Salin URL</Button>
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
