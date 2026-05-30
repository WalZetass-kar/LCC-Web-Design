import { useEffect, useMemo, useState } from 'react'
import { ServerCog, LogIn, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { secureStorage } from '../utils/secureStorage'
import {
  initLicenseClient,
  LicenseProvider,
  AdminPanel,
} from '../license'
import { appConfig } from '../utils/productionConfig'

const STORAGE_KEY = 'license_admin_config'

interface StoredConfig { baseURL: string; email: string }

function loadConfig(): StoredConfig | null {
  try {
    const raw = secureStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredConfig) : null
  } catch { return null }
}
function saveConfig(cfg: StoredConfig) { secureStorage.setJSON(STORAGE_KEY, cfg) }
function clearConfig() { secureStorage.removeItem(STORAGE_KEY) }
function detectPlatform() {
  if (typeof navigator === 'undefined') return 'electron'
  if (/android/i.test(navigator.userAgent)) return 'android'
  return 'electron'
}

export default function LicenseAdmin() {
  const { user } = useAuth()
  const stored = useMemo(loadConfig, [])
  const [connected, setConnected] = useState(!!stored)
  const [clientReady, setClientReady] = useState(false)
  const [client, setClient] = useState<ReturnType<typeof initLicenseClient> | null>(null)

  useEffect(() => {
    if (!stored) return
    const c = initLicenseClient({
      baseURL: stored.baseURL,
      appPlatform: detectPlatform(),
      appVersion: '2.0.0',
      onForceLogout: () => { clearConfig(); setConnected(false); setClient(null) },
    })
    setClient(c)
    setClientReady(true)
  }, [stored])

  if (!user || user.hak_akses !== 'developer') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="heading-2 mb-2">Akses Ditolak</h2>
          <p className="text-body">Halaman ini hanya untuk akun developer.</p>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <ConnectForm
        defaults={stored ?? undefined}
        onConnected={(cfg) => { saveConfig(cfg); setConnected(true) }}
      />
    )
  }

  if (!clientReady || !client) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Menyiapkan koneksi…</span>
        </div>
      </div>
    )
  }

  return (
    <LicenseProvider client={client}>
      <AdminPanel onExit={() => { window.location.hash = '/' }} />
    </LicenseProvider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECT FORM
// ─────────────────────────────────────────────────────────────────────────────
interface ConnectFormProps {
  defaults?: StoredConfig
  onConnected: (cfg: { baseURL: string; email: string; password: string }) => void
}

function ConnectForm({ defaults, onConnected }: ConnectFormProps) {
  const defaultBaseURL = defaults?.baseURL || appConfig.apiBaseUrl || ''
  const [form, setForm] = useState({
    baseURL: defaultBaseURL,
    email: defaults?.email || 'admin@mediasoft.local',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [pingOk, setPingOk] = useState<boolean | null>(null)

  async function pingServer() {
    setTesting(true)
    setPingOk(null)
    try {
      const r = await fetch(form.baseURL.replace(/\/api\/?$/, '') + '/api/health', { signal: AbortSignal.timeout(4000) })
      setPingOk(r.ok)
    } catch { setPingOk(false) }
    finally { setTesting(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const c = initLicenseClient({ baseURL: form.baseURL.replace(/\/$/, ''), appPlatform: detectPlatform(), appVersion: '2.0.0' })
      const u = await c.login(form.email, form.password)
      if (u.role !== 'super_admin' && u.role !== 'admin') {
        await c.logout()
        throw new Error('Akun ini bukan admin/super_admin di license server.')
      }
      onConnected(form)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Tidak dapat terhubung ke license server.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header card */}
        <div className="glass-card rounded-2xl overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">License Admin Center</h1>
                <p className="text-primary-100 text-sm">Kelola user, paket, fitur & popup dari sini</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <span className="text-red-500 mt-0.5">⚠</span>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* URL + ping */}
              <div>
                <label className="text-label block mb-1.5">URL License Server</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ServerCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      value={form.baseURL}
                      onChange={(e) => { setForm({ ...form, baseURL: e.target.value }); setPingOk(null) }}
                      placeholder="URL license server HTTPS"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={pingServer}
                    disabled={testing}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 shrink-0"
                  >
                    {testing ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : pingOk === true ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : pingOk === false ? (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Wifi className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs">Ping</span>
                  </button>
                </div>
                {pingOk === true && <p className="text-xs text-green-600 mt-1">✓ Server dapat dijangkau</p>}
                {pingOk === false && <p className="text-xs text-red-500 mt-1">✗ Server tidak merespons</p>}
              </div>

              <div>
                <label className="text-label block mb-1.5">Email Admin</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-label block mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? 'Menghubungkan…' : 'Connect & Login'}
              </button>
            </form>
          </div>
        </div>

        {/* Info card */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tips</p>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              Dev lokal: jalankan <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">cd license-server && npm run dev</code> lalu gunakan URL default.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              Produksi: isi URL HTTPS license server publik Anda.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              Konfigurasi tersimpan terenkripsi di device ini.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
