import { useEffect, useState } from 'react'
import { toDataURL } from 'qrcode'
import { Sun, Moon, Palette, Store, Receipt, Barcode, Printer, Database, Bell, AlertTriangle, Server, RefreshCw, Wifi, Bot, FileSpreadsheet, KeyRound, QrCode, Copy, CheckCircle2, Code2, ExternalLink } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { useTheme, type ThemeColor } from '../contexts/ThemeContext'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { playDangerSound, playWarningSound } from '../utils/sound'
import { DEFAULT_INDUSTRY_SETTINGS, defaultBaseUrlForProvider, defaultModelForProvider, normalizeIndustrySettings, type AiProvider, type IndustrySettings } from '../../shared/industrySettings'
import type { Identitas } from '../../shared/types'
import { normalizeSyncServerUrl } from '../../shared/endpointSecurity'
import { GOOGLE_SHEETS_APPS_SCRIPT } from '../../shared/googleSheetsAppsScript'
import { appConfig } from '../utils/productionConfig'

const COLORS: { key: ThemeColor; label: string; hex: string }[] = [
  { key: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { key: 'emerald', label: 'Emerald', hex: '#10b981' },
  { key: 'rose', label: 'Rose', hex: '#f43f5e' },
  { key: 'amber', label: 'Amber', hex: '#f59e0b' },
  { key: 'sky', label: 'Sky', hex: '#0ea5e9' },
  { key: 'pink', label: 'Pink Soft', hex: '#ec4899' },
]

type SyncMode = 'server' | 'client'

export default function Settings() {
  const { color, mode, setColor, setMode } = useTheme()
  const toast = useToast()
  const [identitas, setIdentitas] = useState<Partial<Identitas>>({})
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncForm, setSyncForm] = useState({ enabled: false, mode: 'server' as SyncMode, port: '38573', baseUrl: '', token: '', deviceName: '' })
  const [syncQr, setSyncQr] = useState('')
  const [pairingText, setPairingText] = useState('')
  const [industrySettings, setIndustrySettings] = useState<IndustrySettings>(DEFAULT_INDUSTRY_SETTINGS)
  const [industryLoading, setIndustryLoading] = useState(false)
  const [testingSheets, setTestingSheets] = useState(false)
  const [testingAi, setTestingAi] = useState(false)
  const [loadingAiModels, setLoadingAiModels] = useState(false)
  const [aiModels, setAiModels] = useState<string[]>([])
  const [syncLoading, setSyncLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    api<Identitas>('identitas:get').then(r => {
      if (r.success && r.data) setIdentitas(r.data)
    })
    loadSyncStatus()
    loadIndustrySettings()
  }, [])

  const loadSyncStatus = async () => {
    const r = await api<any>('sync:getStatus')
    if (!r.success || !r.data) return

    setSyncStatus(r.data)
    if (r.data.mode === 'android-client') {
      setSyncForm({
        enabled: Boolean(r.data.client?.enabled),
        mode: 'client',
        port: '38573',
        baseUrl: r.data.client?.baseUrl ?? '',
        token: r.data.client?.token ?? '',
        deviceName: '',
      })
    } else if (r.data.client?.enabled) {
      setSyncForm({
        enabled: Boolean(r.data.client?.enabled),
        mode: 'client',
        port: String(r.data.port ?? 38573),
        baseUrl: r.data.client?.baseUrl ?? '',
        token: r.data.client?.token ?? '',
        deviceName: r.data.client?.deviceName ?? '',
      })
    } else {
      setSyncForm({
        enabled: Boolean(r.data.enabled),
        mode: 'server',
        port: String(r.data.port ?? 38573),
        baseUrl: r.data.urls?.[1] ?? r.data.urls?.[0] ?? '',
        token: r.data.token ?? '',
        deviceName: r.data.client?.deviceName ?? '',
      })
    }
  }

  const saveIdentitas = async () => {
    setLoading(true)
    const r = await api('identitas:save', identitas)
    setLoading(false)
    if (r.success) toast(r.message as string)
    else toast(r.message as string, 'error')
  }

  const isAndroidSyncClient = syncStatus?.mode === 'android-client'
  const isSyncClient = isAndroidSyncClient || syncForm.mode === 'client'

  const getSyncPairingPayload = () => {
    const baseUrl = syncForm.baseUrl || (syncStatus?.urls ?? []).find((url: string) => !url.includes('127.0.0.1')) || syncStatus?.urls?.[0] || ''
    return JSON.stringify({
      type: 'mediasoft-pos-zetass-sync',
      app: 'MediaSoft POS Zetass v2.0',
      baseUrl,
      token: syncForm.token,
      generatedAt: new Date().toISOString(),
    })
  }

  useEffect(() => {
    if (isSyncClient || !syncForm.token || !(syncStatus?.urls ?? []).length) {
      setSyncQr('')
      return
    }

    let cancelled = false
    toDataURL(getSyncPairingPayload(), { width: 180, margin: 1, errorCorrectionLevel: 'M' })
      .then(url => {
        if (!cancelled) setSyncQr(url)
      })
      .catch(() => {
        if (!cancelled) setSyncQr('')
      })

    return () => {
      cancelled = true
    }
  }, [isSyncClient, syncForm.token, syncForm.baseUrl, syncStatus?.urls])

  const loadIndustrySettings = async () => {
    const r = await api<IndustrySettings>('integrations:get')
    if (r.success && r.data) setIndustrySettings(normalizeIndustrySettings(r.data))
  }

  const saveIndustrySettings = async () => {
    if (industrySettings.aiEnabled && industrySettings.aiProvider !== 'local') {
      setTestingAi(true)
      const test = await api('integrations:testAi', industrySettings)
      setTestingAi(false)
      if (!test.success) {
        toast(test.message as string || 'Koneksi AI gagal. Periksa provider, base URL, model, dan API key.', 'error')
        return
      }
    }

    setIndustryLoading(true)
    const r = await api<IndustrySettings>('integrations:save', industrySettings)
    setIndustryLoading(false)
    if (r.success && r.data) {
      setIndustrySettings(normalizeIndustrySettings(r.data))
      toast('Pengaturan industri disimpan', 'success')
    } else {
      toast(r.message as string || 'Gagal menyimpan pengaturan industri', 'error')
    }
  }

  const changeIndustrySetting = <K extends keyof IndustrySettings>(key: K, value: IndustrySettings[K]) => {
    setIndustrySettings(prev => ({ ...prev, [key]: value }))
  }

  const changeAiProvider = (provider: AiProvider) => {
    setAiModels([])
    setIndustrySettings(prev => ({
      ...prev,
      aiProvider: provider,
      aiModel: defaultModelForProvider(provider) || prev.aiModel,
      aiBaseUrl: provider === 'openai'
        ? (appConfig.aiProviderUrl || defaultBaseUrlForProvider(provider))
        : defaultBaseUrlForProvider(provider),
    }))
  }

  const loadAiModels = async () => {
    if (!industrySettings.aiEnabled || industrySettings.aiProvider === 'local') {
      toast('Aktifkan AI online dan pilih provider terlebih dahulu', 'error')
      return
    }
    if (industrySettings.aiProvider === 'gemini') {
      toast('Daftar model otomatis saat ini hanya untuk provider OpenAI-compatible', 'error')
      return
    }

    setLoadingAiModels(true)
    const r = await api<string[]>('integrations:listAiModels', industrySettings)
    setLoadingAiModels(false)
    if (r.success) {
      const models = r.data ?? []
      setAiModels(models)
      if (!industrySettings.aiModel && models[0]) changeIndustrySetting('aiModel', models[0])
      toast(r.message as string || 'Daftar model dimuat', 'success')
    } else {
      toast(r.message as string || 'Gagal memuat daftar model', 'error')
    }
  }

  const testAiConnection = async () => {
    if (!industrySettings.aiEnabled || industrySettings.aiProvider === 'local') {
      toast('Aktifkan AI online dan pilih provider terlebih dahulu', 'error')
      return
    }

    setTestingAi(true)
    const r = await api('integrations:testAi', industrySettings)
    setTestingAi(false)
    toast(r.message as string || (r.success ? 'Koneksi AI berhasil' : 'Koneksi AI gagal'), r.success ? 'success' : 'error')
  }

  const testGoogleSheets = async () => {
    setTestingSheets(true)
    const r = await api('integrations:testGoogleSheets')
    setTestingSheets(false)
    toast(r.message as string || (r.success ? 'Google Sheets tersambung' : 'Google Sheets gagal'), r.success ? 'success' : 'error')
  }

  const copyGoogleSheetsScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_SHEETS_APPS_SCRIPT)
      toast('Template Apps Script disalin', 'success')
    } catch {
      toast('Clipboard tidak tersedia', 'error')
    }
  }

  const openAppsScript = () => {
    api('app:openExternal', 'https://script.google.com/home').catch(() => {
      window.open('https://script.google.com/home', '_blank', 'noopener,noreferrer')
    })
  }

  const copyPairingData = async () => {
    try {
      await navigator.clipboard.writeText(getSyncPairingPayload())
      toast('Data pairing disalin', 'success')
    } catch {
      toast('Clipboard tidak tersedia', 'error')
    }
  }

  const applyPairingData = () => {
    try {
      const data = JSON.parse(pairingText)
      if (data?.type !== 'mediasoft-pos-zetass-sync' || !data.baseUrl || !data.token) {
        throw new Error('Format pairing tidak valid')
      }
      const url = normalizeSyncServerUrl(String(data.baseUrl))
      if (!url.valid || !url.url) throw new Error(url.message ?? 'URL pairing tidak valid')
      setSyncForm(prev => ({
        ...prev,
        enabled: true,
        baseUrl: url.url!,
        token: String(data.token),
      }))
      toast('Data pairing diterapkan. Tekan Simpan lalu Tes.', 'success')
      setPairingText('')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Format pairing tidak valid', 'error')
    }
  }

  const saveSync = async () => {
    if (isSyncClient && syncForm.enabled) {
      const url = normalizeSyncServerUrl(syncForm.baseUrl)
      if (!url.valid || !url.url) {
        toast(url.message as string || 'URL sinkronisasi tidak valid', 'error')
        return
      }
      setSyncForm(prev => ({ ...prev, baseUrl: url.url! }))
    }
    setSyncLoading(true)
    const payload = isSyncClient
      ? { enabled: syncForm.enabled, baseUrl: syncForm.baseUrl, token: syncForm.token, deviceName: syncForm.deviceName }
      : { enabled: syncForm.enabled, port: parseInt(syncForm.port, 10), token: syncForm.token }
    const channel = isAndroidSyncClient || !isSyncClient ? 'sync:saveConfig' : 'sync:saveClientConfig'
    const r = await api<any>(channel, payload)
    setSyncLoading(false)
    if (r.success) {
      toast(r.message as string || 'Sinkronisasi disimpan', 'success')
      await loadSyncStatus()
    } else {
      toast(r.message as string || 'Gagal menyimpan sinkronisasi', 'error')
    }
  }

  const testSync = async () => {
    if (isSyncClient) {
      const url = normalizeSyncServerUrl(syncForm.baseUrl)
      if (!url.valid || !url.url) {
        toast(url.message as string || 'URL sinkronisasi tidak valid', 'error')
        return
      }
    }
    setSyncLoading(true)
    const channel = isAndroidSyncClient
      ? 'sync:testConnection'
      : isSyncClient
        ? 'sync:testClientConnection'
        : 'sync:testConnection'
    const payload = isSyncClient ? { baseUrl: syncForm.baseUrl, token: syncForm.token, deviceName: syncForm.deviceName } : undefined
    const r = await api<any>(channel, payload)
    setSyncLoading(false)
    if (r.success) {
      toast(r.message as string || 'Sinkronisasi tersambung', 'success')
      await loadSyncStatus()
    } else {
      toast(r.message as string || 'Sinkronisasi gagal', 'error')
    }
  }

  const rotateSyncToken = async () => {
    setSyncLoading(true)
    const r = await api<any>('sync:rotateToken')
    setSyncLoading(false)
    if (r.success) {
      toast(r.message as string || 'Token diganti', 'success')
      await loadSyncStatus()
    } else {
      toast(r.message as string || 'Gagal mengganti token', 'error')
    }
  }

  const openResetDialog = () => {
    playWarningSound()
    setConfirmReset(true)
    setConfirmText('')
  }

  const handleReset = async () => {
    if (confirmText !== 'RESET SEMUA DATA') {
      playDangerSound()
      toast('Ketik "RESET SEMUA DATA" untuk konfirmasi', 'error')
      return
    }

    playDangerSound()
    setResetting(true)
    const r = await api('system:resetData')
    setResetting(false)
    if (r.success) {
      toast('Semua data berhasil direset!', 'success')
      setConfirmReset(false)
      setTimeout(() => window.location.reload(), 1500)
    } else {
      toast(r.message as string || 'Gagal reset data', 'error')
    }
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

        <Card title="Asisten AI & Google Sheets" action={<Bot size={16} className={industrySettings.aiEnabled ? 'text-emerald-500' : 'text-slate-400'} />}>
          <div className="space-y-4 mt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">AI Online Opsional</p>
                <p className="text-xs text-slate-400 mt-0.5">Fallback lokal tetap aktif saat API tidak tersedia</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={industrySettings.aiEnabled}
                  onChange={e => changeIndustrySetting('aiEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Provider AI</label>
                <select
                  value={industrySettings.aiProvider}
                  onChange={e => changeAiProvider(e.target.value as AiProvider)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="local">Lokal gratis</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="custom">Custom OpenAI-Compatible</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="bluesminds">BluesMinds</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Model</label>
                <div className="flex gap-2">
                  {aiModels.length > 0 ? (
                    <select
                      value={industrySettings.aiModel}
                      onChange={e => changeIndustrySetting('aiModel', e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {aiModels.map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                  ) : (
                    <input
                      value={industrySettings.aiModel}
                      onChange={e => changeIndustrySetting('aiModel', e.target.value)}
                      placeholder={defaultModelForProvider(industrySettings.aiProvider) || 'nama-model'}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-all duration-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  )}
                  {industrySettings.aiProvider !== 'local' && industrySettings.aiProvider !== 'gemini' && (
                    <Button type="button" variant="secondary" loading={loadingAiModels} onClick={loadAiModels} icon={<RefreshCw size={14} />} className="shrink-0">
                      Model
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {industrySettings.aiProvider !== 'local' && (
              <>
                <Input
                  label="API Key AI"
                  type="password"
                  value={industrySettings.aiApiKey}
                  onChange={e => changeIndustrySetting('aiApiKey', e.target.value)}
                  placeholder="Masukkan API key provider"
                  icon={<KeyRound size={16} />}
                />
                <Input
                  label="Base URL"
                  value={industrySettings.aiBaseUrl}
                  onChange={e => changeIndustrySetting('aiBaseUrl', e.target.value)}
                  placeholder={industrySettings.aiProvider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' : appConfig.aiProviderUrl || defaultBaseUrlForProvider(industrySettings.aiProvider)}
                  helperText={industrySettings.aiProvider === 'bluesminds' ? 'Gunakan https://api.bluesminds.com/v1. Chat memakai /v1/chat/completions dan model memakai /v1beta/models.' : undefined}
                />
              </>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Export Google Sheets Otomatis</p>
                  <p className="text-xs text-slate-400 mt-0.5">Gunakan URL Web App Apps Script</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={industrySettings.googleSheetsEnabled}
                    onChange={e => changeIndustrySetting('googleSheetsEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <Input
                label="Apps Script Web App URL"
                value={industrySettings.googleSheetsWebAppUrl}
                onChange={e => changeIndustrySetting('googleSheetsWebAppUrl', e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                icon={<FileSpreadsheet size={16} />}
                helperText="Buat script dari file Google Sheets target, deploy sebagai Web App, lalu tempel URL /exec di sini."
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="secondary" onClick={copyGoogleSheetsScript} icon={<Code2 size={14} />} className="w-full sm:w-auto">
                  Salin Template Script
                </Button>
                <Button type="button" variant="ghost" onClick={openAppsScript} icon={<ExternalLink size={14} />} className="w-full sm:w-auto">
                  Buka Apps Script
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Backup Otomatis Produksi</p>
                  <p className="text-xs text-slate-400 mt-0.5">Dipakai scheduler harian desktop</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={industrySettings.autoBackupEnabled}
                    onChange={e => changeIndustrySetting('autoBackupEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <Input
                label="Retensi Backup (hari)"
                type="number"
                min={1}
                max={365}
                value={industrySettings.backupRetentionDays}
                onChange={e => changeIndustrySetting('backupRetentionDays', Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="secondary" loading={testingSheets} onClick={testGoogleSheets} icon={<CheckCircle2 size={14} />} className="w-full sm:w-auto">
                Tes Google Sheets
              </Button>
              <Button variant="secondary" loading={testingAi} onClick={testAiConnection} icon={<Bot size={14} />} className="w-full sm:w-auto">
                Tes AI
              </Button>
              <Button loading={industryLoading} onClick={saveIndustrySettings} className="w-full sm:w-auto">
                Simpan Integrasi
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Sinkronisasi Multi-Device" action={<Server size={16} className={syncStatus?.running || syncForm.enabled ? 'text-emerald-500' : 'text-slate-400'} />}>
          <div className="space-y-4 mt-1">
            {!isAndroidSyncClient && (
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setSyncForm(prev => ({
                    ...prev,
                    mode: 'server',
                    enabled: Boolean(syncStatus?.enabled),
                    baseUrl: syncStatus?.urls?.[1] ?? syncStatus?.urls?.[0] ?? prev.baseUrl,
                    token: syncStatus?.token ?? prev.token,
                  }))}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    syncForm.mode === 'server'
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Server Developer
                </button>
                <button
                  type="button"
                  onClick={() => setSyncForm(prev => ({
                    ...prev,
                    mode: 'client',
                    enabled: Boolean(syncStatus?.client?.enabled),
                    baseUrl: syncStatus?.client?.baseUrl ?? '',
                    token: syncStatus?.client?.token ?? '',
                    deviceName: syncStatus?.client?.deviceName ?? prev.deviceName,
                  }))}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    syncForm.mode === 'client'
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Client Device
                </button>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {isSyncClient ? 'Mode Client ke Server Developer' : 'Server Developer Pusat'}
                </p>
                <p className={`text-xs mt-0.5 ${syncStatus?.running || syncForm.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {isSyncClient
                    ? (syncForm.enabled ? 'Aktif' : 'Offline lokal')
                    : (syncStatus?.running ? 'Aktif' : 'Nonaktif')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncForm.enabled}
                  onChange={e => setSyncForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {isSyncClient ? (
              <>
                {!isAndroidSyncClient && (
                  <Input
                    label="Nama Device"
                    value={syncForm.deviceName}
                    onChange={e => setSyncForm(prev => ({ ...prev, deviceName: e.target.value }))}
                    placeholder="Kasir Windows 1"
                  />
                )}
                <Input
                  label="URL Server Developer"
                  value={syncForm.baseUrl}
                  onChange={e => setSyncForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="http://192.168.1.10:38573"
                  icon={<Wifi size={16} />}
                  helperText="Bisa HTTP untuk IP LAN privat, atau HTTPS untuk domain produksi."
                />
                <Input
                  label="Token"
                  value={syncForm.token}
                  onChange={e => setSyncForm(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="Token dari server developer"
                />
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data Pairing QR</label>
                  <textarea
                    value={pairingText}
                    onChange={e => setPairingText(e.target.value)}
                    placeholder="Tempel data pairing dari QR desktop"
                    className="w-full min-h-[90px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                  <Button type="button" variant="secondary" onClick={applyPairingData} icon={<QrCode size={14} />} className="w-full">
                    Terapkan Pairing
                  </Button>
                </div>
                {syncStatus?.client?.lastConnectedAt && (
                  <p className="text-xs text-slate-400">Terakhir tersambung: {new Date(syncStatus.client.lastConnectedAt).toLocaleString('id-ID')}</p>
                )}
                {syncStatus?.client?.lastError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                    {syncStatus.client.lastError}
                  </div>
                )}
              </>
            ) : (
              <>
                <Input
                  label="Port"
                  type="number"
                  value={syncForm.port}
                  onChange={e => setSyncForm(prev => ({ ...prev, port: e.target.value }))}
                />
                <Input
                  label="Token"
                  value={syncForm.token}
                  onChange={e => setSyncForm(prev => ({ ...prev, token: e.target.value }))}
                />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">URL Server Developer</p>
                  {(syncStatus?.urls ?? []).map((url: string) => (
                    <div key={url} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {url}
                    </div>
                  ))}
                </div>
                {syncQr && (
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <img src={syncQr} alt="QR pairing sinkronisasi" className="w-[180px] h-[180px] rounded-lg bg-white p-2" />
                    <div className="flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">QR Pairing Device</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          QR berisi URL desktop dan token sinkronisasi. Simpan token ini seperti password.
                        </p>
                      </div>
                      <Button type="button" variant="secondary" onClick={copyPairingData} icon={<Copy size={14} />} className="w-full sm:w-auto">
                        Salin Data Pairing
                      </Button>
                    </div>
                  </div>
                )}
                {syncStatus?.lastRequestAt && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                    Request terakhir: {syncStatus.lastChannel || '-'} pada {new Date(syncStatus.lastRequestAt).toLocaleString('id-ID')} ({syncStatus.requestCount || 0} request)
                  </div>
                )}
                {(syncStatus?.devices ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Device Terhubung</p>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {(syncStatus.devices ?? []).map((device: any) => (
                        <div key={device.deviceId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-700 dark:text-slate-200">{device.deviceName || 'Device POS'}</p>
                              <p className="mt-0.5 truncate text-slate-400">{device.address || '-'} - {device.lastChannel || '-'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              {device.requestCount || 0} req
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400">Terakhir: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('id-ID') : '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {syncStatus?.error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                    {syncStatus.error}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button loading={syncLoading} onClick={saveSync} className="w-full sm:w-auto">Simpan Sinkronisasi</Button>
              <Button variant="secondary" loading={syncLoading} onClick={testSync} icon={<RefreshCw size={14} />} className="w-full sm:w-auto">Tes</Button>
              {!isAndroidSyncClient && !isSyncClient && (
                <Button variant="secondary" loading={syncLoading} onClick={rotateSyncToken} className="w-full sm:w-auto">Ganti Token</Button>
              )}
            </div>
          </div>
        </Card>

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

        {/* Reset Data - Danger Zone */}
        <Card title="Zona Berbahaya" action={<AlertTriangle size={16} className="text-red-500" />}>
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-700 dark:text-red-400 mb-1">Reset Semua Data</h3>
                <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
                  Menghapus <strong>SEMUA</strong> data transaksi, produk, customer, supplier, dan pengaturan. 
                  Tindakan ini <strong>TIDAK DAPAT DIBATALKAN</strong>!
                </p>
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-red-600 dark:text-red-400 mb-4 pl-2 border-l-2 border-red-300 dark:border-red-700">
              <p>✗ Semua transaksi penjualan & pembelian</p>
              <p>✗ Semua data produk & stok</p>
              <p>✗ Semua data customer & supplier</p>
              <p>✗ Semua data kas & shift</p>
              <p>✗ Riwayat backup & activity log</p>
            </div>

            <Button 
              variant="danger" 
              onClick={openResetDialog}
              className="w-full"
            >
              <AlertTriangle size={16} />
              Reset Semua Data
            </Button>
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-400 text-center lg:col-span-2">MediaSoft POS v2.0.0 — Preferensi tema disimpan otomatis</p>

      {/* Confirm Reset Dialog */}
      <Modal
        open={confirmReset}
        onClose={() => {
          setConfirmReset(false)
          setConfirmText('')
        }}
        title="🚨 PERINGATAN KERAS - ZONA BERBAHAYA!"
        size="lg"
      >
        <div className="space-y-4">
          {/* Warning Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle size={32} className="shrink-0" />
              <div>
                <p className="font-bold text-lg">TINDAKAN TIDAK DAPAT DIBATALKAN!</p>
                <p className="text-sm opacity-90">Semua data akan dihapus permanen</p>
              </div>
            </div>
          </div>

          {/* Data yang akan dihapus */}
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
            <p className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <Database size={18} />
              Data yang akan DIHAPUS PERMANEN:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Transaksi Penjualan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Transaksi Pembelian</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Data Produk & Stok</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Data Customer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Data Supplier</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Data Kas & Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Hutang & Piutang</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                <span>Backup & Activity Log</span>
              </div>
            </div>
          </div>

          {/* Data yang tetap tersimpan */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>✓ Data yang TETAP tersimpan:</strong> User & Identitas Toko
            </p>
          </div>

          {/* Konfirmasi Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Ketik <span className="text-red-600 dark:text-red-400 font-mono bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">RESET SEMUA DATA</span> untuk konfirmasi:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik: RESET SEMUA DATA"
              className="w-full px-4 py-3 rounded-xl border-2 border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              autoFocus
            />
            {confirmText && confirmText !== 'RESET SEMUA DATA' && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                Teks tidak sesuai! Harus persis: RESET SEMUA DATA
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmReset(false)
                setConfirmText('')
              }}
              className="flex-1"
              disabled={resetting}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleReset}
              loading={resetting}
              disabled={confirmText !== 'RESET SEMUA DATA'}
              className="flex-1"
            >
              <AlertTriangle size={16} />
              {resetting ? 'Menghapus...' : 'Ya, Reset Semua Data'}
            </Button>
          </div>

          {/* Final Warning */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            Pastikan Anda sudah backup data sebelum melanjutkan
          </div>
        </div>
      </Modal>
    </div>
  )
}
