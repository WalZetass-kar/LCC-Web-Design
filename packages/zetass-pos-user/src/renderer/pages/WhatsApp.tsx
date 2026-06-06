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
      message: 'Test notifikasi dari Zetass Pos berhasil.',
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-label mb-2 block">Gateway</label>
                  <select
                    value={settings.provider}
                    onChange={e => setSettings(prev => ({ ...prev, provider: e.target.value as 'fonnte' }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="fonnte">Fonnte</option>
                  </select>
                </div>
                <Input
                  label="Maksimal Pesan per Menit"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.rateLimitPerMinute}
                  onChange={e => setSettings(prev => ({ ...prev, rateLimitPerMinute: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-label mb-2 block">API Key / Token Fonnte</label>
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

          <Card title="Broadcast Customer">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Judul"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                />
                <div>
                  <label className="text-label mb-2 block">Target</label>
                  <select
                    value={targetMode}
                    onChange={e => setTargetMode(e.target.value as typeof targetMode)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="active">Customer aktif</option>
                    <option value="all">Semua customer</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-2 block">Jadwal</label>
                  <select
                    value={scheduleMode}
                    onChange={e => setScheduleMode(e.target.value as typeof scheduleMode)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="now">Kirim sekarang</option>
                    <option value="scheduled">Jadwalkan</option>
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
                <label className="text-label mb-2 block">Template Broadcast</label>
                {templates.length > 0 && (
                  <select
                    className="mb-2 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
                  rows={5}
                  placeholder={DEFAULT_BROADCAST_TEMPLATE}
                  helperText="Variabel: {{nama_customer}}, {{total_belanja}}, {{poin_loyalty}}"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {renderBroadcastTemplate(broadcastTemplate || DEFAULT_BROADCAST_TEMPLATE, previewTarget)}
              </div>

              {broadcastProgress.running && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full bg-primary-600 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-xs text-slate-500">{broadcastProgress.sent + broadcastProgress.failed}/{broadcastProgress.total} diproses · {broadcastProgress.sent} terkirim · {broadcastProgress.failed} gagal</p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={sendBroadcast} loading={broadcastProgress.running} icon={<Send size={16} />} className="w-full sm:w-auto">
                  {scheduleMode === 'scheduled' ? 'Jadwalkan' : 'Kirim Broadcast'}
                </Button>
                <Button variant="secondary" onClick={saveCurrentTemplate} className="w-full sm:w-auto">
                  Simpan Template
                </Button>
                {broadcastProgress.running && (
                  <Button variant="danger" onClick={() => { cancelBroadcastRef.current = true }} className="w-full sm:w-auto">
                    Batalkan
                  </Button>
                )}
              </div>
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

          <Card title="History Broadcast">
            <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {history.length === 0 ? (
                <p className="text-caption">Belum ada history broadcast</p>
              ) : history.slice(0, 10).map(item => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.delivered}/{item.total_targets} delivered · {item.failed} failed</p>
                    </div>
                    <Badge label={item.status} variant={item.status === 'completed' ? 'green' : item.status === 'scheduled' ? 'blue' : item.failed > 0 ? 'red' : 'gray'} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString('id-ID')}</p>
                </div>
              ))}
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
