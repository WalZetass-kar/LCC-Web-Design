import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  ShieldCheck,
  XCircle,
  Zap,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Textarea from '../components/Textarea'
import { useToast } from '../contexts/ToastContext'
import { api } from '../utils/api'

interface WhatsAppSettings {
  apiKey: string
  enabled: boolean
  notifyOnSale: boolean
  notifyOnReturn: boolean
  notifyOnLowStock: boolean
  notifyOnPayment: boolean
  messageTemplate: string
}

const DEFAULT_TEMPLATE = 'Terima kasih {customer}! Pesanan Anda sebesar {total} telah diterima. No. Transaksi: {invoice}'

const notificationItems = [
  { key: 'notifyOnSale', label: 'Transaksi Baru', desc: 'Struk ringkas dikirim ke customer setelah transaksi selesai' },
  { key: 'notifyOnReturn', label: 'Return Barang', desc: 'Customer mendapat kabar saat return dicatat' },
  { key: 'notifyOnLowStock', label: 'Stok Menipis', desc: 'Owner mendapat pesan saat stok produk menyentuh batas minimum' },
  { key: 'notifyOnPayment', label: 'Pembayaran', desc: 'Pembayaran selesai ikut mengirim notifikasi transaksi' },
] as const

function boolFromDb(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return Boolean(value)
}

function normalizePreview(phone: string): string {
  let cleaned = phone.trim().replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2)
  if (cleaned.startsWith('0')) cleaned = `62${cleaned.slice(1)}`
  if (cleaned.startsWith('8')) cleaned = `62${cleaned}`
  return cleaned
}

