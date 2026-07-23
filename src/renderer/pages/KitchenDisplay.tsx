import { useEffect, useState, useCallback, useRef } from 'react'
import { ChefHat, Clock, Bell, BellOff, Filter, CheckCircle, Utensils, Play, Timer } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

interface KdsOrder {
  kd_order: string
  kd_transaksi?: string
  no_antrian: number
  nama_pelanggan: string
  status: 'BARU' | 'DIMASAK' | 'SIAP' | 'DISAJIKAN'
  catatan?: string
  items: KdsOrderItem[]
  waktu_mulai?: string
  created_at: string
}

interface KdsOrderItem {
  kd_produk: string
  nama_produk: string
  qty: number
  catatan_item?: string
}

interface KdsPending {
  total: number
  baru: number
  dimasak: number
  siap: number
}

type KdsTab = 'SEMUA' | 'BARU' | 'DIMASAK' | 'SIAP'

const statusConfig: Record<string, { border: string; badge: 'red' | 'yellow' | 'green'; bg: string }> = {
  BARU: { border: 'border-red-500', badge: 'red', bg: 'bg-red-50 dark:bg-red-950/20' },
  DIMASAK: { border: 'border-amber-400', badge: 'yellow', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  SIAP: { border: 'border-emerald-500', badge: 'green', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
}

export default function KitchenDisplay() {
  const toast = useToast()
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [pending, setPending] = useState<KdsPending>({ total: 0, baru: 0, dimasak: 0, siap: 0 })
  const [avgPrepTime, setAvgPrepTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<KdsTab>('SEMUA')
  const [soundOn, setSoundOn] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<KdsOrder | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ order: KdsOrder; action: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const prevCountRef = useRef(0)

  const load = useCallback(async () => {
    const [r1, r2, r3] = await Promise.all([
      api<KdsOrder[]>('kds:getOrders'),
      api<KdsPending>('kds:getPending'),
      api<number>('kds:getAvgPrepTime'),
    ])
    if (r1.success) {
      const data = r1.data ?? []
      setOrders(data)
      if (soundOn && prevCountRef.current > 0 && data.length > prevCountRef.current) {
        new Audio('/notification.mp3').play().catch(() => {})
      }
      prevCountRef.current = data.length
    }
    if (r2.success) setPending(r2.data ?? { total: 0, baru: 0, dimasak: 0, siap: 0 })
    if (r3.success) setAvgPrepTime(r3.data ?? 0)
    setLoading(false)
  }, [soundOn])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const handleUpdateStatus = async (order: KdsOrder, status: string) => {
    setActionLoading(true)
    const r = await api('kds:updateOrderStatus', order.kd_order, status)
    setActionLoading(false)
    if (r.success) {
      toast(`Status pesanan #${order.no_antrian} diubah`)
      setConfirmModal(null)
      setSelectedOrder(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const elapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime()
    const m = Math.floor(diff / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const filtered = orders.filter(o => tab === 'SEMUA' || o.status === tab)
  const stats = [
    { label: 'Total Antrian', value: pending.total, icon: <ChefHat size={20} className="text-primary-500" /> },
    { label: 'Baru', value: pending.baru, icon: <Bell size={20} className="text-red-500" /> },
    { label: 'Dimasak', value: pending.dimasak, icon: <Timer size={20} className="text-amber-500" /> },
    { label: 'Siap Saji', value: pending.siap, icon: <CheckCircle size={20} className="text-emerald-500" /> },
    { label: 'Rata-rata Prep', value: `${avgPrepTime}m`, icon: <Clock size={20} className="text-blue-500" /> },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <SkeletonStatGrid count={5} />
          <SkeletonSpinner label="Memuat dapur..." />
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.map((s, i) => (
              <Card key={i} title={s.label} action={s.icon}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['SEMUA', 'BARU', 'DIMASAK', 'SIAP'] as KdsTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    tab === t
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {t === 'SEMUA' ? 'Semua' : t}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSoundOn(!soundOn)}
              className={`p-2.5 rounded-xl border transition-all ${
                soundOn
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
              }`}
              title={soundOn ? 'Nonaktifkan suara' : 'Aktifkan suara'}
            >
              {soundOn ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          </div>

          {/* Order Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <div className="text-center py-10">
                    <ChefHat size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Tidak ada pesanan</p>
                    <p className="text-sm text-slate-400">Semua pesanan sudah selesai</p>
                  </div>
                </Card>
              </div>
            ) : (
              filtered.map(order => {
                const cfg = statusConfig[order.status] ?? statusConfig.BARU
                return (
                  <div
                    key={order.kd_order}
                    className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-4 space-y-3 cursor-pointer hover:shadow-lg transition-all`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">#{order.no_antrian}</span>
                        <Badge label={order.status} variant={cfg.badge} />
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm font-mono">
                        <Clock size={14} />
                        {elapsed(order.waktu_mulai || order.created_at)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{order.nama_pelanggan || '-'}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="space-y-1">
                      {(order.items ?? []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{item.qty}x</span> {item.nama_produk}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.catatan && (
                      <p className="text-xs italic text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1">
                        {order.catatan}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {order.status === 'BARU' && (
                        <Button size="sm" icon={<Play size={14} />} onClick={(e) => { e.stopPropagation(); setConfirmModal({ order, action: 'DIMASAK' }); }} className="flex-1">
                          Terima
                        </Button>
                      )}
                      {order.status === 'DIMASAK' && (
                        <Button size="sm" variant="success" icon={<CheckCircle size={14} />} onClick={(e) => { e.stopPropagation(); setConfirmModal({ order, action: 'SIAP' }); }} className="flex-1">
                          Selesai
                        </Button>
                      )}
                      {order.status === 'SIAP' && (
                        <Button size="sm" variant="secondary" icon={<Utensils size={14} />} onClick={(e) => { e.stopPropagation(); setConfirmModal({ order, action: 'DISAJIKAN' }); }} className="flex-1">
                          Sajikan
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Detail Modal */}
          <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Pesanan #${selectedOrder?.no_antrian ?? ''}`} size="md">
            {selectedOrder && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{selectedOrder.nama_pelanggan || '-'}</p>
                    <p className="text-sm text-slate-400">{formatDateTime(selectedOrder.created_at)}</p>
                  </div>
                  <Badge label={selectedOrder.status} variant={statusConfig[selectedOrder.status]?.badge ?? 'gray'} />
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-bold">{item.qty}x</span> {item.nama_produk}
                      </span>
                    </div>
                  ))}
                </div>
                {selectedOrder.catatan && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3">
                    <p className="text-xs text-slate-500">Catatan</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">{selectedOrder.catatan}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {selectedOrder.status === 'BARU' && (
                    <Button className="flex-1" icon={<Play size={16} />} onClick={() => setConfirmModal({ order: selectedOrder, action: 'DIMASAK' })}>Terima & Masak</Button>
                  )}
                  {selectedOrder.status === 'DIMASAK' && (
                    <Button className="flex-1" variant="success" icon={<CheckCircle size={16} />} onClick={() => setConfirmModal({ order: selectedOrder, action: 'SIAP' })}>Tandai Selesai</Button>
                  )}
                  {selectedOrder.status === 'SIAP' && (
                    <Button className="flex-1" variant="secondary" icon={<Utensils size={16} />} onClick={() => setConfirmModal({ order: selectedOrder, action: 'DISAJIKAN' })}>Sajikan</Button>
                  )}
                </div>
              </div>
            )}
          </Modal>

          {/* Confirm Action Modal */}
          <Modal
            open={!!confirmModal}
            onClose={() => setConfirmModal(null)}
            title="Konfirmasi Status"
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirmModal(null)} className="w-full sm:w-auto">Batal</Button>
                <Button loading={actionLoading} onClick={() => handleUpdateStatus(confirmModal!.order, confirmModal!.action)} className="w-full sm:w-auto">Konfirmasi</Button>
              </>
            }
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ubah status pesanan <strong>#{confirmModal?.order.no_antrian}</strong> menjadi <strong>{confirmModal?.action}</strong>?
            </p>
          </Modal>
        </>
      )}
    </div>
  )
}
