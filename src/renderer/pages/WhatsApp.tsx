import { useState, useEffect } from 'react'
import { MessageCircle, Send, Bell, CheckCircle, XCircle, Eye, EyeOff, Zap } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
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
    messageTemplate: 'Terima kasih {customer}! Pesanan Anda sebesar {total} telah diterima. No. Transaksi: {invoice}',
  })
  const [testNumber, setTestNumber] = useState('')
  const [testModal, setTestModal] = useState(false)

  useEffect(() => {
    api<any>('whatsapp:get').then(r => {
      if (r.success && r.data) {
        const d = r.data
        setSettings({
          apiKey: d.api_key ?? '',
          enabled: !!d.enabled,
          notifyOnSale: !!d.notify_on_sale,
          notifyOnReturn: !!d.notify_on_return,
          notifyOnLowStock: !!d.notify_on_low_stock,
          notifyOnPayment: !!d.notify_on_payment,
          messageTemplate: d.message_template ?? '',
        })
      }
    })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const r = await api('whatsapp:save', settings)
    setLoading(false)
    if (r.success) toast('Pengaturan WhatsApp berhasil disimpan')
    else toast(r.message as string ?? 'Gagal menyimpan', 'error')
  }

  const handleTest = async () => {
    if (!testNumber) return toast('Masukkan nomor HP', 'error')
    setTesting(true)
    const r = await api('whatsapp:test', testNumber)
    setTesting(false)
    if (r.success) {
      setTestModal(false)
      toast('Pesan test berhasil dikirim!')
    } else {
      toast(r.message as string ?? 'Gagal mengirim pesan', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="text-green-500" size={28} />
            WhatsApp Notification
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Kirim notifikasi otomatis ke pelanggan</p>
        </div>
        <Button onClick={handleSave} loading={loading} icon={<CheckCircle size={16} />} className="w-full sm:w-auto">
          Simpan Perubahan
        </Button>
      </div>

      {/* Status */}
      <Card className={settings.enabled ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-slate-50 dark:bg-slate-800/50'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <CheckCircle className="text-green-500 w-8 h-8" />
            ) : (
              <XCircle className="text-slate-400 w-8 h-8" />
            )}
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Status: {settings.enabled ? 'Aktif' : 'Nonaktif'}</p>
              <p className="text-sm text-slate-500">{settings.enabled ? 'Notifikasi otomatis berjalan' : 'Notifikasi dinonaktifkan'}</p>
            </div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <div className={`w-7 h-7 bg-white rounded-full shadow transform transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      {/* API Configuration */}
      <Card title="Konfigurasi API">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">API Key Fonnte</label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Masukkan API key Anda"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Dapatkan API key di fonnte.com</p>
          </div>
          <Button variant="secondary" onClick={() => setTestModal(true)} icon={<Send size={16} />}>
            Kirim Pesan Test
          </Button>
        </div>
      </Card>

      {/* Notification Triggers */}
      <Card title="Notifikasi Otomatis">
        <div className="space-y-3">
          {[
            { key: 'notifyOnSale', label: 'Transaksi Baru', desc: 'Kirim notifikasi saat ada transaksi' },
            { key: 'notifyOnReturn', label: 'Return Barang', desc: 'Kirim notifikasi saat ada return' },
            { key: 'notifyOnLowStock', label: 'Stok Menipis', desc: 'Kirim notifikasi saat stok di bawah minimum' },
            { key: 'notifyOnPayment', label: 'Pembayaran', desc: 'Kirim notifikasi saat ada pembayaran' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key as keyof WhatsAppSettings] })}
                className={`w-12 h-6 rounded-full transition-colors ${settings[item.key as keyof WhatsAppSettings] ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings[item.key as keyof WhatsAppSettings] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Message Template */}
      <Card title="Template Pesan">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Gunakan variabel: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{customer}'}</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{total}'}</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{invoice}'}</code></p>
          <textarea
            value={settings.messageTemplate}
            onChange={e => setSettings({ ...settings, messageTemplate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            rows={4}
            placeholder="Terima kasih {customer}! Pesanan Anda sebesar {total} telah diterima."
          />
        </div>
      </Card>

      {/* Test Modal */}
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
        <Input
          label="Nomor HP (contoh: 628123456789)"
          value={testNumber}
          onChange={e => setTestNumber(e.target.value)}
          placeholder="628123456789"
        />
      </Modal>
    </div>
  )
}