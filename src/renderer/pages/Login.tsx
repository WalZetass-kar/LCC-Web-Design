import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Key,
  Keyboard,
  Database,
  Sun,
  Moon,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Truck,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  ChevronRight,
  ArrowRight,
  Check,
  Zap,
  TrendingUp,
  Layers,
  Store,
  Fingerprint,
} from 'lucide-react'
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
import { tryCloudSignIn } from '../../shared/supabase/auth'
import { SkeletonSpinner } from '../components/Skeleton'
import { biometric } from '../utils/biometric'

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
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // Identitas dialog state
  const [showIdentitas, setShowIdentitas] = useState(false)
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null)
  const [identitas, setIdentitas] = useState<Partial<Identitas>>({})
  const [savingIdentitas, setSavingIdentitas] = useState(false)

  useEffect(() => {
    biometric.isAvailable().then(res => {
      setBiometricAvailable(res.isAvailable)
    })
  }, [])

  // Block navigation while identitas modal is open
  useEffect(() => {
    if (!showIdentitas) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [showIdentitas])

  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await secureStorage.ready(['rememberMe', 'pos_session', 'auth_device_id'])
      } catch {
        // Storage mirror fallback
      }

      try {
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
    if (rememberMe) {
      secureStorage.setJSON('rememberMe', { username: user.nama_pengguna })
    } else {
      secureStorage.removeItem('rememberMe')
    }

    if (password) {
      void biometric.saveCredentials(user.nama_pengguna, password)
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
      const r = await api<UserSession>(
        'auth:registerTrial',
        {
          username: setupForm.username,
          nama_lengkap: setupForm.nama_lengkap,
          email: setupForm.email,
          no_telp: setupForm.no_telp,
          password: setupForm.password,
        },
        collectAuthDeviceInfo()
      )
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
        setOldPassword(loginMode === 'password' ? password : '')
        setNewPassword('')
        setConfirmNewPassword('')
        return
      }

      if (r.data.email && loginMode === 'password') {
        void tryCloudSignIn(r.data.email, password)
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

  const handleBiometricLogin = async () => {
    setBiometricLoading(true)
    setError('')
    try {
      const authRes = await biometric.authenticate()
      if (!authRes.success) {
        if (authRes.message) setError(authRes.message)
        return
      }

      if (authRes.username && authRes.password) {
        const r = await api<UserSession>('auth:login', authRes.username, authRes.password, collectAuthDeviceInfo())
        if (r.success && r.data) {
          await completeLogin(r.data)
          return
        }
      }

      const remembered = secureStorage.getJSON<{ username: string } | null>('rememberMe', null)
      const targetUser = username.trim() || remembered?.username
      if (targetUser) {
        const r = await api<UserSession>('auth:getUserByUsername', targetUser)
        if (r.success && r.data) {
          await completeLogin(r.data)
          return
        }
      }

      toast('Biometrik terverifikasi! Masukkan password/PIN untuk sesi pertama.', 'info')
    } catch (err: any) {
      setError(err.message || 'Gagal login biometrik')
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleForcedPasswordChange = async () => {
    if (!forcePasswordUser) return
    if (!oldPassword.trim()) {
      toast('Password lama wajib diisi', 'error')
      return
    }
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
      const change = await api(
        'auth:changePassword',
        forcePasswordUser.nama_pengguna,
        oldPassword,
        newPassword,
        collectAuthDeviceInfo()
      )
      if (!change.success) {
        toast(change.message ?? 'Gagal mengganti password', 'error')
        return
      }

      const relogin = await api<UserSession>(
        'auth:login',
        forcePasswordUser.nama_pengguna,
        newPassword,
        collectAuthDeviceInfo()
      )
      if (!relogin.success || !relogin.data) {
        toast(relogin.message ?? 'Password berubah, tetapi login ulang gagal', 'error')
        setForcePasswordUser(null)
        setOldPassword('')
        setPassword('')
        return
      }

      setPassword('')
      setOldPassword('')
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

  if (authLoading) return <SkeletonSpinner />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between select-none relative font-sans">
      
      {/* Dynamic Geometric Decorative Pattern (Low Opacity, Non-gradient) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full opacity-[0.03] dark:opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-900 dark:text-white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      {/* Main Grid: 2 Columns on Desktop (60% Left Hero / 40% Right Login Form) */}
      <div className="flex-1 lg:grid lg:grid-cols-[1.2fr_0.8fr] relative z-10 w-full min-h-screen">
        
        <div className="hidden lg:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-950 p-10 lg:p-12">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <img
                src={appLogo}
                alt="Zetass Pos"
                className="h-11 w-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">Zetass POS</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Point of Sale & Store Management</span>
              </div>
            </div>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleMode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm active:scale-95"
              title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>

          {/* Hero Headline & Dashboard Visual Preview */}
          <div className="my-auto py-8 space-y-8 max-w-2xl">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <Zap size={14} className="text-red-600 fill-red-600" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Sistem Kasir Modern Kelas Dunia</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Kelola Toko Lebih Rapi,<br />
                <span className="text-red-600">Cepat</span> & Terintegrasi.
              </h1>
              
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-xl font-normal">
                Sistem kasir profesional dengan fitur terlengkap — manajemen transaksi kilat, stok otomatis, laporan keuangan real-time, dan multi-user dalam satu aplikasi.
              </p>
            </div>

            {/* Simulated POS Dashboard Visual Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ringkasan Penjualan Hari Ini</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                  <TrendingUp size={12} /> +18.4% Hari Ini
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500">Total Transaksi</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">Rp 14.850.000</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500">Struk Terjual</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">248 Transaksi</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500">Status Kasir</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Ready
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Feature Cards Grid (6 Feature items) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {[
                { icon: ShoppingCart, label: 'Kasir POS', desc: 'Transaksi kilat & struk' },
                { icon: Package, label: 'Stok & Produk', desc: 'Inventaris otomatis' },
                { icon: BarChart3, label: 'Laporan Laba', desc: 'Analisis penjualan' },
                { icon: Users, label: 'Customer', desc: 'Loyalty & poin' },
                { icon: Truck, label: 'Supplier', desc: 'Manajemen PO' },
                { icon: ShieldCheck, label: 'Keamanan', desc: 'Backup & hak akses' },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="flex items-center gap-3 rounded-[18px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-600/20 flex items-center justify-center shrink-0">
                    <f.icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white text-xs font-bold truncate">{f.label}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Left Footer Info */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>© 2026 Zetass Pos Enterprise</span>
            <span className="px-2.5 py-1 rounded-full bg-red-600/10 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-600/20 text-[11px] font-bold">
              Developer By WalZetass-Kar
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between items-center p-4 sm:p-8 lg:p-10 bg-white dark:bg-slate-900 min-h-screen">
          
          {/* Mobile Top Header */}
          <div className="w-full max-w-[450px] flex lg:hidden items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={appLogo} alt="Zetass Pos" className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-800" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-base block leading-tight">Zetass Pos</span>
                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Enterprise Edition</span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMode}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          <div className={`w-full transition-all duration-300 my-auto ${showRegisterForm ? 'max-w-xl' : 'max-w-[450px]'}`}>
            {authLoading ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/50">
                <div className="animate-pulse space-y-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-4"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  <div className="space-y-3 mt-6">
                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Premium Login Card (Width adaptive, Padding 28-32px, Radius 24px) */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/60"
              >
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-1.5 rounded-2xl border border-red-600/20 bg-red-50 dark:bg-red-950/40">
                      <img src={appLogo} alt="Zetass Pos" className="h-10 w-10 rounded-xl object-contain" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">Autentikasi Pengguna</span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Zetass POS Portal</span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {showRegisterForm ? 'Daftar Akun Trial' : 'Selamat Datang'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    {showRegisterForm
                      ? 'Buat akun pembeli dan mulai masa uji coba trial 3 hari gratis.'
                      : 'Masuk ke akun Anda untuk membuka dashboard kasir.'}
                  </p>
                </div>

                {showRegisterForm ? (
                  /* ─── TRIAL REGISTER FORM (Roomy & Responsive Grid) ─── */
                  <form onSubmit={handleTrialRegister} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Nama Lengkap <span className="text-red-600">*</span>
                        </label>
                        <input
                          value={setupForm.nama_lengkap}
                          onChange={e => setSetupForm(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                          placeholder="Nama pemilik / toko"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Username Login <span className="text-red-600">*</span>
                        </label>
                        <div className="relative group">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                            <User size={18} />
                          </span>
                          <input
                            value={setupForm.username}
                            onChange={e => setSetupForm(prev => ({ ...prev, username: e.target.value }))}
                            autoComplete="username"
                            className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-11 pr-4 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                            placeholder="Contoh: owner, kasir1"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Email Valid <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="email"
                          value={setupForm.email}
                          onChange={e => setSetupForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                          placeholder="email@bisnis.com"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          No WhatsApp (Opsional)
                        </label>
                        <input
                          type="tel"
                          value={setupForm.no_telp}
                          onChange={e => setSetupForm(prev => ({ ...prev, no_telp: e.target.value }))}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                          placeholder="08123456789"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Password <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="password"
                          value={setupForm.password}
                          onChange={e => setSetupForm(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                          placeholder="Min 8 karakter"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Konfirmasi Password <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="password"
                          value={setupForm.confirmPassword}
                          onChange={e => setSetupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                          placeholder="Ulangi password"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
                      * Password wajib kombinasi huruf besar, kecil, angka, dan simbol (minimal 8 karakter).
                    </p>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-3.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Ketentuan Trial</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
                        Trial aktif 3 hari, 1 device, maks 20 transaksi/hari. Fitur laporan & backup terbuka setelah upgrade lisensi.
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-4 py-3">
                        <span className="text-red-600 dark:text-red-400 font-bold shrink-0">!</span>
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 leading-snug">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-red-600/20 border-0"
                      size="lg"
                      loading={loading}
                    >
                      {loading ? 'Mengaktifkan Trial...' : 'Mulai Trial 3 Hari'}
                    </Button>

                    <button
                      type="button"
                      onClick={() => { setAuthView('login'); setError('') }}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Sudah Punya Akun? Masuk Halaman Login
                    </button>
                  </form>
                ) : (
                  /* ─── LOGIN FORM (Password / PIN) ─── */
                  <>
                    <form onSubmit={loginMode === 'pin' ? handlePinLogin : handleLogin} className="space-y-4">
                      
                      {/* Material Design 3 Segmented Control (Sliding Indicator) */}
                      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 relative">
                        <button
                          type="button"
                          onClick={() => setLoginMode('password')}
                          className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                            loginMode === 'password' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {loginMode === 'password' && (
                            <motion.div
                              layoutId="segmented-active"
                              className="absolute inset-0 bg-red-600 rounded-xl shadow-sm -z-10"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Lock size={15} />
                          Password Mode
                        </button>

                        <button
                          type="button"
                          onClick={() => setLoginMode('pin')}
                          className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                            loginMode === 'pin' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {loginMode === 'pin' && (
                            <motion.div
                              layoutId="segmented-active"
                              className="absolute inset-0 bg-red-600 rounded-xl shadow-sm -z-10"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Key size={15} />
                          PIN Kasir Mode
                        </button>
                      </div>

                      {/* Username Field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Username / Email
                        </label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                            <User size={18} />
                          </span>
                          <input
                            ref={usernameRef}
                            placeholder="Masukkan username atau email"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            className="w-full h-14 sm:h-13 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-11 pr-4 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                          />
                        </div>
                      </div>

                      {/* Password or PIN Field */}
                      {loginMode === 'password' ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Password
                          </label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                              <Lock size={18} />
                            </span>
                            <input
                              type={showPass ? 'text' : 'password'}
                              placeholder="Masukkan kata sandi"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              autoComplete="current-password"
                              className="w-full h-14 sm:h-13 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-11 pr-12 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(v => !v)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            PIN Kasir (4-8 Digit)
                          </label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                              <Key size={18} />
                            </span>
                            <input
                              type="password"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={8}
                              placeholder="Masukkan PIN 4-8 angka"
                              value={pin}
                              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              autoComplete="off"
                              className="w-full h-14 sm:h-13 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-11 pr-4 text-base sm:text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Remember & Forgot Password Bar */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-600/30"
                          />
                          Ingat Username
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-red-600 dark:text-red-400 hover:underline font-bold transition-colors"
                        >
                          Lupa Sandi?
                        </button>
                      </div>

                      {/* Error Alert Box */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3 pt-1"
                        >
                          <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-4 py-3">
                            <span className="text-red-600 dark:text-red-400 font-bold shrink-0">!</span>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 leading-snug">{error}</p>
                          </div>

                          {isExpiredAccessError && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900/50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Perpanjangan Akses Lisensi</p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                {renewalPlan
                                  ? `${renewalPlan.name} ${formatPrice(renewalPlan.price)}${getPlanPeriod(renewalPlan.duration_days)}`
                                  : 'Paket aktif belum tersedia. Hubungi admin developer.'}
                              </p>
                              <button
                                type="button"
                                onClick={handleRenewAccess}
                                className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 shadow-sm transition-colors"
                              >
                                <MessageCircle size={15} />
                                Perpanjang via WhatsApp Developer
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Primary Action Submit Button */}
                      <Button
                        type="submit"
                        className="w-full h-13 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-red-600/20 border-0 transition-all"
                        size="lg"
                        loading={loading}
                      >
                        {loading ? 'Memproses Authentikasi...' : loginMode === 'pin' ? 'Masuk dengan PIN Kasir' : 'Masuk ke Dashboard POS'}
                      </Button>

                      {/* Native Biometric Fingerprint / Face ID Button */}
                      {biometricAvailable && (
                        <button
                          type="button"
                          onClick={handleBiometricLogin}
                          disabled={biometricLoading || loading}
                          className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 px-4 text-xs font-bold text-red-700 dark:text-red-300 transition-all hover:bg-red-100 dark:hover:bg-red-900/60 active:scale-[0.98] shadow-sm"
                        >
                          <Fingerprint size={18} className={biometricLoading ? 'animate-pulse text-red-600' : 'text-red-600'} />
                          {biometricLoading ? 'Memverifikasi Biometrik...' : 'Masuk dengan Sidik Jari / Face ID'}
                        </button>
                      )}

                      {/* Create Account Link Button */}
                      <button
                        type="button"
                        onClick={() => { setAuthView('register'); setError(''); setShowDefaultLogin(false) }}
                        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <User size={15} />
                        Daftar Akun Trial (3 Hari)
                      </button>
                    </form>

                    {/* F1 Login Assistance Help Dialog */}
                    {showDefaultLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-xs space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-blue-700 dark:text-blue-300">Bantuan Akses Login</p>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              Gunakan username/email dan password pembeli yang sudah terdaftar. Jika belum memiliki akun, klik <b>Daftar Akun Trial</b> di atas.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDefaultLogin(false)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          Tutup Bantuan
                        </button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* Compact Right Footer (DB Status & Developer Claim) */}
          <div className="w-full max-w-[450px] mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{dbStatus === 'connected' ? 'Database OK' : dbStatus === 'error' ? 'DB Disconnected' : 'Checking DB...'}</span>
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Developer By <span className="text-red-600 dark:text-red-400">WalZetass-Kar</span>
            </span>
          </div>

        </div>

      </div>

      {/* Modals */}
      <Modal
        open={!!forcePasswordUser}
        onClose={() => {}}
        title="Ganti Password Akun"
        size="sm"
        footer={
          <Button loading={changingPassword} onClick={handleForcedPasswordChange} size="lg" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold border-0">
            Simpan Password Baru
          </Button>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium leading-relaxed">
          Password akun Anda diwajibkan untuk diganti sebelum aplikasi dapat digunakan.
        </p>
        <div className="space-y-3.5">
          <Input
            label="Password Lama"
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            helperText="Masukkan password lama Anda"
          />
          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            helperText="Minimal 8 karakter dengan huruf besar, kecil, angka & simbol"
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
        onClose={() => {}}
        title="Lengkapi Identitas Toko"
        size="md"
        footer={
          <Button loading={savingIdentitas} onClick={handleSaveIdentitas} size="lg" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold border-0">
            Simpan & Lanjutkan
          </Button>
        }
      >
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 mb-5">
          <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Setup Awal Toko</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
            Sebelum memulai transaksi, lengkapi informasi nama dan alamat toko yang akan tercetak di struk kasir.
          </p>
        </div>

        <div className="space-y-3.5">
          <Input
            label="Nama Toko *"
            value={identitas.namatoko ?? ''}
            onChange={e => fi('namatoko', e.target.value)}
            placeholder="Contoh: Toko Maju Jaya"
            helperText="Nama toko akan muncul pada struk dan laporan"
          />
          <Input
            label="Alamat Toko"
            value={identitas.alamattoko ?? ''}
            onChange={e => fi('alamattoko', e.target.value)}
            placeholder="Jl. Merdeka No. 45, Jakarta"
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
