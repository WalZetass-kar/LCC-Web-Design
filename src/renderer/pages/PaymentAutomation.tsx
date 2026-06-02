import { useEffect, useState } from 'react'
import { CreditCard, RefreshCw, Save, QrCode, CheckCircle, Upload, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { formatRupiah } from '../utils/format'

interface GatewaySettings {
  provider: string
  serverKey: string
  clientKey: string
  isProduction: boolean
  enabled: boolean
  hasEnvServerKey: boolean
}

interface QrisSession {
  id: number
  order_id: string
  provider: string
  amount: number
  status: string
  transaction_status: string
  created_at: string
}

interface StrukSettings {
  qris_image?: string | null
  qris_enabled?: number | boolean
}

export default function PaymentAutomation() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<GatewaySettings>({
    provider: 'midtrans',
    serverKey: '',
    clientKey: '',
    isProduction: false,
    enabled: false,
    hasEnvServerKey: false,
  })
  const [sessions, setSessions] = useState<QrisSession[]>([])
  const [staticQris, setStaticQris] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [cfg, list, struk] = await Promise.all([
      api<GatewaySettings>('payment:getGatewaySettings'),
      api<QrisSession[]>('payment:getQrisSessions', 30),
      api<StrukSettings>('strukSettings:get'),
    ])
    if (cfg.success && cfg.data) setSettings(cfg.data)
    if (list.success) setSessions(list.data ?? [])
    if (struk.success && struk.data?.qris_image) setStaticQris(struk.data.qris_image)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    const r = await api('payment:saveGatewaySettings', settings)
    setSaving(false)
    if (r.success) {
      toast('Gateway pembayaran disimpan')
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const markPaid = async (orderId: string) => {
    const r = await api('payment:markQrisPaid', orderId)
    if (r.success) {
      toast('Sesi QRIS ditandai lunas')
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const uploadStaticQris = async (file?: File | null) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast('QRIS harus PNG, JPG, JPEG, atau WEBP', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Ukuran QRIS maksimal 5MB', 'error')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const image = String(reader.result || '')
      const r = await api<StrukSettings>('strukSettings:uploadQris', image)
      setUploading(false)
      if (r.success) {
        setStaticQris(r.data?.qris_image || image)
        toast('QRIS statis disimpan. Kasir bisa pakai QRIS tanpa Midtrans.')
      } else {
        toast(r.message as string || 'Gagal upload QRIS', 'error')
      }
    }
    reader.onerror = () => {
      setUploading(false)
      toast('Gagal membaca file QRIS', 'error')
    }
    reader.readAsDataURL(file)
  }

  const removeStaticQris = async () => {
    const r = await api('strukSettings:removeQris')
    if (r.success) {
      setStaticQris('')
      toast('QRIS statis dihapus')
    } else {
      toast(r.message as string || 'Gagal hapus QRIS', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-primary-500" size={28} />
            Pembayaran Digital
          </h1>
          <p className="text-sm text-slate-500">Aktifkan QRIS otomatis Midtrans atau fallback QRIS statis dari pengaturan struk.</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw size={16} />}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Gateway Midtrans" subtitle="Dipakai otomatis saat kasir memilih QRIS." className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Provider</span>
              <select value={settings.provider} onChange={e => setSettings({ ...settings, provider: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm">
                <option value="midtrans">Midtrans</option>
              </select>
            </label>
            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 w-full">
                <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} />
                <span className="text-sm font-medium">Aktifkan gateway otomatis</span>
              </label>
            </div>
            <Input label="Server Key" type="password" value={settings.serverKey} onChange={e => setSettings({ ...settings, serverKey: e.target.value })} placeholder={settings.hasEnvServerKey ? 'Terisi dari .env jika dikosongkan' : 'SB-Mid-server-...'} />
            <Input label="Client Key" type="password" value={settings.clientKey} onChange={e => setSettings({ ...settings, clientKey: e.target.value })} placeholder="SB-Mid-client-..." />
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
              <input type="checkbox" checked={settings.isProduction} onChange={e => setSettings({ ...settings, isProduction: e.target.checked })} />
              <span className="text-sm font-medium">Mode production</span>
            </label>
            <Button onClick={save} loading={saving} icon={<Save size={16} />}>Simpan Gateway</Button>
          </div>
        </Card>

        <Card title="Status Alur">
          <div className="space-y-3 text-sm">
            <StatusRow label="Gateway aktif" ok={settings.enabled || settings.hasEnvServerKey} />
            <StatusRow label="Server key tersedia" ok={!!settings.serverKey || settings.hasEnvServerKey} />
            <StatusRow label="Fallback QRIS statis" ok={!!staticQris} />
            <p className="text-xs text-slate-500">Jika Midtrans belum dikonfigurasi, kasir memakai QRIS statis dari upload di bawah.</p>
          </div>
        </Card>
      </div>

      <Card title="QRIS Statis / DANA" subtitle="Upload QRIS toko, QRIS DANA, atau QR pembayaran lain sebagai fallback tanpa Midtrans.">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[220px] flex items-center justify-center">
            {staticQris ? (
              <img src={staticQris} alt="QRIS statis" className="max-h-52 max-w-full object-contain" />
            ) : (
              <div className="text-center text-slate-400">
                <QrCode size={48} className="mx-auto mb-2" />
                <p className="text-sm">Belum ada QRIS statis</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Kasir tetap bisa memilih QRIS walau Midtrans kosong. Sistem akan menampilkan gambar ini dan pembayaran dikonfirmasi manual setelah dana masuk.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                <Upload size={16} />
                {uploading ? 'Mengupload...' : 'Upload QRIS/DANA'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => uploadStaticQris(e.target.files?.[0])} />
              </label>
              {staticQris && (
                <Button variant="danger" onClick={removeStaticQris} icon={<Trash2 size={16} />}>Hapus QRIS</Button>
              )}
            </div>
            <p className="text-xs text-slate-400">Format: PNG, JPG, JPEG, atau WEBP. Maksimal 5MB.</p>
          </div>
        </div>
      </Card>

      <Card title="Riwayat Sesi QRIS">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 text-left">
              <tr><th className="px-3 py-2">Order</th><th>Provider</th><th>Status</th><th className="text-right">Nominal</th><th>Dibuat</th><th className="text-right pr-3">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada sesi QRIS</td></tr>
              ) : sessions.map(session => (
                <tr key={session.id}>
                  <td className="px-3 py-2 font-mono text-xs">{session.order_id}</td>
                  <td><Badge label={session.provider} variant={session.provider === 'midtrans' ? 'blue' : 'amber'} /></td>
                  <td><Badge label={session.status} variant={session.status === 'paid' ? 'green' : session.status === 'failed' ? 'red' : 'gray'} /></td>
                  <td className="text-right">{formatRupiah(session.amount)}</td>
                  <td className="text-xs text-slate-500">{new Date(session.created_at).toLocaleString('id-ID')}</td>
                  <td className="text-right pr-3">
                    {session.status !== 'paid' && (
                      <Button size="sm" variant="secondary" onClick={() => markPaid(session.order_id)} icon={<CheckCircle size={14} />}>Lunas</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
      <span>{label}</span>
      {ok ? <CheckCircle size={16} className="text-emerald-500" /> : <QrCode size={16} className="text-amber-500" />}
    </div>
  )
}
