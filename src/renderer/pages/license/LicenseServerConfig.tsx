import { useState, useEffect } from 'react'
import { ServerCog, Wifi, WifiOff, LogIn, RefreshCw, CheckCircle } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

export default function LicenseServerConfig() {
  const toast = useToast()
  const [config, setConfig] = useState<{ url: string; connected: boolean } | null>(null)
  const [form, setForm] = useState({
    url: 'https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license',
    email: 'admin@lcc-web-design.local',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [pingOk, setPingOk] = useState<boolean | null>(null)
  const [connectionMessage, setConnectionMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    api<{ url: string; connected: boolean }>('license:getConfig').then(r => {
      if (r.success && r.data) {
        setConfig(r.data)
        if (r.data.url) setForm(f => ({ ...f, url: r.data!.url }))
      }
    })
  }, [])

  async function ping() {
    setPinging(true); setPingOk(null); setConnectionMessage('')
    try {
      const r = await api('license:testConnection', form.url)
      setPingOk(!!r.success)
      setConnectionMessage(r.message || (r.success ? 'Server dapat dijangkau' : 'Server tidak merespons'))
      if (!r.success) toast(r.message || 'Server tidak merespons', 'error')
    } finally {
      setPinging(false)
    }
  }

  async function validateLicense() {
    setValidating(true)
    const r = await api('license:validateApplication')
    setValidating(false)
    toast(r.message || (r.success ? 'Validasi berhasil' : 'Validasi gagal'), r.success ? 'success' : 'error')
  }

  async function syncLicense() {
    setSyncing(true)
    const r = await api('license:syncFromServer')
    setSyncing(false)
    toast(r.message || (r.success ? 'Sync selesai' : 'Sync gagal'), r.success ? 'success' : 'error')
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setConnectionMessage('')
    const r = await api('license:testAndSave', form.url, form.email, form.password)
    setLoading(false)
    if (r.success) {
      toast('Berhasil terhubung ke license server', 'success')
      setConfig({ url: form.url, connected: true })
      setConnectionMessage(r.message || 'Berhasil terhubung ke license server')
    } else {
      setConnectionMessage(r.message || 'Gagal terhubung')
      toast(r.message || 'Gagal terhubung', 'error')
    }
  }

  return (
    <div className="max-w-none space-y-4">
      {config?.connected && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <Wifi className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-300">Terhubung ke <code className="font-mono">{config.url}</code></span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Konfigurasi License Server</h2>
        <form onSubmit={connect} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">URL License Server</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ServerCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required value={form.url}
                  onChange={e => { setForm({ ...form, url: e.target.value }); setPingOk(null) }}
                  placeholder="https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
              </div>
              <button type="button" onClick={ping} disabled={pinging}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5">
                {pinging ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  : pingOk === true ? <Wifi className="w-4 h-4 text-green-500" />
                  : pingOk === false ? <WifiOff className="w-4 h-4 text-red-500" />
                  : <Wifi className="w-4 h-4 text-slate-400" />}
                <span className="text-xs">Ping</span>
              </button>
            </div>
            {pingOk === true && <p className="text-xs text-green-600 mt-1">✓ Server dapat dijangkau</p>}
            {pingOk === false && <p className="text-xs text-red-500 mt-1">✗ Server tidak merespons</p>}
            {connectionMessage && (
              <p className={`mt-1 text-xs ${pingOk === false ? 'text-red-500' : pingOk === true ? 'text-green-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {connectionMessage}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Email Admin</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Password</label>
            <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Dev lokal awal: Admin#12345"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Menghubungkan…' : 'Simpan & Hubungkan'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Validasi & Sync Lisensi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={validateLicense}
            disabled={validating}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {validating ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
            Validasi Lisensi Aplikasi
          </button>
          <button
            type="button"
            onClick={syncLicense}
            disabled={syncing}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {syncing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4 text-primary-500" />}
            Sync Lisensi dari Server
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Sync menarik paket dan popup dari Supabase ke database lokal aplikasi ini. Akun pembeli, fitur, popup, dan pembayaran dikelola dari tab License Center lain.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tips</p>
        <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <li>• Server aktif: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license</code></li>
          <li>• Login admin: gunakan email admin license center dan password yang disimpan lokal di <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env.supabase.local</code></li>
          <li>• Pembeli login memakai email dan password akun yang dibuat admin</li>
          <li>• Token admin tersimpan di database lokal aplikasi ini</li>
        </ul>
      </div>
    </div>
  )
}
