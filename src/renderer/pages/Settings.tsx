import { useEffect, useState } from 'react'
import { Sun, Moon, Palette, Store } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { useTheme, type ThemeColor } from '../contexts/ThemeContext'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import type { Identitas } from '../../shared/types'

const COLORS: { key: ThemeColor; label: string; hex: string }[] = [
  { key: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { key: 'emerald', label: 'Emerald', hex: '#10b981' },
  { key: 'rose', label: 'Rose', hex: '#f43f5e' },
  { key: 'amber', label: 'Amber', hex: '#f59e0b' },
  { key: 'sky', label: 'Sky', hex: '#0ea5e9' },
]

export default function Settings() {
  const { color, mode, setColor, setMode } = useTheme()
  const toast = useToast()
  const [identitas, setIdentitas] = useState<Partial<Identitas>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<Identitas>('identitas:get').then(r => {
      if (r.success && r.data) setIdentitas(r.data)
    })
  }, [])

  const saveIdentitas = async () => {
    setLoading(true)
    const r = await api('identitas:save', identitas)
    setLoading(false)
    if (r.success) toast(r.message as string)
    else toast(r.message as string, 'error')
  }

  const f = (k: string, v: string) => setIdentitas(prev => ({ ...prev, [k]: v }))

  return (
    <div className="max-w-2xl space-y-6">
      {/* Theme Color */}
      <Card title="Tema Warna" action={<Palette size={16} className="text-slate-400" />}>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 flex-wrap mt-1">
          {COLORS.map(c => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-sm font-medium
                ${color === c.key ? 'border-current shadow-md scale-105' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'}`}
              style={{ color: c.hex }}
            >
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Dark Mode */}
      <Card title="Mode Tampilan">
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 mt-1">
          {(['light', 'dark'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all
                ${mode === m ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary-300'}`}
            >
              {m === 'light' ? <Sun size={16} /> : <Moon size={16} />}
              {m === 'light' ? 'Light Mode' : 'Dark Mode'}
            </button>
          ))}
        </div>
      </Card>

      {/* Store Identity */}
      <Card title="Identitas Toko" action={<Store size={16} className="text-slate-400" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <Input label="Nama Toko" value={identitas.namatoko ?? ''} onChange={e => f('namatoko', e.target.value)} />
          <Input label="No. Telepon" value={identitas.nomortelptoko ?? ''} onChange={e => f('nomortelptoko', e.target.value)} />
          <Input label="No. WhatsApp Owner" value={identitas.nomorwaowner ?? ''} onChange={e => f('nomorwaowner', e.target.value)} />
          <Input label="Email Owner" value={identitas.alamatemailowner ?? ''} onChange={e => f('alamatemailowner', e.target.value)} />
          <div className="col-span-1 sm:col-span-2">
            <Input label="Alamat Toko" value={identitas.alamattoko ?? ''} onChange={e => f('alamattoko', e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Identitas</Button>
        </div>
      </Card>

      <p className="text-xs text-slate-400 text-center">MediaSoft POS Ihwal v1.0.0 — Preferensi tema disimpan otomatis di browser</p>
    </div>
  )
}
