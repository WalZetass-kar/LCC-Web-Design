import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Store, Eye, EyeOff, Sparkles } from 'lucide-react'
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

  // Identitas dialog state
  const [showIdentitas, setShowIdentitas] = useState(false)
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null)
  const [identitas, setIdentitas] = useState<Partial<Identitas>>({})
  const [savingIdentitas, setSavingIdentitas] = useState(false)

  const usernameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { usernameRef.current?.focus() }, [])

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-in">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/40">
              <Store size={36} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
            MediaSoft POS
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-primary-500" />
            by Ihwal — Masuk ke akun Anda
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleLogin} className="glass-card p-8 space-y-5 animate-in shadow-2xl">
          <Input
            ref={usernameRef}
            label="Username"
            placeholder="Masukkan username Anda"
            value={username}
            onChange={e => setUsername(e.target.value)}
            icon={<User size={18} />}
            autoComplete="username"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                <Lock size={18} />
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Masukkan password Anda"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                  pl-10 pr-12 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400
                  focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-xl px-4 py-3 animate-in">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {loading ? 'Memproses...' : 'Masuk Sekarang'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          MediaSoft POS Ihwal v1.0.0 • Powered by Electron
        </p>
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
