import { useEffect, useMemo, useState } from 'react'
import { Store, Plus, RefreshCw, Save, ArrowUpDown } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'

interface Channel {
  id: number
  platform: string
  name: string
  store_url: string
  auto_sync: number
  sync_stock: number
  sync_orders: number
  is_active: number
  last_sync_at: string | null
  last_status: string
}

interface SkuMap {
  id: number
  channel_id: number
  local_sku: string
  remote_sku: string
  remote_product_id: string
  last_stock: number
  is_active: number
}

interface UnmappedProduct {
  kd_barang: string
  nama_barang: string
  barcode: string | null
  stok: number
}

interface LogRow {
  id: number
  status: string
  message: string
  created_at: string
}

export default function Marketplace() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<Channel[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [maps, setMaps] = useState<SkuMap[]>([])
  const [unmapped, setUnmapped] = useState<UnmappedProduct[]>([])
  const [selectedChannel, setSelectedChannel] = useState('')
  const [channelForm, setChannelForm] = useState({
    platform: 'shopee',
    name: '',
    store_url: '',
    api_key: '',
    api_secret: '',
    auto_sync: false,
    sync_stock: true,
    sync_orders: true,
  })
  const [mapForm, setMapForm] = useState({ local_sku: '', remote_sku: '', remote_product_id: '' })

  const load = async () => {
    setLoading(true)
    const [channelRes, mapRes] = await Promise.all([
      api<{ channels: Channel[]; logs: LogRow[] }>('marketplace:getChannels'),
      api<{ maps: SkuMap[]; unmapped: UnmappedProduct[] }>('marketplace:getSkuMap', selectedChannel ? Number(selectedChannel) : undefined),
    ])
    if (channelRes.success && channelRes.data) {
      setChannels(channelRes.data.channels)
      setLogs(channelRes.data.logs)
    }
    if (mapRes.success && mapRes.data) {
      setMaps(mapRes.data.maps)
      setUnmapped(mapRes.data.unmapped)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedChannel])

  const activeChannels = useMemo(() => channels.filter(c => c.is_active), [channels])

  const saveChannel = async () => {
    const r = await api('marketplace:saveChannel', channelForm)
    if (r.success) {
      toast('Channel marketplace disimpan')
      setChannelForm({ platform: 'shopee', name: '', store_url: '', api_key: '', api_secret: '', auto_sync: false, sync_stock: true, sync_orders: true })
      load()
    } else toast(r.message as string, 'error')
  }

  const saveMap = async () => {
    if (!selectedChannel) return toast('Pilih channel dulu', 'error')
    const r = await api('marketplace:saveSkuMap', { ...mapForm, channel_id: Number(selectedChannel) })
    if (r.success) {
      toast('Mapping SKU disimpan')
      setMapForm({ local_sku: '', remote_sku: '', remote_product_id: '' })
      load()
    } else toast(r.message as string, 'error')
  }

  const runSync = async () => {
    const r = await api('marketplace:runStockSync', selectedChannel ? Number(selectedChannel) : undefined)
    if (r.success) {
      toast(r.message || 'Sync marketplace selesai')
      load()
    } else toast(r.message as string, 'error')
  }

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="text-primary-500" size={28} />
            Omnichannel Marketplace
          </h1>
          <p className="text-sm text-slate-500">Channel Shopee, Tokopedia, Shopify, WooCommerce, mapping SKU, dan queue sync stok.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw size={16} />}>Refresh</Button>
          <Button onClick={runSync} icon={<ArrowUpDown size={16} />}>Sync Stok</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Tambah Channel">
          <div className="space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Platform</span>
              <select value={channelForm.platform} onChange={e => setChannelForm({ ...channelForm, platform: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm">
                <option value="shopee">Shopee</option>
                <option value="tokopedia">Tokopedia</option>
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <Input label="Nama Toko" value={channelForm.name} onChange={e => setChannelForm({ ...channelForm, name: e.target.value })} />
            <Input label="URL Toko" value={channelForm.store_url} onChange={e => setChannelForm({ ...channelForm, store_url: e.target.value })} />
            <Input label="API Key" value={channelForm.api_key} onChange={e => setChannelForm({ ...channelForm, api_key: e.target.value })} />
            <Input label="API Secret" type="password" value={channelForm.api_secret} onChange={e => setChannelForm({ ...channelForm, api_secret: e.target.value })} />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Check label="Auto" checked={channelForm.auto_sync} onChange={v => setChannelForm({ ...channelForm, auto_sync: v })} />
              <Check label="Stok" checked={channelForm.sync_stock} onChange={v => setChannelForm({ ...channelForm, sync_stock: v })} />
              <Check label="Order" checked={channelForm.sync_orders} onChange={v => setChannelForm({ ...channelForm, sync_orders: v })} />
            </div>
            <Button onClick={saveChannel} icon={<Plus size={16} />} className="w-full">Simpan Channel</Button>
          </div>
        </Card>

        <Card title="Channel Aktif" className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {channels.length === 0 && <p className="text-sm text-slate-400">Belum ada channel marketplace.</p>}
            {channels.map(channel => (
              <button key={channel.id} onClick={() => setSelectedChannel(String(channel.id))} className={`text-left rounded-lg border p-3 transition-colors ${selectedChannel === String(channel.id) ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{channel.name}</p>
                  <Badge label={channel.platform} variant="blue" />
                </div>
                <p className="mt-1 text-xs text-slate-400 truncate">{channel.store_url || '-'}</p>
                <p className="mt-2 text-xs text-slate-500">{channel.last_status || 'Belum pernah sync'}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Mapping SKU">
          <div className="space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Channel</span>
              <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm">
                <option value="">Pilih channel</option>
                {activeChannels.map(channel => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
              </select>
            </label>
            <Input label="SKU Lokal" value={mapForm.local_sku} onChange={e => setMapForm({ ...mapForm, local_sku: e.target.value })} placeholder="Kode produk POS" />
            <Input label="SKU Marketplace" value={mapForm.remote_sku} onChange={e => setMapForm({ ...mapForm, remote_sku: e.target.value })} />
            <Input label="Remote Product ID" value={mapForm.remote_product_id} onChange={e => setMapForm({ ...mapForm, remote_product_id: e.target.value })} />
            <Button onClick={saveMap} icon={<Save size={16} />} className="w-full">Simpan Mapping</Button>
          </div>
        </Card>

        <Card title="SKU Tersambung" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 text-left">
                <tr><th className="px-3 py-2">Channel</th><th>SKU Lokal</th><th>SKU Marketplace</th><th>Stok Terakhir</th><th>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {maps.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada mapping SKU</td></tr> : maps.map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">{channels.find(c => c.id === row.channel_id)?.name || row.channel_id}</td>
                    <td className="font-mono text-xs">{row.local_sku}</td>
                    <td className="font-mono text-xs">{row.remote_sku}</td>
                    <td>{row.last_stock}</td>
                    <td><Badge label={row.is_active ? 'Aktif' : 'Nonaktif'} variant={row.is_active ? 'green' : 'gray'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Produk Belum Dimapping">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {unmapped.length === 0 && <p className="text-sm text-slate-400">Semua produk sudah punya mapping aktif.</p>}
            {unmapped.map(product => (
              <button key={product.kd_barang} onClick={() => setMapForm({ ...mapForm, local_sku: product.kd_barang })} className="w-full flex justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-left text-sm">
                <span>{product.nama_barang}</span>
                <span className="font-mono text-xs text-slate-400">{product.kd_barang} / {product.stok}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Log Sync">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {logs.length === 0 && <p className="text-sm text-slate-400">Belum ada log sync.</p>}
            {logs.map(log => (
              <div key={log.id} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                <div className="flex justify-between gap-2">
                  <Badge label={log.status} variant={log.status === 'success' ? 'green' : log.status === 'error' ? 'red' : 'gray'} />
                  <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{log.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-800 px-2 py-2">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
