import { useState, useEffect, useRef } from 'react'
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
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Textarea from '../components/Textarea'
import { useToast } from '../contexts/ToastContext'
import { api } from '../utils/api'
import type { Customer } from '../../shared/types'
import { SkeletonPage } from '../components/Skeleton'

interface WhatsAppSettings {
  provider: 'fonnte'
  apiKey: string
  enabled: boolean
  notifyOnSale: boolean
  notifyOnReturn: boolean
  notifyOnLowStock: boolean
  notifyOnPayment: boolean
  messageTemplate: string
  rateLimitPerMinute: number
}

interface WhatsAppTemplate {
  id: number
  name: string
  content: string
  created_at: string
  updated_at?: string | null
}

interface BroadcastHistory {
  id: number
  title: string
  target_type: string
  total_targets: number
  delivered: number
  failed: number
  scheduled_at?: string | null
  sent_at?: string | null
  status: string
  detail?: string | null
  created_at: string
}

const DEFAULT_TEMPLATE = 'Terima kasih {customer}! Pesanan Anda sebesar {total} telah diterima. No. Transaksi: {invoice}'
const DEFAULT_BROADCAST_TEMPLATE = 'Halo {{nama_customer}}, total belanja Anda {{total_belanja}} dan poin loyalty {{poin_loyalty}}.'

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
        checked ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
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
    provider: 'fonnte',
    apiKey: '',
    enabled: false,
    notifyOnSale: true,
    notifyOnReturn: true,
    notifyOnLowStock: false,
    notifyOnPayment: true,
    messageTemplate: DEFAULT_TEMPLATE,
    rateLimitPerMinute: 20,
  })
  const [testNumber, setTestNumber] = useState('')
  const [testModal, setTestModal] = useState(false)
  const [lastTestMessage, setLastTestMessage] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [history, setHistory] = useState<BroadcastHistory[]>([])
  const [targetMode, setTargetMode] = useState<'all' | 'active' | 'manual'>('active')
  const [manualTargets, setManualTargets] = useState('')
  const [broadcastTitle, setBroadcastTitle] = useState('Broadcast Customer')
  const [broadcastTemplate, setBroadcastTemplate] = useState(DEFAULT_BROADCAST_TEMPLATE)
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [broadcastProgress, setBroadcastProgress] = useState({ running: false, total: 0, sent: 0, failed: 0 })
  const cancelBroadcastRef = useRef(false)

  const syncSettings = (data: any) => {
    setSettings({
      provider: data?.provider ?? 'fonnte',
      apiKey: data?.api_key ?? '',
      enabled: boolFromDb(data?.enabled),
      notifyOnSale: boolFromDb(data?.notify_on_sale, true),
      notifyOnReturn: boolFromDb(data?.notify_on_return, true),
      notifyOnLowStock: boolFromDb(data?.notify_on_low_stock),
      notifyOnPayment: boolFromDb(data?.notify_on_payment, true),
      messageTemplate: data?.message_template || DEFAULT_TEMPLATE,
      rateLimitPerMinute: Number(data?.rate_limit_per_minute ?? 20),
    })
  }

  useEffect(() => {
    api<any>('whatsapp:get').then(r => {
      if (r.success && r.data) syncSettings(r.data)
    })
    api<Customer[]>('customer:getAll').then(r => {
      if (r.success) setCustomers(r.data ?? [])
    })
    api<WhatsAppTemplate[]>('whatsapp:getTemplates').then(r => {
      if (r.success) {
        setTemplates(r.data ?? [])
        if (r.data?.[0]?.content) setBroadcastTemplate(r.data[0].content)
      }
    })
    api<BroadcastHistory[]>('whatsapp:getBroadcastHistory').then(r => {
      if (r.success) setHistory(r.data ?? [])
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
      message: 'Test notifikasi dari Zetass POS berhasil.',
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

  const renderBroadcastTemplate = (template: string, customer: Partial<Customer>) => (
    template
      .split('{{nama_customer}}').join(customer.nama_customer || 'Customer')
      .split('{{total_belanja}}').join(Number(customer.total_belanja ?? 0).toLocaleString('id-ID'))
      .split('{{poin_loyalty}}').join(Number(customer.poin ?? 0).toLocaleString('id-ID'))
  )

  const broadcastTargets = () => {
    if (targetMode === 'manual') {
      return manualTargets
        .split(/\r?\n|,/)
        .map((phone, index) => ({ kd_customer: `manual-${index}`, nama_customer: `Manual ${index + 1}`, no_telp: phone.trim(), total_belanja: 0, poin: 0 }))
        .filter(item => item.no_telp)
    }

    return customers.filter(customer => {
      if (!customer.no_telp) return false
      if (targetMode === 'active') return customer.status === 'Aktif'
      return true
    })
  }

  const saveCurrentTemplate = async () => {
    const r = await api<WhatsAppTemplate[]>('whatsapp:saveTemplate', {
      name: broadcastTitle || 'Template Broadcast',
      content: broadcastTemplate,
    })
    if (r.success) {
      setTemplates(r.data ?? [])
      toast('Template broadcast disimpan')
    } else {
      toast(r.message as string || 'Gagal menyimpan template', 'error')
    }
  }

  const refreshHistory = async () => {
    const r = await api<BroadcastHistory[]>('whatsapp:getBroadcastHistory')
    if (r.success) setHistory(r.data ?? [])
  }

  const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

  const sendBroadcast = async () => {
    if (!settings.apiKey.trim()) return toast('API key Fonnte belum diisi', 'error')
    const targets = broadcastTargets()
    if (targets.length === 0) return toast('Target broadcast kosong', 'error')
    if (!broadcastTemplate.trim()) return toast('Template pesan wajib diisi', 'error')

    if (scheduleMode === 'scheduled') {
      if (!scheduledAt) return toast('Pilih jadwal broadcast', 'error')
      const scheduledTime = new Date(scheduledAt).getTime()
      if (!Number.isFinite(scheduledTime) || scheduledTime <= Date.now()) return toast('Jadwal harus setelah waktu saat ini', 'error')
      await api('whatsapp:saveBroadcastHistory', {
        title: broadcastTitle,
        targetType: targetMode,
        totalTargets: targets.length,
        delivered: 0,
        failed: 0,
        scheduledAt: new Date(scheduledAt).toISOString(),
        status: 'scheduled',
      })
      await refreshHistory()
      toast('Broadcast dijadwalkan')
      return
    }

    cancelBroadcastRef.current = false
    setBroadcastProgress({ running: true, total: targets.length, sent: 0, failed: 0 })
    const delayMs = Math.ceil(60000 / Math.max(1, settings.rateLimitPerMinute))
    const detail: Array<{ phone: string; success: boolean; message?: string }> = []
    let sent = 0
    let failed = 0

    for (const target of targets) {
      if (cancelBroadcastRef.current) break
      const message = renderBroadcastTemplate(broadcastTemplate, target)
      const r = await api('whatsapp:test', {
        phone: target.no_telp,
        apiKey: settings.apiKey,
        message,
      })
      if (r.success) sent += 1
      else failed += 1
      detail.push({ phone: target.no_telp ?? '', success: r.success, message: r.message as string | undefined })
      setBroadcastProgress({ running: true, total: targets.length, sent, failed })
      if (sent + failed < targets.length) await wait(delayMs)
    }

    setBroadcastProgress({ running: false, total: targets.length, sent, failed })
    await api('whatsapp:saveBroadcastHistory', {
      title: broadcastTitle,
      targetType: targetMode,
      totalTargets: targets.length,
      delivered: sent,
      failed,
      sentAt: new Date().toISOString(),
      status: cancelBroadcastRef.current ? 'cancelled' : failed > 0 ? 'partial' : 'completed',
      detail,
    })
    await refreshHistory()
    toast(cancelBroadcastRef.current ? 'Broadcast dibatalkan' : `Broadcast selesai: ${sent} terkirim, ${failed} gagal`, failed > 0 ? 'error' : 'success')
  }

  const normalizedTestNumber = normalizePreview(testNumber)
  const activeCount = notificationItems.filter(item => settings[item.key]).length
  const targets = broadcastTargets()
  const previewTarget = targets[0] ?? { nama_customer: 'Customer', total_belanja: 0, poin: 0 }
  const progressPercent = broadcastProgress.total ? Math.round(((broadcastProgress.sent + broadcastProgress.failed) / broadcastProgress.total) * 100) : 0

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="space-y-5 select-none">
      
      {/* Header Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <MessageCircle className="text-emerald-500" size={26} />
              Integrasi WhatsApp Gateway
            </h1>
            <Badge label={settings.enabled ? 'Aktif' : 'Nonaktif'} variant={settings.enabled ? 'green' : 'gray'} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Kelola API Fonnte, struk WhatsApp otomatis ke customer, dan fitur blast broadcast.
          </p>
        </div>

        <div className="flex w-full sm:w-auto gap-2">
          <Button
            variant="secondary"
            onClick={() => setTestModal(true)}
            icon={<Send size={15} />}
            className="w-full sm:w-auto font-bold border-slate-200 dark:border-slate-800"
          >
            Pesan Test
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            icon={<CheckCircle size={15} />}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0 shadow-md shadow-red-600/20"
          >
            Simpan Konfigurasi
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          
          {/* Status Card */}
          <Card className={`rounded-3xl border ${settings.enabled ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-2.5 ${settings.enabled ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  {settings.enabled ? <CheckCircle size={22} /> : <XCircle size={22} />}
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                    Status WhatsApp Gateway {settings.enabled ? 'Aktif' : 'Nonaktif'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {settings.enabled ? `${activeCount} jenis notifikasi otomatis aktif` : 'Aktifkan stempel toggle di kanan jika API key sudah terisi'}
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
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                {lastTestMessage}
              </div>
            )}
          </Card>

          {/* API Configuration Card */}
          <Card title="Konfigurasi API Fonnte" subtitle="Token API disimpan dengan aman secara lokal di sistem aplikasi." className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">Provider Gateway</label>
                  <select
                    value={settings.provider}
                    onChange={e => setSettings(prev => ({ ...prev, provider: e.target.value as 'fonnte' }))}
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="fonnte">Fonnte WhatsApp API Gateway</option>
                  </select>
                </div>
                <Input
                  label="Rate Limit (Pesan / Menit)"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.rateLimitPerMinute}
                  onChange={e => setSettings(prev => ({ ...prev, rateLimitPerMinute: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">API Key / Token Fonnte</label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={e => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Masukkan API Key Fonnte..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => window.open('https://fonnte.com', '_blank')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Buka Situs Fonnte.com
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </Card>

          {/* Automatic Trigger Notifications */}
          <Card title="Notifikasi Otomatis POS" subtitle="Pengiriman otomatis sesuai event aplikasi" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              {notificationItems.map(item => (
                <div key={item.key} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-slate-900 dark:text-white">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 font-medium">{item.desc}</p>
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

          {/* Transaction Template */}
          <Card title="Template Struk Transaksi WhatsApp" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Textarea
              value={settings.messageTemplate}
              onChange={e => setSettings(prev => ({ ...prev, messageTemplate: e.target.value }))}
              rows={4}
              placeholder={DEFAULT_TEMPLATE}
              helperText="Variabel: {customer}, {total}, {invoice}"
            />
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
              {settings.messageTemplate || DEFAULT_TEMPLATE}
            </div>
          </Card>

          {/* Customer Broadcast */}
          <Card title="Fitur Broadcast Pesan Massal" subtitle="Kirim pesan promosi atau pemberitahuan ke member" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Judul Kampanye"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                />
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">Target Pelanggan</label>
                  <select
                    value={targetMode}
                    onChange={e => setTargetMode(e.target.value as typeof targetMode)}
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="active">Member Aktif</option>
                    <option value="all">Semua Member Toko</option>
                    <option value="manual">Manual Input HP</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">Waktu Pengiriman</label>
                  <select
                    value={scheduleMode}
                    onChange={e => setScheduleMode(e.target.value as typeof scheduleMode)}
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="now">Kirim Sekarang</option>
                    <option value="scheduled">Jadwalkan Jam</option>
                  </select>
                </div>
              </div>

              {targetMode === 'manual' && (
                <Textarea
                  value={manualTargets}
                  onChange={e => setManualTargets(e.target.value)}
                  rows={3}
                  placeholder="08123456789, 628123456789"
                  helperText="Pisahkan nomor dengan baris baru atau koma."
                />
              )}

              {scheduleMode === 'scheduled' && (
                <Input
                  label="Waktu Kirim"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                />
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">Template Broadcast</label>
                {templates.length > 0 && (
                  <select
                    className="mb-2 w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-red-600"
                    onChange={e => {
                      const selected = templates.find(item => String(item.id) === e.target.value)
                      if (selected) {
                        setBroadcastTitle(selected.name)
                        setBroadcastTemplate(selected.content)
                      }
                    }}
                  >
                    {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                )}
                <Textarea
                  value={broadcastTemplate}
                  onChange={e => setBroadcastTemplate(e.target.value)}
                  rows={4}
                  placeholder={DEFAULT_BROADCAST_TEMPLATE}
                  helperText="Variabel: {{nama_customer}}, {{total_belanja}}, {{poin_loyalty}}"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                {renderBroadcastTemplate(broadcastTemplate || DEFAULT_BROADCAST_TEMPLATE, previewTarget)}
              </div>

              {broadcastProgress.running && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-red-600 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-xs font-bold text-slate-500">{broadcastProgress.sent + broadcastProgress.failed}/{broadcastProgress.total} diproses · {broadcastProgress.sent} terkirim · {broadcastProgress.failed} gagal</p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={sendBroadcast} loading={broadcastProgress.running} icon={<Send size={16} />} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0 shadow-md shadow-red-600/20">
                  {scheduleMode === 'scheduled' ? 'Jadwalkan Broadcast' : 'Mulai Broadcast Sekarang'}
                </Button>
                <Button variant="secondary" onClick={saveCurrentTemplate} className="w-full sm:w-auto font-bold border-slate-200 dark:border-slate-800">
                  Simpan Template Ini
                </Button>
                {broadcastProgress.running && (
                  <Button variant="danger" onClick={() => { cancelBroadcastRef.current = true }} className="w-full sm:w-auto font-bold">
                    Hentikan Broadcast
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card title="Status Gateway" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-3 text-xs font-medium">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={18} className={settings.apiKey.trim() ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-slate-400'} />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Fonnte API Key</p>
                  <p className="text-slate-400 text-[11px]">{settings.apiKey.trim() ? 'Tersimpan & Terhubung' : 'Belum Diisi'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Bell size={18} className={settings.enabled ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-slate-400'} />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Status Notifikasi</p>
                  <p className="text-slate-400 text-[11px]">{settings.enabled ? 'Berjalan Otomatis' : 'Sistem Nonaktif'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap size={18} className={activeCount > 0 ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-slate-400'} />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Trigger Aktif</p>
                  <p className="text-slate-400 text-[11px]">{activeCount} dari {notificationItems.length} Event Aktif</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Catatan Format Nomor" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 text-xs text-amber-800 dark:text-amber-200 font-medium">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p>Nomor HP boleh ditulis dalam format 08..., +628..., atau 628.... Sistem akan memformat otomatis ke 628....</p>
            </div>
          </Card>

          <Card title="Riwayat Broadcast" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {history.length === 0 ? (
                <p className="text-slate-400 font-bold text-center py-6">Belum ada riwayat broadcast</p>
              ) : history.slice(0, 10).map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.delivered}/{item.total_targets} terkirim · {item.failed} gagal</p>
                    </div>
                    <Badge label={item.status} variant={item.status === 'completed' ? 'green' : item.status === 'scheduled' ? 'blue' : item.failed > 0 ? 'red' : 'gray'} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 font-mono">{new Date(item.created_at).toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Test Message Modal */}
      <Modal
        open={testModal}
        onClose={() => setTestModal(false)}
        title="Kirim Pesan Test WhatsApp"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTestModal(false)} className="w-full sm:w-auto font-bold">Batal</Button>
            <Button onClick={handleTest} loading={testing} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0">Kirim Test</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nomor HP Target *"
            value={testNumber}
            onChange={e => setTestNumber(e.target.value)}
            placeholder="08123456789"
            helperText={normalizedTestNumber ? `Akan dikirim ke +${normalizedTestNumber}` : 'Contoh: 08123456789'}
          />
        </div>
      </Modal>
    </div>
  )
}
