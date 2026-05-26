import { useState, useEffect } from 'react'
import { Globe, Key, Copy, Check, AlertTriangle, RefreshCw, Code, CreditCard, MessageCircle } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { useToast } from '../contexts/ToastContext'
import { api } from '../utils/api'
import { normalizeHttpsUrl } from '../../shared/endpointSecurity'
import { appConfig, validateProductionConfig } from '../utils/productionConfig'
import type { SubscriptionPlan } from '../../shared/types'

interface ApiConfig {
  apiKey: string
  apiSecret: string
  webhookUrl: string
  enabled: boolean
  whatsappNumber: string
  paymentLink: string
  autoActivate: boolean
  activationPlanId: number | null
  paymentGateway: {
    provider: string
    serverKey: string
    clientKey: string
    isProduction: boolean
    enabled: boolean
  }
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/api/v1/products', description: 'Daftar semua produk' },
  { method: 'GET', path: '/api/v1/products/:id', description: 'Detail produk' },
  { method: 'GET', path: '/api/v1/categories', description: 'Daftar kategori' },
  { method: 'GET', path: '/api/v1/customers', description: 'Daftar customer' },
  { method: 'POST', path: '/api/v1/orders', description: 'Buat pesanan baru' },
  { method: 'GET', path: '/api/v1/orders', description: 'Daftar pesanan' },
  { method: 'GET', path: '/api/v1/orders/:id', description: 'Detail pesanan' },
  { method: 'POST', path: '/api/v1/sync', description: 'Sinkronisasi data' },
  { method: 'GET', path: '/api/v1/inventory', description: 'Stok inventaris' },
  { method: 'POST', path: '/api/v1/webhook', description: 'Register webhook' },
]

