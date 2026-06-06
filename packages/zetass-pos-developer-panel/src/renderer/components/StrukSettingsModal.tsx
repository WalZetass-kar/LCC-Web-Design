import { useState, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { X, Save, Upload, Trash2 } from 'lucide-react'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import ConfirmDialog from './ConfirmDialog'

const DEFAULT_FOOTER_TEXT = 'Terima kasih atas kunjungan Anda'
const MAX_QRIS_SIZE = 5 * 1024 * 1024
const SUPPORTED_QRIS_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const SUPPORTED_QRIS_EXTENSIONS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

interface StrukSettings {
  printer_type: 'a4' | 'thermal' | 'dot_matrix'
  paper_size: '58mm' | '80mm'
  layout_type: 'classic' | 'modern' | 'minimal'
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

function boolFromDb(value: unknown, fallback: boolean) {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return Boolean(value)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => resolve(event.target?.result as string)
    reader.onerror = () => reject(new Error('Gagal membaca file QRIS'))
    reader.readAsDataURL(file)
  })
}

function getQrisMimeType(file: File) {
  if (SUPPORTED_QRIS_TYPES.includes(file.type)) return file.type
  const lowerName = file.name.toLowerCase()
  const extension = Object.keys(SUPPORTED_QRIS_EXTENSIONS).find(ext => lowerName.endsWith(ext))
  return extension ? SUPPORTED_QRIS_EXTENSIONS[extension] : null
}