function Toggle({ checked, onChange, title }: { checked: boolean; onChange: () => void; title: string }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      title={title}
      onClick={onChange}
      className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function WhatsApp() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [settings, setSettings] = useState<WhatsAppSettings>({
    apiKey: '',
    enabled: false,
    notifyOnSale: true,
    notifyOnReturn: true,
    notifyOnLowStock: false,
    notifyOnPayment: true,
    messageTemplate: DEFAULT_TEMPLATE,
  })
  const [testNumber, setTestNumber] = useState('')
  const [testModal, setTestModal] = useState(false)
  const [lastTestMessage, setLastTestMessage] = useState('')

  const syncSettings = (data: any) => {
    setSettings({
      apiKey: data?.api_key ?? '',
      enabled: boolFromDb(data?.enabled),
      notifyOnSale: boolFromDb(data?.notify_on_sale, true),
      notifyOnReturn: boolFromDb(data?.notify_on_return, true),
      notifyOnLowStock: boolFromDb(data?.notify_on_low_stock),
      notifyOnPayment: boolFromDb(data?.notify_on_payment, true),
      messageTemplate: data?.message_template || DEFAULT_TEMPLATE,
    })
  }

  useEffect(() => {
    api<any>('whatsapp:get').then(r => {
      if (r.success && r.data) syncSettings(r.data)
    })
  }, [])

  const handleSave = async () => {
    if (settings.enabled && !settings.apiKey.trim()) {
      toast('API key Fonnte wajib diisi sebelum WhatsApp diaktifkan', 'error')
      return
    }

    setLoading(true)
    const r = await api<any>('whatsapp:save', settings)
    setLoading(false)

    if (r.success) {
      if (r.data) syncSettings(r.data)
      toast('Pengaturan WhatsApp berhasil disimpan')
    } else {
      toast(r.message as string ?? 'Gagal menyimpan', 'error')
    }
  }

  const handleTest = async () => {
    const phone = testNumber.trim()
    if (!phone) return toast('Masukkan nomor HP', 'error')
    if (!settings.apiKey.trim()) return toast('API key Fonnte belum diisi', 'error')

    setTesting(true)
    setLastTestMessage('')
    const r = await api('whatsapp:test', {
      phone,
      apiKey: settings.apiKey,
      message: 'Test notifikasi dari MediaSoft POS berhasil.',
    })
    setTesting(false)

    if (r.success) {
      setTestModal(false)
      setLastTestMessage(r.message as string ?? 'Pesan test masuk antrean Fonnte')
      toast('Pesan test berhasil dikirim')
    } else {
      setLastTestMessage(r.message as string ?? 'Gagal mengirim pesan')
      toast(r.message as string ?? 'Gagal mengirim pesan', 'error')
    }
  }

  const normalizedTestNumber = normalizePreview(testNumber)
  const activeCount = notificationItems.filter(item => settings[item.key]).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading-1 flex items-center gap-2">
              <MessageCircle className="text-emerald-500" size={26} />
              WhatsApp
            </h1>
            <Badge label={settings.enabled ? 'Aktif' : 'Nonaktif'} variant={settings.enabled ? 'green' : 'gray'} />
          </div>
          <p className="text-body mt-1">Atur API Fonnte dan notifikasi otomatis POS.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="secondary"
            onClick={() => setTestModal(true)}
            icon={<Send size={16} />}
            className="w-full sm:w-auto"
          >
            Test
          </Button>
          <Button onClick={handleSave} loading={loading} icon={<CheckCircle size={16} />} className="w-full sm:w-auto">
            Simpan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className={settings.enabled ? 'border-emerald-200 dark:border-emerald-900/60' : ''}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${settings.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {settings.enabled ? <CheckCircle size={22} /> : <XCircle size={22} />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Status WhatsApp {settings.enabled ? 'aktif' : 'nonaktif'}
                  </p>
                  <p className="text-caption">
                    {settings.enabled ? `${activeCount} jenis notifikasi dipilih` : 'Aktifkan setelah API key benar'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={settings.enabled}
                title="Aktifkan WhatsApp"
                onChange={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              />
            </div>
            {lastTestMessage && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {lastTestMessage}
              </div>
            )}
          </Card>

          <Card title="Konfigurasi API" subtitle="Token disimpan lokal di database aplikasi.">
            <div className="space-y-4">
              <div>
                <label className="text-label mb-2 block">API Key Fonnte</label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={e => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Masukkan API key Fonnte"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    title={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => window.open('https://fonnte.com', '_blank')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Buka Fonnte
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </Card>

          <Card title="Notifikasi Otomatis">
            <div className="grid gap-3 md:grid-cols-2">
              {notificationItems.map(item => (
                <div key={item.key} className="flex min-h-24 items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={settings[item.key]}
                    title={`Toggle ${item.label}`}
                    onChange={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Template Pesan Transaksi">
            <Textarea
              value={settings.messageTemplate}
              onChange={e => setSettings(prev => ({ ...prev, messageTemplate: e.target.value }))}
              rows={5}
              placeholder={DEFAULT_TEMPLATE}
              helperText="Variabel: {customer}, {total}, {invoice}"
            />
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {settings.messageTemplate || DEFAULT_TEMPLATE}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Checklist">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <ShieldCheck size={18} className={settings.apiKey.trim() ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-slate-400'} />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">API key</p>
                  <p className="text-caption">{settings.apiKey.trim() ? 'Sudah diisi' : 'Belum diisi'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Bell size={18} className={settings.enabled ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-slate-400'} />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">Status</p>
                  <p className="text-caption">{settings.enabled ? 'Notifikasi berjalan' : 'Masih nonaktif'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap size={18} className={activeCount > 0 ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-slate-400'} />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">Trigger</p>
                  <p className="text-caption">{activeCount} dari {notificationItems.length} aktif</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Nomor Customer">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p>Nomor di data customer boleh ditulis 08..., +628..., atau 628.... Sistem akan mengirim ke format 628....</p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={testModal}
        onClose={() => setTestModal(false)}
        title="Kirim Pesan Test"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTestModal(false)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleTest} loading={testing} className="w-full sm:w-auto">Kirim</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nomor HP"
            value={testNumber}
            onChange={e => setTestNumber(e.target.value)}
            placeholder="08123456789"
            helperText={normalizedTestNumber ? `Akan dikirim ke ${normalizedTestNumber}` : 'Contoh: 08123456789'}
          />
        </div>
      </Modal>
    </div>
  )
}
