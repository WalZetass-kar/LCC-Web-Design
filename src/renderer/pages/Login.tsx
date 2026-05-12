import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Store, Eye, EyeOff, Sparkles, Info, Key, Keyboard, Database, Globe } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { UserSession, Identitas } from '../../shared/types'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [showDefaultLogin, setShowDefaultLogin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Identitas dialog state
  const [showIdentitas, setShowIdentitas] = useState(false)
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null)
  const [identitas, setIdentitas] = useState<Partial<Identitas>>({})
  const [savingIdentitas, setSavingIdentitas] = useState(false)

  const usernameRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => { 
    // Check auth and db status
    const checkStatus = async () => {
      try {
        // Check if remembered. Keep only the username; never restore a saved password.
        const remembered = localStorage.getItem('rememberMe')
        if (remembered) {
          const { username: savedUser } = JSON.parse(remembered)
          if (savedUser) {
            setUsername(savedUser)
            localStorage.setItem('rememberMe', JSON.stringify({ username: savedUser }))
          }
          setRememberMe(true)
        }
        
        // Check DB status
        const dbCheck = await api('system:checkDb')
        setDbStatus(dbCheck.success ? 'connected' : 'error')
      } catch {
        setDbStatus('error')
      } finally {
        setAuthLoading(false)
        usernameRef.current?.focus()
      }
    }
    checkStatus()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        const form = document.querySelector('form')
        if (form) form.requestSubmit()
      }
      if (e.key === 'F1') {
        e.preventDefault()
        setShowDefaultLogin(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Username dan password tidak boleh kosong')
      return
    }

    setLoading(true)
    try {
      const r = await api<UserSession>('auth:login', username, password)
      if (!r.success || !r.data) {
        setError(r.message ?? 'Login gagal')
        setLoading(false)
        return
      }

      // Save only the username. Passwords must not be persisted in renderer storage.
      if (rememberMe) {
        localStorage.setItem('rememberMe', JSON.stringify({ username }))
      } else {
        localStorage.removeItem('rememberMe')
      }

      // Check if store identity is set
      const identitasCheck = await api<{ hasIdentitas: boolean }>('auth:checkIdentitas')
      if (!identitasCheck.data?.hasIdentitas) {
        // Show identitas dialog before proceeding
        setPendingUser(r.data)
        setShowIdentitas(true)
        setLoading(false)
        return
      }

      // Login success - navigate to dashboard
      login(r.data)
      toast('Login berhasil! Selamat datang ' + r.data.nama_lengkap, 'success')
      navigate('/', { replace: true })
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }

  const handleSaveIdentitas = async () => {
    if (!identitas.namatoko?.trim()) {
      toast('Nama toko wajib diisi', 'error')
      return
    }
    setSavingIdentitas(true)
    try {
      await api('identitas:save', identitas)
      setSavingIdentitas(false)
      setShowIdentitas(false)
      if (pendingUser) {
        login(pendingUser)
        toast('Identitas toko berhasil disimpan!', 'success')
        navigate('/', { replace: true })
      }
    } catch (err) {
      toast('Gagal menyimpan identitas: ' + String(err), 'error')
      setSavingIdentitas(false)
    }
  }

  const fi = (k: string, v: string) => setIdentitas(prev => ({ ...prev, [k]: v }))

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      {/* LEFT PANEL — branding, hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] p-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg block leading-tight">MediaSoft POS</span>
            <span className="text-xs text-slate-500">by Zetass</span>
          </div>
        </div>

        {/* Center content */}
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
              <Sparkles size={12} className="text-primary-400" />
              <span className="text-xs text-primary-400 font-medium">Point of Sale System v2.0</span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Kelola toko Anda<br />
              <span className="bg-gradient-to-r from-primary-400 to-rose-300 bg-clip-text text-transparent">lebih cerdas</span><br />
              & lebih cepat.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sistem kasir modern dengan fitur lengkap — transaksi, stok, laporan, dan manajemen pelanggan dalam satu aplikasi desktop.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '💰', label: 'Kasir', desc: 'Transaksi real-time' },
              { icon: '📦', label: 'Stok', desc: 'Manajemen produk' },
              { icon: '📊', label: 'Laporan', desc: 'Laba rugi & penjualan' },
              { icon: '👥', label: 'Customer', desc: 'Loyalty poin system' },
              { icon: '🚚', label: 'Supplier', desc: 'Manajemen pembelian' },
              { icon: '💾', label: 'Backup', desc: 'Keamanan data' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-white text-xs font-semibold">{f.label}</p>
                  <p className="text-slate-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs">© 2026 MediaSoft POS by Zetass</p>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/30">
              <Store size={26} className="text-white" />
            </div>
            <p className="font-bold text-white text-xl">MediaSoft POS</p>
            <p className="text-slate-500 text-xs mt-1">by Zetass</p>
          </div>

          {/* Loading Skeleton */}
          {authLoading ? (
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">
              <div className="animate-pulse space-y-4">
                <div className="w-12 h-12 bg-slate-700 rounded-2xl mb-4"></div>
                <div className="h-6 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                <div className="space-y-3 mt-6">
                  <div className="h-12 bg-slate-700 rounded-xl"></div>
                  <div className="h-12 bg-slate-700 rounded-xl"></div>
                  <div className="h-12 bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          ) : (
            /* Card */
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40 hover:border-white/20 transition-all duration-300">
              {/* Header */}
              <div className="mb-7">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30 animate-pulse">
                  <Store size={22} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Selamat datang 👋</h3>
                <p className="text-slate-400 text-sm">Masuk ke akun Anda untuk melanjutkan</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors">
                      <User size={16} />
                    </span>
                    <input
                      ref={usernameRef}
                      placeholder="Masukkan username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      autoComplete="username"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-12 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-700 text-primary-500 focus:ring-primary-500/40"
                    />
                    Ingat Username
                  </label>
                  <button
                    type="button"
                    onClick={() => window.open('https://wa.me/6208988098238?text=Halo%20Admin,%20saya%20lupa%20password%20akun%20MediaSoft%20POS', '_blank')}
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Lupa Password?
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <span className="text-red-400 mt-0.5 shrink-0">⚠️</span>
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full mt-1 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 border-0" size="lg" loading={loading}>
                  {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
                </Button>

                {/* Keyboard Hint */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Keyboard size={12} />
                  Press Enter to login • F1 for default credentials
                </div>
              </form>

              {/* Default Login Info */}
              {showDefaultLogin && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-2 mb-3">
                    <Info size={16} className="text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-400">Default Login</p>
                      <p className="text-xs text-slate-400">Untuk first-time user</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Admin:</span>
                      <span className="text-white font-mono">admin / admin</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Demo:</span>
                      <span className="text-white font-mono">demo / demo</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDefaultLogin(false)}
                    className="mt-2 text-xs text-slate-500 hover:text-slate-400"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Demo Login Section */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={async () => {
                    setError('')
                    setLoading(true)
                    try {
                      const r = await api<UserSession>('auth:login', 'demo', 'demo')
                      if (r.success && r.data) {
                        login(r.data)
                        toast('🔒 Mode Demo aktif — semua aksi tulis diblokir', 'info')
                        navigate('/', { replace: true })
                      } else {
                        setError(r.message ?? 'Akun demo belum tersedia. Hubungi administrator.')
                      }
                    } catch (err) {
                      setError('Akun demo belum tersedia')
                    }
                    setLoading(false)
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:from-amber-500/20 hover:to-orange-500/20 transition-all group"
                >
                  <span className="text-lg">🔒</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">Coba Demo Mode</p>
                    <p className="text-[10px] text-slate-500">Jelajahi semua fitur — read only</p>
                  </div>
                </button>
              </div>

              {/* System Status & Version */}
              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                  <span className="text-slate-500">
                    {dbStatus === 'connected' ? 'Database OK' : dbStatus === 'error' ? 'DB Error' : 'Checking...'}
                  </span>
                </div>
                <span className="text-slate-500">v2.0.0</span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Sparkles size={12} className="text-primary-500" />
                Powered by Electron + React
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Identitas Toko Dialog */}
      <Modal
        open={showIdentitas}
        onClose={() => {}} // Cannot close without filling
        title="🏪 Lengkapi Identitas Toko"
        size="md"
        footer={
          <Button loading={savingIdentitas} onClick={handleSaveIdentitas} size="lg" variant="success">
            Simpan & Lanjutkan
          </Button>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
          <strong className="text-primary-700 dark:text-primary-400">Selamat datang!</strong> Sebelum menggunakan aplikasi, lengkapi identitas toko Anda terlebih dahulu.
        </p>
        <div className="space-y-4">
          <Input 
            label="Nama Toko *" 
            value={identitas.namatoko ?? ''} 
            onChange={e => fi('namatoko', e.target.value)} 
            placeholder="Contoh: Toko Maju Jaya"
            helperText="Nama toko akan muncul di struk dan laporan"
          />
          <Input 
            label="Alamat Toko" 
            value={identitas.alamattoko ?? ''} 
            onChange={e => fi('alamattoko', e.target.value)} 
            placeholder="Jl. Contoh No. 123"
          />
          <Input 
            label="No. Telepon" 
            value={identitas.nomortelptoko ?? ''} 
            onChange={e => fi('nomortelptoko', e.target.value)} 
            placeholder="08123456789"
          />
          <Input 
            label="No. WhatsApp Owner" 
            value={identitas.nomorwaowner ?? ''} 
            onChange={e => fi('nomorwaowner', e.target.value)} 
            placeholder="08123456789"
          />
        </div>
      </Modal>
    </div>
  )
}
