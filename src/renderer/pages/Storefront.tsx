import { useEffect, useState } from 'react'
import { Store, Package, ShoppingCart, Settings, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonStatGrid } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface StoreSettings {
  kd_toko: number
  domain: string | null
  nama_toko: string
  deskripsi: string | null
  logo: string | null
  warna_utama: string
  meta_tags: string | null
  google_analytics: string | null
  is_active: boolean
}

interface OnlineProduct {
  kd_produk: number
  nama_produk: string
  harga_online: number
  stok_online: number
  visible: boolean
  gambar: string | null
}

interface OnlineOrder {
  kd_order: number
  no_order: string
  nama_pelanggan: string
  total: number
  status: 'BARU' | 'DIKONFIRMASI' | 'DIPROSES' | 'DIKIRIM' | 'SELESAI' | 'BATAL'
  pembayaran: string
  status_pembayaran: string
  tgl_order: string
  alamat: string | null
  items?: { nama_produk: string; jumlah: number; harga: number }[]
}

export default function Storefront() {
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState<'settings' | 'products' | 'orders'>('settings')
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [products, setProducts] = useState<OnlineProduct[]>([])
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null)
  const [orderDetailModal, setOrderDetailModal] = useState(false)
  const [statusModal, setStatusModal] = useState<{ order: OnlineOrder; status: string } | null>(null)
  const [form, setForm] = useState({
    domain: '', nama_toko: '', deskripsi: '', logo: '', warna_utama: '#4F46E5',
    meta_tags: '', google_analytics: '', is_active: true
  })
  const [searchProduct, setSearchProduct] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([
      api<StoreSettings>('storefront:getSettings'),
      api<OnlineProduct[]>('storefront:getProducts'),
      api<OnlineOrder[]>('storefront:getOrders'),
    ])
    if (r1.success && r1.data) {
      setSettings(r1.data)
      setForm({
        domain: r1.data.domain || '', nama_toko: r1.data.nama_toko, deskripsi: r1.data.deskripsi || '',
        logo: r1.data.logo || '', warna_utama: r1.data.warna_utama || '#4F46E5',
        meta_tags: r1.data.meta_tags || '', google_analytics: r1.data.google_analytics || '',
        is_active: r1.data.is_active
      })
    }
    if (r2.success) setProducts(r2.data ?? [])
    if (r3.success) setOrders(r3.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const handleSaveSettings = async () => {
    setLoading(true)
    const r = await api('storefront:updateSettings', form)
    setLoading(false)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const toggleProductVisibility = async (p: OnlineProduct) => {
    setLoading(true)
    const r = await api('storefront:updateProduct', p.kd_produk, { visible: !p.visible })
    setLoading(false)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const openOrderDetail = async (order: OnlineOrder) => {
    setLoading(true)
    const r = await api<OnlineOrder>('storefront:getOrderById', order.kd_order)
    setLoading(false)
    if (r.success && r.data) {
      setSelectedOrder(r.data)
      setOrderDetailModal(true)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleUpdateStatus = async () => {
    if (!statusModal) return
    setLoading(true)
    const r = await api('storefront:updateOrderStatus', statusModal.order.kd_order, statusModal.status)
    setLoading(false)
    if (r.success) { toast(r.message as string); setStatusModal(null); load() }
    else toast(r.message as string, 'error')
  }

  const statusWorkflow = ['BARU', 'DIKONFIRMASI', 'DIPROSES', 'DIKIRIM', 'SELESAI']
  const statusVariant: Record<string, 'blue' | 'green' | 'yellow' | 'gray' | 'purple' | 'red'> = {
    BARU: 'blue', DIKONFIRMASI: 'yellow', DIPROSES: 'purple', DIKIRIM: 'green', SELESAI: 'green', BATAL: 'red'
  }

  const nextStatus = (current: string): string | null => {
    const idx = statusWorkflow.indexOf(current)
    if (idx >= 0 && idx < statusWorkflow.length - 1) return statusWorkflow[idx + 1]
    return null
  }

  const filteredProducts = products.filter(p =>
    (p.nama_produk ?? '').toLowerCase().includes(searchProduct.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
            {(['settings', 'products', 'orders'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t === 'settings' ? <Settings size={16} /> : t === 'products' ? <Package size={16} /> : <ShoppingCart size={16} />}
                {t === 'settings' ? 'Pengaturan' : t === 'products' ? 'Produk Online' : 'Pesanan'}
              </button>
            ))}
          </div>

          {tab === 'settings' && (
            <Card title="Pengaturan Toko Online">
              <div className="space-y-4 max-w-xl">
                <Input label="Domain" value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="https://toko-anda.com" />
                <Input label="Nama Toko *" value={form.nama_toko} onChange={e => setForm(p => ({ ...p, nama_toko: e.target.value }))} placeholder="Nama toko online" />
                <Textarea label="Deskripsi" value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} placeholder="Deskripsi toko" rows={3} />
                <Input label="Logo (URL)" value={form.logo} onChange={e => setForm(p => ({ ...p, logo: e.target.value }))} placeholder="https://example.com/logo.png" />
                <div className="flex items-end gap-3">
                  <Input label="Warna Utama" value={form.warna_utama} onChange={e => setForm(p => ({ ...p, warna_utama: e.target.value }))} placeholder="#4F46E5" className="flex-1" />
                  <input
                    type="color"
                    value={form.warna_utama}
                    onChange={e => setForm(p => ({ ...p, warna_utama: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer mb-1"
                  />
                </div>
                <Textarea label="Meta Tags" value={form.meta_tags} onChange={e => setForm(p => ({ ...p, meta_tags: e.target.value }))} placeholder="<meta> tags untuk SEO" rows={2} />
                <Input label="Google Analytics ID" value={form.google_analytics} onChange={e => setForm(p => ({ ...p, google_analytics: e.target.value }))} placeholder="G-XXXXXXXXXX" />
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      form.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {form.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {form.is_active ? 'Toko Aktif' : 'Toko Nonaktif'}
                  </button>
                </div>
                <Button loading={loading} onClick={handleSaveSettings}>Simpan Pengaturan</Button>
              </div>
            </Card>
          )}

          {tab === 'products' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Input
                  placeholder="Cari produk..."
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-sm text-slate-500 self-center">{filteredProducts.length} produk</p>
              </div>

              <Card title="Produk Online">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[640px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Produk</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Harga Online</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Stok Online</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tampil</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 sm:px-4 py-10 text-center text-slate-400">Tidak ada produk online</td>
                          </tr>
                        ) : (
                          filteredProducts.map(p => (
                            <tr key={p.kd_produk} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                    {p.gambar ? (
                                      <img src={p.gambar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Package size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{p.nama_produk}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">{formatRupiah(p.harga_online)}</td>
                              <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{p.stok_online}</td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                {p.visible ? (
                                  <Eye size={16} className="text-emerald-500 mx-auto" />
                                ) : (
                                  <EyeOff size={16} className="text-slate-300 dark:text-slate-600 mx-auto" />
                                )}
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <button
                                  onClick={() => toggleProductVisibility(p)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    p.visible
                                      ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-500'
                                      : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500'
                                  }`}
                                  title={p.visible ? 'Sembunyikan' : 'Tampilkan'}
                                >
                                  {p.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </>
          )}

          {tab === 'orders' && (
            <Card title="Pesanan Online">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">No Order</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pelanggan</th>
                        <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                        <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pembayaran</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
                        <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada pesanan</td>
                        </tr>
                      ) : (
                        orders.map(o => (
                          <tr key={o.kd_order} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-3 sm:px-4 py-3 font-mono text-xs text-slate-500">#{o.no_order}</td>
                            <td className="px-3 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{o.nama_pelanggan}</td>
                            <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(o.total)}</td>
                            <td className="px-3 sm:px-4 py-3 text-center">
                              <Badge label={o.status} variant={statusVariant[o.status] || 'gray'} />
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{o.pembayaran}</td>
                            <td className="px-3 sm:px-4 py-3 text-slate-500 text-xs">{formatDateTime(o.tgl_order)}</td>
                            <td className="px-3 sm:px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openOrderDetail(o)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Detail">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M21 12c-4.5 6-9 6-9 6s-4.5 0-9-6 4.5-6 9-6 9 6 9 6z"/></svg>
                                </button>
                                {nextStatus(o.status) && (
                                  <button onClick={() => setStatusModal({ order: o, status: nextStatus(o.status)! })} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors" title={`Ubah ke ${nextStatus(o.status)}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* Order Detail Modal */}
          <Modal
            open={orderDetailModal}
            onClose={() => { setOrderDetailModal(false); setSelectedOrder(null) }}
            title={`Detail Pesanan #${selectedOrder?.no_order ?? ''}`}
            size="md"
            footer={<Button variant="secondary" onClick={() => { setOrderDetailModal(false); setSelectedOrder(null) }} className="w-full sm:w-auto">Tutup</Button>}
          >
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Pelanggan</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{selectedOrder.nama_pelanggan}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{formatRupiah(selectedOrder.total)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Status</p>
                    <Badge label={selectedOrder.status} variant={statusVariant[selectedOrder.status] || 'gray'} />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Pembayaran</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{selectedOrder.pembayaran} ({selectedOrder.status_pembayaran})</p>
                  </div>
                </div>
                {selectedOrder.alamat && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Alamat Pengiriman</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{selectedOrder.alamat}</p>
                  </div>
                )}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Item Pesanan</p>
                    <div className="space-y-1">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <span className="text-slate-700 dark:text-slate-300">{item.nama_produk} x{item.jumlah}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{formatRupiah(item.harga * item.jumlah)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-slate-400">{formatDateTime(selectedOrder.tgl_order)}</div>
              </div>
            )}
          </Modal>

          {/* Status Update Confirm */}
          <ConfirmDialog
            open={!!statusModal}
            onClose={() => setStatusModal(null)}
            onConfirm={handleUpdateStatus}
            title="Update Status Pesanan"
            message={`Ubah status #${statusModal?.order.no_order} menjadi "${statusModal?.status}"?`}
            confirmText="Ya, Update"
            variant="warning"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