export default function StrukSettingsModal({ isOpen, onClose }: StrukSettingsModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [confirmRemoveQris, setConfirmRemoveQris] = useState(false)
  const [settings, setSettings] = useState<StrukSettings>({
    printer_type: 'thermal',
    paper_size: '58mm',
    layout_type: 'classic',
    show_logo: true,
    show_alamat: true,
    show_telepon: true,
    show_email: true,
    show_kasir: true,
    show_customer: true,
    footer_text: DEFAULT_FOOTER_TEXT,
    qris_image: null,
    qris_enabled: false,
  })

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const r = await api<any>('strukSettings:get')
      if (r.success && r.data) {
        setSettings({
          printer_type: r.data.printer_type || 'thermal',
          paper_size: r.data.paper_size || '58mm',
          layout_type: r.data.layout_type || 'classic',
          show_logo: boolFromDb(r.data.show_logo, true),
          show_alamat: boolFromDb(r.data.show_alamat, true),
          show_telepon: boolFromDb(r.data.show_telepon, true),
          show_email: boolFromDb(r.data.show_email, true),
          show_kasir: boolFromDb(r.data.show_kasir, true),
          show_customer: boolFromDb(r.data.show_customer, true),
          footer_text: r.data.footer_text ?? DEFAULT_FOOTER_TEXT,
          qris_image: r.data.qris_image || null,
          qris_enabled: boolFromDb(r.data.qris_enabled, false),
        })
      } else if (!r.success) {
        toast(r.message as string || 'Gagal memuat pengaturan struk', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await api('strukSettings:update', settings)

      if (r.success) {
        toast('Pengaturan struk berhasil disimpan')
        onClose()
      } else {
        toast(r.message as string || 'Gagal menyimpan', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const uploadQrisFile = async (file: File) => {
    const mimeType = getQrisMimeType(file)
    if (!mimeType) {
      toast('File QRIS harus PNG, JPG, JPEG, atau WEBP', 'error')
      return
    }

    if (file.size > MAX_QRIS_SIZE) {
      toast('Ukuran file maksimal 5MB', 'error')
      return
    }

    setUploading(true)
    try {
      const base64 = (await readFileAsDataUrl(file)).replace(/^data:[^;]*;base64,/, `data:${mimeType};base64,`)
      const r = await api<any>('strukSettings:uploadQris', base64)
      
      if (r.success) {
        toast('QRIS berhasil diupload')
        if (r.data) {
          setSettings({
            printer_type: r.data.printer_type || 'thermal',
            paper_size: r.data.paper_size || '58mm',
            layout_type: r.data.layout_type || 'classic',
            show_logo: boolFromDb(r.data.show_logo, true),
            show_alamat: boolFromDb(r.data.show_alamat, true),
            show_telepon: boolFromDb(r.data.show_telepon, true),
            show_email: boolFromDb(r.data.show_email, true),
            show_kasir: boolFromDb(r.data.show_kasir, true),
            show_customer: boolFromDb(r.data.show_customer, true),
            footer_text: r.data.footer_text ?? DEFAULT_FOOTER_TEXT,
            qris_image: r.data.qris_image || null,
            qris_enabled: boolFromDb(r.data.qris_enabled, true),
          })
        } else {
          await loadSettings()
        }
      } else {
        toast(r.message as string || 'Gagal upload QRIS', 'error')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Gagal upload QRIS', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleUploadQris = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    void uploadQrisFile(file)
  }

  const handleQrisDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadQrisFile(file)
  }

  const handleQrisDrag = (e: DragEvent<HTMLLabelElement>, active: boolean) => {
    e.preventDefault()
    setDragActive(active)
  }

  const handleRemoveQris = async () => {
    setUploading(true)
    try {
      const r = await api<any>('strukSettings:removeQris')
      if (r.success) {
        toast('QRIS berhasil dihapus')
        setConfirmRemoveQris(false)
        if (r.data) {
          setSettings(prev => ({
            ...prev,
            qris_image: r.data.qris_image || null,
            qris_enabled: boolFromDb(r.data.qris_enabled, false),
          }))
        } else {
          await loadSettings()
        }
      } else {
        toast(r.message as string || 'Gagal menghapus QRIS', 'error')
      }
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-5 sm:px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Pengaturan Struk</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Atur tampilan struk transaksi</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-6 text-center flex-1">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Memuat pengaturan...</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {/* Tipe Printer */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Tipe Printer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'thermal', label: 'Thermal', desc: 'Roll' },
                  { value: 'a4', label: 'A4', desc: 'Standard' },
                  { value: 'dot_matrix', label: 'Dot Matrix', desc: 'Pita' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSettings({ ...settings, printer_type: value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left min-w-0 ${
                      settings.printer_type === value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800 dark:text-white break-words">{label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran Kertas (Hanya untuk Thermal) */}
            {settings.printer_type === 'thermal' && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Ukuran Kertas Thermal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: '58mm', label: '58mm', desc: 'Lebar Kecil' },
                    { value: '80mm', label: '80mm', desc: 'Lebar Standar' },
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSettings({ ...settings, paper_size: value as any })}
                      className={`p-4 rounded-xl border-2 transition-all text-left min-w-0 ${
                        settings.paper_size === value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-800 dark:text-white break-words">{label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Template Layout */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Template Layout</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'classic', label: 'Klasik', desc: 'Standar' },
                  { value: 'modern', label: 'Modern', desc: 'Rapi' },
                  { value: 'minimal', label: 'Minimal', desc: 'Simple' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSettings({ ...settings, layout_type: value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left min-w-0 ${
                      settings.layout_type === value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800 dark:text-white break-words">{label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</div>
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
                  <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 break-words min-w-0">{label}</span>
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof StrukSettings] })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
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
                className="w-full min-h-[90px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            {/* QRIS */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">QRIS Payment</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload QR Code untuk pembayaran QRIS</p>
                </div>
                <button
                  type="button"
                  aria-label="Aktifkan QRIS di struk"
                  onClick={() => setSettings({ ...settings, qris_enabled: !settings.qris_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
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
                <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
                  <img
                    src={settings.qris_image}
                    alt="QRIS"
                    className="w-48 h-48 object-contain mx-auto rounded-lg"
                  />
                  <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
                    <label
                      onDragEnter={(e) => handleQrisDrag(e, true)}
                      onDragOver={(e) => handleQrisDrag(e, true)}
                      onDragLeave={(e) => handleQrisDrag(e, false)}
                      onDrop={handleQrisDrop}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border transition-colors ${
                        dragActive
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-primary-300 dark:hover:border-primary-700'
                      } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <Upload size={16} />
                      {uploading ? 'Mengupload...' : 'Ganti Gambar'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUploadQris}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveQris(true)}
                      disabled={uploading}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDragEnter={(e) => handleQrisDrag(e, true)}
                  onDragOver={(e) => handleQrisDrag(e, true)}
                  onDragLeave={(e) => handleQrisDrag(e, false)}
                  onDrop={handleQrisDrop}
                  className={`block cursor-pointer ${uploading ? 'pointer-events-none' : ''}`}
                >
                  <div className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all bg-white dark:bg-slate-800 ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                  } ${uploading ? 'opacity-70' : ''}`}>
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {uploading ? 'Mengupload QRIS...' : 'Upload Gambar QRIS'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Klik untuk pilih file atau drag & drop
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PNG, JPG, WEBP maksimal 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadQris}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 sm:px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={saving || uploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
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
      <ConfirmDialog
        open={confirmRemoveQris}
        onClose={() => setConfirmRemoveQris(false)}
        onConfirm={handleRemoveQris}
        title="Hapus Gambar QRIS"
        message="Gambar QRIS di struk akan dihapus."
        confirmText="Hapus"
        variant="danger"
        loading={uploading}
      />
    </>
  )
}
