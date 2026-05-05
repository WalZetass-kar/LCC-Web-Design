import { useEffect, useState } from 'react'
import { Sun, Moon, Palette, Store, Receipt, Barcode, Printer, Database, Bell } from 'lucide-react'
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
  { key: 'pink', label: 'Pink Soft', hex: '#ec4899' },
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

  const f = (k: string, v: string | number) => setIdentitas(prev => ({ ...prev, [k]: v }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card title="Tema Warna" action={<Palette size={16} className="text-slate-400" />}>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 flex-wrap mt-1">
            {COLORS.map(c => (
              <button 
                key={c.key} 
                onClick={() => setColor(c.key)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                  color === c.key 
                    ? 'shadow-md scale-105' 
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
                style={{ 
                  color: c.hex,
                  borderColor: color === c.key ? c.hex : undefined
                }}
              >
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.hex }} />
                {c.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Mode Tampilan">
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 mt-1">
            {(['light', 'dark'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${mode === m ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary-300'}`}>
                {m === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                {m === 'light' ? 'Light Mode' : 'Dark Mode'}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Identitas Toko" action={<Store size={16} className="text-slate-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <Input label="Nama Toko" value={identitas.namatoko ?? ''} onChange={e => f('namatoko', e.target.value)} />
            <Input label="No. Telepon" value={identitas.nomortelptoko ?? ''} onChange={e => f('nomortelptoko', e.target.value)} />
            <Input label="No. WhatsApp Owner" value={identitas.nomorwaowner ?? ''} onChange={e => f('nomorwaowner', e.target.value)} />
            <Input label="Email Owner" value={identitas.alamatemailowner ?? ''} onChange={e => f('alamatemailowner', e.target.value)} />
            <div className="col-span-1 sm:grid-cols-2">
              <Input label="Alamat Toko" value={identitas.alamattoko ?? ''} onChange={e => f('alamattoko', e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Identitas</Button>
          </div>
        </Card>

        <Card title="Pengaturan Pajak (PPN)" action={<Receipt size={16} className="text-slate-400" />}>
          <div className="mt-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input label="Persentase PPN (%)" type="number" value={identitas.pajak_persen ?? 0} onChange={e => f('pajak_persen', e.target.value)} placeholder="0" />
                <p className="text-xs text-slate-400 mt-1">Isi 0 untuk menonaktifkan pajak. Contoh: isi 11 untuk PPN 11%.</p>
              </div>
              <div className="shrink-0 text-center px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{identitas.pajak_persen ?? 0}%</p>
                <p className="text-xs text-slate-500">PPN aktif</p>
              </div>
            </div>
            {(identitas.pajak_persen ?? 0) > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-400">
                Pajak PPN {identitas.pajak_persen}% akan ditambahkan ke setiap transaksi dan ditampilkan di struk.
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Pengaturan Pajak</Button>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Pengaturan Barcode" action={<Barcode size={16} className="text-slate-400" />}>
          <div className="mt-1 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto-generate Barcode</p>
                <p className="text-xs text-slate-400 mt-0.5">Generate barcode otomatis untuk produk baru</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={identitas.auto_barcode === 1} onChange={e => f('auto_barcode', e.target.checked ? 1 : 0)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <Input label="Prefix Barcode" value={identitas.barcode_prefix ?? 'POS'} onChange={e => f('barcode_prefix', e.target.value)} placeholder="POS" />
            <p className="text-xs text-slate-400">Contoh: POS0001, POS0002, dst.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Pengaturan Barcode</Button>
          </div>
        </Card>

        <Card title="Pengaturan Struk" action={<Printer size={16} className="text-slate-400" />}>
          <div className="mt-1 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto Print Struk</p>
                <p className="text-xs text-slate-400 mt-0.5">Cetak struk otomatis setelah transaksi</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={identitas.auto_print === 1} onChange={e => f('auto_print', e.target.checked ? 1 : 0)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <Input label="Footer Struk" value={identitas.struk_footer ?? 'Terima kasih atas kunjungan Anda'} onChange={e => f('struk_footer', e.target.value)} placeholder="Terima kasih..." />
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Pengaturan Struk</Button>
          </div>
        </Card>

        <Card title="Auto Backup Database" action={<Database size={16} className="text-slate-400" />}>
          <div className="mt-1 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto Backup Harian</p>
                <p className="text-xs text-slate-400 mt-0.5">Backup database otomatis setiap hari pukul 23:00</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={identitas.auto_backup === 1} onChange={e => f('auto_backup', e.target.checked ? 1 : 0)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <Input label="Simpan Backup Terakhir (hari)" type="number" value={identitas.backup_retention ?? 7} onChange={e => f('backup_retention', e.target.value)} placeholder="7" />
            <p className="text-xs text-slate-400">Backup lama akan dihapus otomatis setelah periode ini.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Pengaturan Backup</Button>
          </div>
        </Card>

        <Card title="Pengaturan Notifikasi" action={<Bell size={16} className="text-slate-400" />}>
          <div className="mt-1 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notifikasi Stok Menipis</p>
                <p className="text-xs text-slate-400 mt-0.5">Tampilkan notifikasi saat stok produk menipis</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={identitas.notif_stok === 1} onChange={e => f('notif_stok', e.target.checked ? 1 : 0)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <Input label="Batas Stok Minimum" type="number" value={identitas.min_stok ?? 5} onChange={e => f('min_stok', e.target.value)} placeholder="5" />
            <p className="text-xs text-slate-400">Notifikasi muncul jika stok produk ≤ nilai ini.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={loading} onClick={saveIdentitas} className="w-full sm:w-auto">Simpan Pengaturan Notifikasi</Button>
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-400 text-center lg:col-span-2">MediaSoft POS v2.0.0 — Preferensi tema disimpan otomatis</p>
    </div>
  )
}