export default function EcommerceApi() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<ApiConfig>({
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    enabled: false,
    whatsappNumber: '',
    paymentLink: '',
    autoActivate: false,
    activationPlanId: null,
    paymentGateway: {
      provider: 'midtrans',
      serverKey: '',
      clientKey: '',
      isProduction: false,
      enabled: false,
    },
  })
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [showSecret, setShowSecret] = useState(false)
  const [generatedKey, setGeneratedKey] = useState('')
  const [keyModal, setKeyModal] = useState(false)
  const [endpointError, setEndpointError] = useState('')
  const apiBaseUrl = appConfig.apiBaseUrl?.trim() || ''

  useEffect(() => {
    api<any>('ecommerce:get').then(r => {
      if (r.success && r.data) {
        setConfig(r.data)
      }
    })
    api<SubscriptionPlan[]>('plan:getActive').then(r => {
      if (r.success) setPlans(r.data ?? [])
    })
  }, [])

  const handleSave = async () => {
    setEndpointError('')
    let payload = config
    if (config.webhookUrl.trim()) {
      const webhook = normalizeHttpsUrl(config.webhookUrl)
      if (!webhook.valid || !webhook.url) {
        setEndpointError(webhook.message ?? 'Webhook URL tidak valid')
        toast(webhook.message as string, 'error')
        return
      }
      payload = { ...config, webhookUrl: webhook.url }
      setConfig(payload)
    }
    if (config.paymentLink.trim()) {
      const paymentLink = normalizeHttpsUrl(config.paymentLink)
      if (!paymentLink.valid || !paymentLink.url) {
        setEndpointError(paymentLink.message ?? 'Payment link tidak valid')
        toast(paymentLink.message as string, 'error')
        return
      }
      payload = { ...payload, paymentLink: paymentLink.url }
      setConfig(payload)
    }

    const productionConfig = validateProductionConfig()
    if (!productionConfig.valid) {
      setEndpointError(productionConfig.message ?? 'Konfigurasi production belum valid')
      toast(productionConfig.message as string, 'error')
      return
    }

    setLoading(true)
    const r = await api('ecommerce:save', payload)
    setLoading(false)
    if (r.success) toast('Konfigurasi API berhasil disimpan')
    else toast(r.message as string ?? 'Gagal menyimpan', 'error')
  }

  const regenerateKey = async () => {
    const newKey = 'msp_' + crypto.randomUUID().replace(/-/g, '')
    const newConfig = { ...config, apiKey: newKey }
    setConfig(newConfig)
    setGeneratedKey(newKey)
    setKeyModal(true)
    await api('ecommerce:save', newConfig)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast('Berhasil disalin ke clipboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="text-primary-500" size={28} />
            E-commerce API
          </h1>
          <p className="text-slate-600 dark:text-slate-400">API untuk integrasi dengan website dan sistem lain</p>
        </div>
        <Button onClick={handleSave} loading={loading} className="w-full sm:w-auto">
          Simpan Konfigurasi
        </Button>
      </div>

      {/* Status */}
      <Card className={config.enabled ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-slate-50 dark:bg-slate-800/50'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.enabled ? <Check className="text-green-500 w-8 h-8" /> : <AlertTriangle className="text-slate-400 w-8 h-8" />}
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">API Status: {config.enabled ? 'Aktif' : 'Nonaktif'}</p>
              <p className="text-sm text-slate-500">{config.enabled ? 'Siap menerima request' : 'API dinonaktifkan'}</p>
            </div>
          </div>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`w-14 h-8 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
          >
            <div className={`w-7 h-7 bg-white rounded-full shadow transform transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      <Card title="Payment Gateway & Aktivasi">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-start gap-3">
              <CreditCard className="text-primary-500 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Payment Gateway</p>
                <p className="text-sm text-slate-500">Midtrans/webhook pembayaran untuk aktivasi akun otomatis</p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, paymentGateway: { ...config.paymentGateway, enabled: !config.paymentGateway.enabled } })}
              className={`w-14 h-8 rounded-full transition-colors ${config.paymentGateway.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`w-7 h-7 bg-white rounded-full shadow transform transition-transform ${config.paymentGateway.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Provider</label>
              <select
                value={config.paymentGateway.provider}
                onChange={e => setConfig({ ...config, paymentGateway: { ...config.paymentGateway, provider: e.target.value } })}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="midtrans">Midtrans</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 w-full">
                <input
                  type="checkbox"
                  checked={config.paymentGateway.isProduction}
                  onChange={e => setConfig({ ...config, paymentGateway: { ...config.paymentGateway, isProduction: e.target.checked } })}
                  className="w-4 h-4 rounded accent-primary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Production mode</span>
              </label>
            </div>
            <Input
              label="Server Key"
              type={showSecret ? 'text' : 'password'}
              value={config.paymentGateway.serverKey}
              onChange={e => setConfig({ ...config, paymentGateway: { ...config.paymentGateway, serverKey: e.target.value } })}
            />
            <Input
              label="Client Key"
              value={config.paymentGateway.clientKey}
              onChange={e => setConfig({ ...config, paymentGateway: { ...config.paymentGateway, clientKey: e.target.value } })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="WhatsApp Pembayaran"
              value={config.whatsappNumber}
              onChange={e => setConfig({ ...config, whatsappNumber: e.target.value })}
              placeholder="62812xxxx"
            />
            <Input
              label="Payment Link"
              value={config.paymentLink}
              onChange={e => setConfig({ ...config, paymentLink: e.target.value })}
              placeholder="https://domain-anda.com/pay"
            />
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
              <span>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Auto Aktivasi</span>
                <span className="block text-[11px] text-slate-400">Aktifkan akun setelah webhook sukses</span>
              </span>
              <input
                type="checkbox"
                checked={config.autoActivate}
                onChange={e => setConfig({ ...config, autoActivate: e.target.checked })}
                className="w-4 h-4 rounded accent-primary-500"
              />
            </label>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Paket Aktivasi Default</label>
              <select
                value={config.activationPlanId ?? ''}
                onChange={e => setConfig({ ...config, activationPlanId: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="">Pilih saat aktivasi</option>
                {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {endpointError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Endpoint belum siap</p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{endpointError}</p>
        </Card>
      )}

      {/* API Keys */}
      <Card title="API Credentials">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">API Key</label>
            <div className="flex gap-2">
              <Input value={config.apiKey} readOnly className="flex-1 font-mono" />
              <Button variant="secondary" onClick={() => copyToClipboard(config.apiKey)} icon={<Copy size={16} />} />
              <Button variant="secondary" onClick={regenerateKey} icon={<RefreshCw size={16} />} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">API Secret</label>
            <div className="flex gap-2">
              <Input 
                type={showSecret ? 'text' : 'password'} 
                value={config.apiSecret} 
                onChange={e => setConfig({ ...config, apiSecret: e.target.value })}
                placeholder="Masukkan API Secret"
                className="flex-1"
              />
              <Button variant="secondary" onClick={() => setShowSecret(!showSecret)} icon={showSecret ? <Key size={16} /> : <Code size={16} />} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Webhook URL</label>
            <Input 
              value={config.webhookUrl} 
              onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
              placeholder="https://domain-anda.com/api/webhook"
            />
            <p className="text-xs text-slate-400 mt-1">URL untuk menerima notifikasi real-time</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-500">
            <MessageCircle size={14} />
            Link WhatsApp/payment untuk popup upgrade dikontrol dari konfigurasi pembayaran ini.
          </div>
        </div>
      </Card>

      {/* Documentation */}
      <Card title="API Documentation">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ENDPOINTS.map((ep, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <Badge 
                      label={ep.method} 
                      variant={ep.method === 'GET' ? 'blue' : ep.method === 'POST' ? 'green' : ep.method === 'PUT' ? 'amber' : 'red'} 
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{ep.path}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Example */}
      <Card title="Contoh Penggunaan">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-sm overflow-x-auto">
            <p className="text-green-400"># Get Products</p>
            <p>curl -X GET "{apiBaseUrl || 'https://api-domain-anda.com'}/api/v1/products"</p>
            <p className="text-green-400 mt-2"># Headers</p>
            <p>Authorization: Bearer YOUR_API_KEY</p>
            <p>Content-Type: application/json</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-sm overflow-x-auto">
            <p className="text-green-400"># Create Order</p>
            <p>curl -X POST "{apiBaseUrl || 'https://api-domain-anda.com'}/api/v1/orders"</p>
            <p className="text-green-400 mt-2"># Body</p>
            <p className="text-amber-300">{'{'}</p>
            <p className="text-amber-300">  "customer_id": "C001",</p>
            <p className="text-amber-300">  "items": []</p>
            <p className="text-amber-300">  "payment_method": "cash"</p>
            <p className="text-amber-300">{'}'}</p>
          </div>
        </div>
      </Card>

      {/* Key Modal */}
      <Modal open={keyModal} onClose={() => setKeyModal(false)} title="API Key Baru" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setKeyModal(false)} className="w-full sm:w-auto">Tutup</Button>
            <Button onClick={() => { copyToClipboard(generatedKey); setKeyModal(false) }} icon={<Copy size={16} />} className="w-full sm:w-auto">Salin</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 mb-3">Simpan API key ini dengan aman. Anda tidak akan dapat melihatnya lagi.</p>
        <Input value={generatedKey} readOnly className="font-mono" />
      </Modal>
    </div>
  )
}
