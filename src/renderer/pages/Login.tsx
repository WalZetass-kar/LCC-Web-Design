import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, Sparkles, Info, Key, Keyboard, Database, Globe, MessageCircle, Sun, Moon } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import appLogo from '../assets/app-logo.png'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { openWhatsApp, openWhatsAppUpgrade, SUBSCRIPTION_UPGRADE_WA_NUMBER } from '../utils/whatsapp'
import type { UserSession, Identitas } from '../../shared/types'
import { validatePasswordStrength } from '../../shared/passwordPolicy'
import { secureStorage } from '../utils/secureStorage'
import { collectAuthDeviceInfo } from '../utils/authDevice'

interface PublicPlan {
  name: string
  price: number
  duration_days: number
  is_recommended?: boolean
}

function formatPrice(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function getPlanPeriod(days: number): string {
  if (days === 0) return '/seumur hidup'
  if (days === 1) return '/hari'
  if (days === 7) return '/minggu'
  if (days >= 28 && days <= 31) return '/bulan'
  if (days >= 360 && days <= 366) return '/tahun'
  return `/${days} hari`
}

export default function Login() {
  const { login } = useAuth()
  const { mode, toggleMode } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [showDefaultLogin, setShowDefaultLogin] = useState(false)
  const [hasUsers, setHasUsers] = useState(true)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const [authLoading, setAuthLoading] = useState(true)
  const [activePlans, setActivePlans] = useState<PublicPlan[]>([])
  const [setupForm, setSetupForm] = useState({
    username: '',
    nama_lengkap: '',
    email: '',
    no_telp: '',
    password: '',
    confirmPassword: '',
  })
  const [forcePasswordUser, setForcePasswordUser] = useState<UserSession | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

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
        await secureStorage.ready(['rememberMe', 'pos_session', 'auth_device_id'])
      } catch {
        // Android Preferences is only a storage mirror; localStorage/mobile store can still work.
      }

      try {
        // Check if remembered. Keep only the username; never restore a saved password.
        const remembered = secureStorage.getItem('rememberMe')
        if (remembered) {
          const { username: savedUser } = JSON.parse(remembered)
          if (savedUser) {
            setUsername(savedUser)
            secureStorage.setJSON('rememberMe', { username: savedUser })
          }
          setRememberMe(true)
        }
      } catch {
        secureStorage.removeItem('rememberMe')
      }

      try {
        const dbCheck = await api('system:checkDb')
        setDbStatus(dbCheck.success ? 'connected' : 'error')
      } catch {
        setDbStatus('error')
      }

      try {
        const userCheck = await api<{ hasUsers: boolean }>('auth:hasUsers')
        if (userCheck.success) {
          const hasExistingUsers = !!userCheck.data?.hasUsers
          setHasUsers(hasExistingUsers)
          setAuthView(hasExistingUsers ? 'login' : 'register')
        }
      } catch {
        setHasUsers(false)
        setAuthView('register')
      } finally {
        setAuthLoading(false)
        usernameRef.current?.focus()
      }
    }
    checkStatus()
  }, [])

  useEffect(() => {
    api<PublicPlan[] | PublicPlan>('license:getPublicPlans').then(r => {
      const plans = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : [])
      if (r.success) setActivePlans(plans)
    })
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
        setShowDefaultLogin(v => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading])

  const completeLogin = async (user: UserSession) => {
    // Save only the username. Passwords must not be persisted in renderer storage.
    if (rememberMe) {
      secureStorage.setJSON('rememberMe', { username: user.nama_pengguna })
    } else {
      secureStorage.removeItem('rememberMe')
    }

    const identitasCheck = await api<{ hasIdentitas: boolean }>('auth:checkIdentitas')
    if (!identitasCheck.data?.hasIdentitas) {
      setPendingUser(user)
      setShowIdentitas(true)
      return
    }

    login(user)
    toast('Login berhasil! Selamat datang ' + user.nama_lengkap, 'success')
    navigate('/', { replace: true })
  }

  const handleTrialRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!setupForm.username.trim() || !setupForm.nama_lengkap.trim()) {
      setError('Username dan nama lengkap wajib diisi')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupForm.email.trim())) {
      setError('Email valid wajib diisi')
      return
    }

    const validation = validatePasswordStrength(setupForm.password)
    if (!validation.valid) {
      setError(validation.message ?? 'Password tidak valid')
      return
    }
    if (setupForm.password !== setupForm.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    try {
      const r = await api<UserSession>('auth:registerTrial', {
        username: setupForm.username,
        nama_lengkap: setupForm.nama_lengkap,
        email: setupForm.email,
        no_telp: setupForm.no_telp,
        password: setupForm.password,
      }, collectAuthDeviceInfo())
      if (!r.success || !r.data) {
        setError(r.message ?? 'Gagal membuat akun trial')
        return
      }
      setHasUsers(true)
      setAuthView('login')
      setUsername(setupForm.username.trim())
      setPassword('')
      setSetupForm({ username: '', nama_lengkap: '', email: '', no_telp: '', password: '', confirmPassword: '' })
      toast('Trial 3 hari aktif. Beberapa fitur premium terkunci sampai upgrade.', 'success')
      await completeLogin(r.data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Username dan password tidak boleh kosong')
      return
    }

    setLoading(true)
    try {
      const r = await api<UserSession>('auth:login', username, password, collectAuthDeviceInfo())
      if (!r.success || !r.data) {
        setError(r.message ?? 'Login gagal')
        return
      }

      if (r.data.must_change_password) {
        setForcePasswordUser(r.data)
        setNewPassword('')
        setConfirmNewPassword('')
        return
      }

      await completeLogin(r.data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !pin.trim()) {
      setError('Username dan PIN tidak boleh kosong')
      return
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setError('PIN kasir harus 4-8 digit angka')
      return
    }

    setLoading(true)
    try {
      const r = await api<UserSession>('auth:loginPin', username, pin, collectAuthDeviceInfo())
      if (!r.success || !r.data) {
        setError(r.message ?? 'Login PIN gagal')
        return
      }

      setPin('')
      await completeLogin(r.data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForcedPasswordChange = async () => {
    if (!forcePasswordUser) return
    const validation = validatePasswordStrength(newPassword)
    if (!validation.valid) {
      toast(validation.message ?? 'Password tidak valid', 'error')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast('Password dan konfirmasi password tidak cocok', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const change = await api('auth:changePassword', forcePasswordUser.nama_pengguna, password, newPassword, collectAuthDeviceInfo())
      if (!change.success) {
        toast(change.message ?? 'Gagal mengganti password', 'error')
        return
      }

      const relogin = await api<UserSession>('auth:login', forcePasswordUser.nama_pengguna, newPassword, collectAuthDeviceInfo())
      if (!relogin.success || !relogin.data) {
        toast(relogin.message ?? 'Password berubah, tetapi login ulang gagal', 'error')
        setForcePasswordUser(null)
        setPassword('')
        return
      }

      setPassword('')
      setForcePasswordUser(null)
      await completeLogin(relogin.data)
    } catch (err) {
      toast('Gagal mengganti password: ' + String(err), 'error')
    } finally {
      setChangingPassword(false)
    }
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
  const renewalPlan = activePlans.find(plan => plan.is_recommended) ?? activePlans[0]
  const isExpiredAccessError = /masa akses|berakhir|kadaluarsa|kedaluwarsa|batas device|limit produk|batas produk|upgrade paket/i.test(error)
  const showRegisterForm = authView === 'register'

  const handleForgotPassword = () => {
    openWhatsApp(
      SUBSCRIPTION_UPGRADE_WA_NUMBER,
      [
        'Halo Developer, saya lupa sandi akun Zetass Pos.',
        `Username: ${username.trim() || '-'}`,
        '',
        'Mohon bantu reset sandi akun saya.',
      ].join('\n')
    )
  }

  const handleRenewAccess = () => {
    openWhatsAppUpgrade({
      phone: SUBSCRIPTION_UPGRADE_WA_NUMBER,
      planName: renewalPlan?.name ?? 'Perpanjangan Akses',
      planPrice: renewalPlan ? formatPrice(renewalPlan.price) : 'Harga menyesuaikan',
      planPeriod: renewalPlan ? getPlanPeriod(renewalPlan.duration_days) : '',
      userName: username.trim() || 'User kadaluarsa',
      storeName: null,
      email: null,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white lg:grid lg:grid-cols-[minmax(420px,0.9fr)_minmax(360px,520px)] relative">
      {/* Theme Toggle Button */}
      <button 
        type="button"
        onClick={toggleMode}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-50 p-2.5 rounded-xl bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-all shadow-lg"
        title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      >
        {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* LEFT PANEL — branding, hidden on mobile */}
      <div className="hidden min-h-screen flex-col justify-between border-r border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950 p-8 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="Zetass Pos" className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-primary-500/20" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-lg block leading-tight">Zetass Pos</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Point of Sale</span>
          </div>
        </div>

        {/* Center content */}
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-500/10 border border-primary-500/20 mb-4">
              <Sparkles size={12} className="text-primary-600 dark:text-primary-400" />
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Point of Sale System</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
              Kelola toko Anda<br />
              <span className="text-primary-600 dark:text-primary-300">lebih rapi</span><br />
              & lebih cepat.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Sistem kasir modern dengan fitur lengkap — transaksi, stok, laporan, dan manajemen pelanggan dalam satu aplikasi desktop.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'POS', label: 'Kasir', desc: 'Transaksi real-time' },
              { icon: 'STK', label: 'Stok', desc: 'Manajemen produk' },
              { icon: 'RPT', label: 'Laporan', desc: 'Laba rugi & penjualan' },
              { icon: 'CRM', label: 'Customer', desc: 'Loyalty poin system' },
              { icon: 'SUP', label: 'Supplier', desc: 'Manajemen pembelian' },
              { icon: 'BKP', label: 'Backup', desc: 'Keamanan data' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3">
                <span className="w-9 rounded-md bg-slate-200 dark:bg-slate-800 py-1.5 text-center text-[10px] font-bold tracking-wide text-primary-600 dark:text-primary-300">{f.icon}</span>
                <div>
                  <p className="text-slate-900 dark:text-white text-xs font-semibold">{f.label}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-400 dark:text-slate-600 text-xs">© 2026 Zetass Pos</p>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-white dark:bg-slate-900 p-4 lg:p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-5">
            <img src={appLogo} alt="Zetass Pos" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover shadow-lg shadow-primary-500/20" />
            <p className="font-bold text-slate-900 dark:text-white text-xl">Zetass Pos</p>
            <p className="text-slate-500 dark:text-xs mt-1">Point of Sale</p>
          </div>

          {/* Loading Skeleton */}
          {authLoading ? (
            <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.06] p-5 shadow-xl shadow-slate-200 dark:shadow-black/30">
              <div className="animate-pulse space-y-4">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl mb-4"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                <div className="space-y-3 mt-6">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          ) : (
            /* Card */
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] p-5 shadow-xl shadow-slate-200 dark:shadow-black/30 scrollbar-thin">
              {/* Header */}
              <div className="mb-5">
                <img src={appLogo} alt="Zetass Pos" className="mb-3 h-11 w-11 rounded-lg object-cover shadow-lg shadow-primary-500/20" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{showRegisterForm ? 'Daftar Akun Trial' : 'Selamat datang'}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {showRegisterForm ? 'Buat akun pembeli dan mulai trial terbatas 3 hari.' : 'Masuk ke akun Anda untuk melanjutkan'}
                </p>
              </div>

              {showRegisterForm ? (
              <form onSubmit={handleTrialRegister} className="space-y-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors">
                      <User size={16} />
                    </span>
                    <input
                      value={setupForm.username}
                      onChange={e => setSetupForm(prev => ({ ...prev, username: e.target.value }))}
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                      placeholder="contoh: owner"
                    />
                  </div>
                </div>

                <Input
                  label="Nama Lengkap"
                  value={setupForm.nama_lengkap}
                  onChange={e => setSetupForm(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                  placeholder="Nama pemilik akun"
                />

                <Input
                  label="Email"
                  type="email"
                  value={setupForm.email}
                  onChange={e => setSetupForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email bisnis"
                />

                <Input
                  label="No WhatsApp"
                  value={setupForm.no_telp}
                  onChange={e => setSetupForm(prev => ({ ...prev, no_telp: e.target.value }))}
                  placeholder="contoh: 62812xxxx"
                />

                <Input
                  label="Password"
                  type="password"
                  value={setupForm.password}
                  onChange={e => setSetupForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimal 8 karakter"
                  helperText="Wajib huruf besar, huruf kecil, angka, dan simbol"
                />

                <Input
                  label="Konfirmasi Password"
                  type="password"
                  value={setupForm.confirmPassword}
                  onChange={e => setSetupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Ulangi password"
                />

                <div className="rounded-xl border border-amber-500/20 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">Trial terbatas</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Aktif 3 hari, 1 device, maksimal 20 transaksi per hari dan 30 produk. Laporan, export, backup, multi-user, dan fitur premium lain terkunci sampai upgrade.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <span className="text-red-600 dark:text-red-400 mt-0.5 shrink-0">!</span>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full mt-1 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 border-0" size="lg" loading={loading}>
                  {loading ? 'Mengaktifkan trial...' : 'Mulai Trial 3 Hari'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setAuthView('login'); setError('') }}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                >
                  Sudah punya akun? Masuk
                </button>
              </form>
              ) : (
              <>
              <form onSubmit={loginMode === 'pin' ? handlePinLogin : handleLogin} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setLoginMode('password')}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      loginMode === 'password' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Lock size={14} />
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('pin')}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      loginMode === 'pin' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Key size={14} />
                    PIN Kasir
                  </button>
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors">
                      <User size={16} />
                    </span>
                    <input
                      ref={usernameRef}
                      placeholder="Masukkan username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                    />
                  </div>
                </div>

                {loginMode === 'password' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Masukkan password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 pr-12 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PIN Kasir</label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors">
                        <Key size={16} />
                      </span>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        placeholder="4-8 digit"
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        autoComplete="off"
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-3 h-3 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary-500 focus:ring-primary-500/40"
                    />
                    Ingat Username
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium"
                  >
                    Lupa Sandi?
                  </button>
                </div>

                {error && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <span className="text-red-600 dark:text-red-400 mt-0.5 shrink-0">!</span>
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                    {isExpiredAccessError && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-3">
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Perpanjangan Akses</p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {renewalPlan
                              ? `${renewalPlan.name} ${formatPrice(renewalPlan.price)}${getPlanPeriod(renewalPlan.duration_days)}`
                              : 'Paket aktif belum tersedia. Chat admin untuk info harga terbaru.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRenewAccess}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 shadow-sm shadow-emerald-200 dark:shadow-none"
                        >
                          <MessageCircle size={16} />
                          Perpanjang via WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full mt-1 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 border-0" size="lg" loading={loading}>
                  {loading ? 'Memproses...' : loginMode === 'pin' ? 'Masuk dengan PIN' : 'Masuk ke Dashboard'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setAuthView('register'); setError(''); setShowDefaultLogin(false) }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-400/25 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-200 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-white"
                >
                  <User size={16} />
                  Daftar Akun
                </button>

                {/* Keyboard Hint */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <Keyboard size={12} />
                  Press Enter to login • F1 for account help
                </div>
              </form>

              {/* Login Help */}
              {showDefaultLogin && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-2 mb-3">
                    <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Bantuan Login</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Gunakan akun trial/lisensi pembeli yang sudah dibuat. Jika lupa sandi, klik Lupa Sandi untuk chat WhatsApp developer.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDefaultLogin(false)}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400"
                  >
                    Tutup
                  </button>
                </div>
              )}
              </>
              )}

              {/* System Status & Version */}
              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                  <span className="text-slate-400 dark:text-slate-500">
                    {dbStatus === 'connected' ? 'Database OK' : dbStatus === 'error' ? 'DB Error' : 'Checking...'}
                  </span>
                </div>
                <span className="text-slate-400 dark:text-slate-500">Zetass Pos</span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <Sparkles size={12} className="text-primary-500" />
                Powered by Electron + React
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Force Password Change Dialog */}
      <Modal
        open={!!forcePasswordUser}
        onClose={() => {}}
        title="Ganti Password"
        size="sm"
        footer={
          <Button loading={changingPassword} onClick={handleForcedPasswordChange} size="lg">
            Simpan Password Baru
          </Button>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Password akun ini harus diganti sebelum aplikasi dapat digunakan.
        </p>
        <div className="space-y-4">
          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            helperText="Minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol"
          />
          <Input
            label="Konfirmasi Password Baru"
            type="password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
          />
        </div>
      </Modal>

      {/* Identitas Toko Dialog */}
      <Modal
        open={showIdentitas}
        onClose={() => {}} // Cannot close without filling
        title="Lengkapi Identitas Toko"
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
