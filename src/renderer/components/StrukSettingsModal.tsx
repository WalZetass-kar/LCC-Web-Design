import { useState, useEffect } from 'react'
import { X, Save, Upload, Trash2 } from 'lucide-react'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'

interface StrukSettings {
  printer_type: 'a4' | 'thermal' | 'dot_matrix'
  show_logo: boolean
  show_alamat: boolean
  show_telepon: boolean
  show_email: boolean
  show_kasir: boolean
  show_customer: boolean
  footer_text: string
  qris_image: string | null
  qris_enabled: boolean
}

interface StrukSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function StrukSettingsModal({ isOpen, onClose }: StrukSettingsModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StrukSettings>({
    printer_type: 'thermal',
    show_logo: true,
    show_alamat: true,
    show_telepon: true,
    show_email: true,
    show_kasir: true,
    show_customer: true,
    footer_text: 'Terima kasih atas kunjungan Anda',
    qris_image: null,
    qris_enabled: false,
  })

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  const loadSettings = async () => {
    setLoading(true)
    const r = await api<any>('strukSettings:get')
    if (r.success && r.data) {
      setSettings({
        printer_type: r.data.printer_type || 'thermal',
        show_logo: Boolean(r.data.show_logo),
        show_alamat: Boolean(r.data.show_alamat),
        show_telepon: Boolean(r.data.show_telepon),
        show_email: Boolean(r.data.show_email),
        show_kasir: Boolean(r.data.show_kasir),
        show_customer: Boolean(r.data.show_customer),
        footer_text: r.data.footer_text || '',
        qris_image: r.data.qris_image || null,
        qris_enabled: Boolean(r.data.qris_enabled),
      })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const r = await api('strukSettings:update', settings)
    setSaving(false)
    
    if (r.success) {
      toast('Pengaturan struk berhasil disimpan')
      onClose()
    } else {
      toast(r.message as string || 'Gagal menyimpan', 'error')
    }
  }

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast('File harus berupa gambar', 'error')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast('Ukuran file maksimal 2MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      const r = await api('strukSettings:uploadQris', base64)
      
      if (r.success) {
        toast('QRIS berhasil diupload')
        loadSettings()
      } else {
        toast(r.message as string || 'Gagal upload QRIS', 'error')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveQris = async () => {
    if (!confirm('Hapus gambar QRIS?')) return

    const r = await api('strukSettings:removeQris')
    if (r.success) {
      toast('QRIS berhasil dihapus')
      loadSettings()
    } else {
      toast(r.message as string || 'Gagal menghapus QRIS', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Pengaturan Struk</h2>
            <p className="text-xs text-slate-500 mt-0.5">Atur tampilan struk transaksi</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-6 text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat pengaturan...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Tipe Printer */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Tipe Printer</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'thermal', label: 'Thermal', desc: '58mm/80mm' },
                  { value: 'a4', label: 'A4', desc: 'Kertas A4' },
                  { value: 'dot_matrix', label: 'Dot Matrix', desc: 'Continuous' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSettings({ ...settings, printer_type: value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      settings.printer_type === value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800 dark:text-white">{label}</div>
                    <div className="text-xs text-slate-500 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tampilan Struk */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Tampilan Struk</h3>
              <div className="space-y-3">
                {[
                  { key: 'show_logo', label: 'Tampilkan Logo Toko' },
                  { key: 'show_alamat', label: 'Tampilkan Alamat' },
                  { key: 'show_telepon', label: 'Tampilkan Telepon' },
                  { key: 'show_email', label: 'Tampilkan Email' },
                  { key: 'show_kasir', label: 'Tampilkan Nama Kasir' },
                  { key: 'show_customer', label: 'Tampilkan Nama Customer' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof StrukSettings] })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings[key as keyof StrukSettings] 
                          ? 'bg-primary-500' 
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings[key as keyof StrukSettings] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Teks Footer Struk
              </label>
              <textarea
                value={settings.footer_text}
                onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                rows={3}
                placeholder="Terima kasih atas kunjungan Anda"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            {/* QRIS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">QRIS Payment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload QR Code untuk pembayaran QRIS</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, qris_enabled: !settings.qris_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.qris_enabled 
                      ? 'bg-primary-500' 
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.qris_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.qris_image ? (
                <div className="relative rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
                  <img
                    src={settings.qris_image}
                    alt="QRIS"
                    className="w-48 h-48 object-contain mx-auto rounded-lg"
                  />
                  <button
                    onClick={handleRemoveQris}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all bg-white dark:bg-slate-800">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Upload Gambar QRIS
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Klik untuk pilih file atau drag & drop
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG maksimal 2MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQris}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 transition-all shadow-md disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={14} />
                Simpan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
