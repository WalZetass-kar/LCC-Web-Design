import { useEffect, useState } from 'react'
import { Truck, Package, Plus, Edit3, Trash2, MapPin, Phone, User } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

interface DeliveryOrder {
  kd_delivery: string
  kd_transaksi?: string
  nomor_delivery: string
  nama_penerima: string
  no_telp_penerima: string
  alamat: string
  catatan_alamat?: string
  status: 'MENUNGGU' | 'DIPROSES' | 'DIANTAR' | 'TERKIRIM' | 'GAGAL'
  biaya_ongkir: number
  kd_kurir?: string
  nama_kurir?: string
  created_at: string
}

interface Vehicle {
  kd_kendaraan: string
  nama: string
  plat: string
  jenis: string
  kapasitas: number
  biaya_per_km: number
  status: 'AKTIF' | 'NONAKTIF'
}

const statusVariant: Record<string, 'yellow' | 'blue' | 'amber' | 'green' | 'red'> = {
  MENUNGGU: 'yellow',
  DIPROSES: 'blue',
  DIANTAR: 'amber',
  TERKIRIM: 'green',
  GAGAL: 'red',
}

export default function Delivery() {
  const toast = useToast()
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'orders' | 'vehicles'>('orders')
  const [modal, setModal] = useState<'order' | 'vehicle' | 'courier' | null>(null)
  const [editOrder, setEditOrder] = useState<DeliveryOrder | null>(null)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null)

  const [formOrder, setFormOrder] = useState({
    kd_transaksi: '', nama_penerima: '', no_telp_penerima: '',
    alamat: '', catatan_alamat: '', biaya_ongkir: '',
  })

  const [formVehicle, setFormVehicle] = useState({
    nama: '', plat: '', jenis: '', kapasitas: '', biaya_per_km: '', status: 'AKTIF' as 'AKTIF' | 'NONAKTIF',
  })

  const [formCourier, setFormCourier] = useState({ kd_kurir: '' })

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<DeliveryOrder[]>('delivery:getOrders'),
      api<Vehicle[]>('delivery:getVehicles'),
    ])
    if (r1.success) setOrders(r1.data ?? [])
    if (r2.success) setVehicles(r2.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetFormOrder = (order?: DeliveryOrder | null) => {
    setFormOrder(order ? {
      kd_transaksi: order.kd_transaksi ?? '',
      nama_penerima: order.nama_penerima,
      no_telp_penerima: order.no_telp_penerima,
      alamat: order.alamat,
      catatan_alamat: order.catatan_alamat ?? '',
      biaya_ongkir: String(order.biaya_ongkir),
    } : { kd_transaksi: '', nama_penerima: '', no_telp_penerima: '', alamat: '', catatan_alamat: '', biaya_ongkir: '' })
  }

  const resetFormVehicle = (v?: Vehicle | null) => {
    setFormVehicle(v ? {
      nama: v.nama,
      plat: v.plat,
      jenis: v.jenis,
      kapasitas: String(v.kapasitas),
      biaya_per_km: String(v.biaya_per_km),
      status: v.status,
    } : { nama: '', plat: '', jenis: '', kapasitas: '', biaya_per_km: '', status: 'AKTIF' })
  }

  const handleSaveOrder = async () => {
    if (!formOrder.nama_penerima || !formOrder.no_telp_penerima || !formOrder.alamat) {
      return toast('Nama, telepon, dan alamat wajib diisi', 'error')
    }
    setSubmitting(true)
    const payload = { ...formOrder, biaya_ongkir: parseFloat(formOrder.biaya_ongkir || '0') }
    const r = await api('delivery:createOrder', payload)
    setSubmitting(false)
    if (r.success) {
      toast('Delivery dibuat')
      setModal(null)
      resetFormOrder()
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleSaveVehicle = async () => {
    if (!formVehicle.nama || !formVehicle.plat || !formVehicle.jenis) {
      return toast('Nama, plat, dan jenis wajib diisi', 'error')
    }
    setSubmitting(true)
    const payload = { ...formVehicle, kapasitas: parseFloat(formVehicle.kapasitas || '0'), biaya_per_km: parseFloat(formVehicle.biaya_per_km || '0') }
    const r = editVehicle
      ? await api('delivery:updateVehicle', editVehicle.kd_kendaraan, payload)
      : await api('delivery:createVehicle', payload)
    setSubmitting(false)
    if (r.success) {
      toast(editVehicle ? 'Kendaraan diperbarui' : 'Kendaraan ditambahkan')
      setModal(null)
      setEditVehicle(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleUpdateStatus = async (order: DeliveryOrder, status: string) => {
    setSubmitting(true)
    const r = await api('delivery:updateOrderStatus', order.kd_delivery, status)
    setSubmitting(false)
    if (r.success) {
      toast(`Status ${order.nomor_delivery} diubah`)
      setSelectedOrder(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleAssignCourier = async () => {
    if (!selectedOrder || !formCourier.kd_kurir) return toast('Pilih kurir', 'error')
    setSubmitting(true)
    const r = await api('delivery:assignCourier', selectedOrder.kd_delivery, formCourier.kd_kurir)
    setSubmitting(false)
    if (r.success) {
      toast('Kurir ditugaskan')
      setModal(null)
      setSelectedOrder(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteVehicle = async () => {
    if (!deleteVehicle) return
    setSubmitting(true)
    const r = await api('delivery:deleteVehicle', deleteVehicle.kd_kendaraan)
    setSubmitting(false)
    if (r.success) {
      toast('Kendaraan dihapus')
      setDeleteVehicle(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const filteredOrders = orders.filter(o =>
    o.nomor_delivery.toLowerCase().includes(search.toLowerCase()) ||
    o.nama_penerima.toLowerCase().includes(search.toLowerCase())
  )

  const statusFlow: Record<string, string[]> = {
    MENUNGGU: ['DIPROSES'],
    DIPROSES: ['DIANTAR'],
    DIANTAR: ['TERKIRIM', 'GAGAL'],
  }

  const statItems = [
    { label: 'Total', value: orders.length, icon: <Package size={20} className="text-primary-500" /> },
    { label: 'Menunggu', value: orders.filter(o => o.status === 'MENUNGGU').length, icon: <Package size={20} className="text-amber-500" /> },
    { label: 'Diantar', value: orders.filter(o => o.status === 'DIANTAR').length, icon: <Truck size={20} className="text-blue-500" /> },
    { label: 'Terkirim', value: orders.filter(o => o.status === 'TERKIRIM').length, icon: <Package size={20} className="text-emerald-500" /> },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonSpinner label="Memuat delivery..." />
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map((s, i) => (
              <Card key={i} title={s.label} action={s.icon}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab('orders')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'orders' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
            >
              Delivery
            </button>
            <button
              onClick={() => setTab('vehicles')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'vehicles' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
            >
              Kendaraan
            </button>
          </div>

          {tab === 'orders' && (
            <>
              {/* Orders Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  placeholder="Cari delivery..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button icon={<Plus size={16} />} onClick={() => { resetFormOrder(); setModal('order') }}>
                  Buat Delivery
                </Button>
              </div>

              {/* Orders Table */}
              <Card title="Daftar Delivery">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[800px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No Delivery</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Penerima</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alamat</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Kurir</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Ongkir</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada delivery</td>
                          </tr>
                        ) : (
                          filteredOrders.map(order => (
                            <tr key={order.kd_delivery} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                              <td className="px-3 sm:px-4 py-3 font-mono text-xs text-slate-500">{order.nomor_delivery}</td>
                              <td className="px-3 sm:px-4 py-3">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{order.nama_penerima}</p>
                                <p className="text-xs text-slate-400">{order.no_telp_penerima}</p>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-slate-500 max-w-[200px] truncate">{order.alamat}</td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <Badge label={order.status} variant={statusVariant[order.status] ?? 'gray'} />
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{order.nama_kurir || '-'}</td>
                              <td className="px-3 sm:px-4 py-3 text-right text-slate-600 dark:text-slate-300">{order.biaya_ongkir > 0 ? formatRupiah(order.biaya_ongkir) : '-'}</td>
                              <td className="px-3 sm:px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {order.status === 'MENUNGGU' && (
                                    <Button size="sm" icon={<User size={14} />} onClick={() => { setSelectedOrder(order); setFormCourier({ kd_kurir: '' }); setModal('courier') }}>
                                      Assign
                                    </Button>
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

              {/* Order Detail Modal */}
              <Modal open={!!selectedOrder && modal !== 'courier'} onClose={() => setSelectedOrder(null)} title={`Delivery ${selectedOrder?.nomor_delivery ?? ''}`} size="sm">
                {selectedOrder && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge label={selectedOrder.status} variant={statusVariant[selectedOrder.status] ?? 'gray'} />
                      <span className="text-xs text-slate-400">{formatDateTime(selectedOrder.created_at)}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <User size={16} className="text-slate-400" />
                        <span className="font-semibold">{selectedOrder.nama_penerima}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone size={14} />
                        {selectedOrder.no_telp_penerima}
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-500">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span>{selectedOrder.alamat}</span>
                      </div>
                      {selectedOrder.catatan_alamat && (
                        <p className="text-xs text-slate-400 italic">Catatan: {selectedOrder.catatan_alamat}</p>
                      )}
                      {selectedOrder.biaya_ongkir > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <span className="text-sm text-slate-500">Ongkir</span>
                          <span className="font-semibold text-slate-700">{formatRupiah(selectedOrder.biaya_ongkir)}</span>
                        </div>
                      )}
                      {selectedOrder.nama_kurir && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <span className="text-sm text-slate-500">Kurir</span>
                          <span className="font-semibold text-slate-700">{selectedOrder.nama_kurir}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {(statusFlow[selectedOrder.status] ?? []).map(nextStatus => (
                        <Button
                          key={nextStatus}
                          className="flex-1"
                          variant={nextStatus === 'GAGAL' ? 'danger' : 'primary'}
                          onClick={() => handleUpdateStatus(selectedOrder, nextStatus)}
                        >
                          {nextStatus === 'DIPROSES' ? 'Proses' : nextStatus === 'DIANTAR' ? 'Antarkan' : nextStatus === 'TERKIRIM' ? 'Tandai Terkirim' : 'Gagal'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Modal>

              {/* Assign Courier Modal */}
              <Modal
                open={modal === 'courier'}
                onClose={() => { setModal(null); setSelectedOrder(null) }}
                title="Tugaskan Kurir"
                size="sm"
                footer={
                  <>
                    <Button variant="secondary" onClick={() => { setModal(null); setSelectedOrder(null) }} className="w-full sm:w-auto">Batal</Button>
                    <Button loading={submitting} onClick={handleAssignCourier} className="w-full sm:w-auto">Tugaskan</Button>
                  </>
                }
              >
                <Input
                  label="Nama Kurir"
                  value={formCourier.kd_kurir}
                  onChange={e => setFormCourier({ kd_kurir: e.target.value })}
                  placeholder="Masukkan nama kurir"
                />
                <p className="text-xs text-slate-400 mt-2">Fitur kurir terdaftar akan segera hadir. Untuk saat ini masukkan nama kurir manual.</p>
              </Modal>

              {/* Create Order Modal */}
              <Modal
                open={modal === 'order'}
                onClose={() => { setModal(null); resetFormOrder() }}
                title="Buat Delivery"
                size="md"
                footer={
                  <>
                    <Button variant="secondary" onClick={() => { setModal(null); resetFormOrder() }} className="w-full sm:w-auto">Batal</Button>
                    <Button loading={submitting} onClick={handleSaveOrder} className="w-full sm:w-auto">Simpan</Button>
                  </>
                }
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Nama Penerima *" value={formOrder.nama_penerima} onChange={e => setFormOrder(prev => ({ ...prev, nama_penerima: e.target.value }))} placeholder="Nama" />
                    <Input label="No Telepon *" value={formOrder.no_telp_penerima} onChange={e => setFormOrder(prev => ({ ...prev, no_telp_penerima: e.target.value }))} placeholder="08123456789" />
                  </div>
                  <Input label="Kode Transaksi (Opsional)" value={formOrder.kd_transaksi} onChange={e => setFormOrder(prev => ({ ...prev, kd_transaksi: e.target.value }))} placeholder="TRX-001" />
                  <Textarea label="Alamat *" value={formOrder.alamat} onChange={e => setFormOrder(prev => ({ ...prev, alamat: e.target.value }))} placeholder="Alamat lengkap..." />
                  <Input label="Catatan Alamat" value={formOrder.catatan_alamat} onChange={e => setFormOrder(prev => ({ ...prev, catatan_alamat: e.target.value }))} placeholder="Patokan, pintu belakang..." />
                  <Input label="Biaya Ongkir" type="number" value={formOrder.biaya_ongkir} onChange={e => setFormOrder(prev => ({ ...prev, biaya_ongkir: e.target.value }))} placeholder="0" />
                </div>
              </Modal>
            </>
          )}

          {tab === 'vehicles' && (
            <>
              {/* Vehicles Controls */}
              <div className="flex justify-end">
                <Button icon={<Plus size={16} />} onClick={() => { setEditVehicle(null); resetFormVehicle(); setModal('vehicle') }}>
                  Tambah Kendaraan
                </Button>
              </div>

              {/* Vehicles List */}
              <Card title="Daftar Kendaraan">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[600px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Plat</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Jenis</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Kapasitas</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Biaya/km</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {vehicles.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada kendaraan</td>
                          </tr>
                        ) : (
                          vehicles.map(v => (
                            <tr key={v.kd_kendaraan} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-3 sm:px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{v.nama}</td>
                              <td className="px-3 sm:px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{v.plat}</td>
                              <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{v.jenis}</td>
                              <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{v.kapasitas}</td>
                              <td className="px-3 sm:px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatRupiah(v.biaya_per_km)}</td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <Badge label={v.status} variant={v.status === 'AKTIF' ? 'green' : 'red'} />
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => { setEditVehicle(v); resetFormVehicle(v); setModal('vehicle') }}
                                    className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteVehicle(v)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 size={14} />
                                  </button>
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

              {/* Vehicle Form Modal */}
              <Modal
                open={modal === 'vehicle'}
                onClose={() => { setModal(null); setEditVehicle(null) }}
                title={editVehicle ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
                size="md"
                footer={
                  <>
                    <Button variant="secondary" onClick={() => { setModal(null); setEditVehicle(null) }} className="w-full sm:w-auto">Batal</Button>
                    <Button loading={submitting} onClick={handleSaveVehicle} className="w-full sm:w-auto">{editVehicle ? 'Simpan' : 'Tambah'}</Button>
                  </>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nama Kendaraan *" value={formVehicle.nama} onChange={e => setFormVehicle(prev => ({ ...prev, nama: e.target.value }))} placeholder="Mobil A" />
                  <Input label="Plat Nomor *" value={formVehicle.plat} onChange={e => setFormVehicle(prev => ({ ...prev, plat: e.target.value }))} placeholder="B 1234 XYZ" />
                  <Input label="Jenis *" value={formVehicle.jenis} onChange={e => setFormVehicle(prev => ({ ...prev, jenis: e.target.value }))} placeholder="Mobil, Motor" />
                  <Input label="Kapasitas" type="number" value={formVehicle.kapasitas} onChange={e => setFormVehicle(prev => ({ ...prev, kapasitas: e.target.value }))} placeholder="1000" helperText="kg" />
                  <Input label="Biaya per Km" type="number" value={formVehicle.biaya_per_km} onChange={e => setFormVehicle(prev => ({ ...prev, biaya_per_km: e.target.value }))} placeholder="5000" />
                  <Select label="Status" value={formVehicle.status} onChange={e => setFormVehicle(prev => ({ ...prev, status: e.target.value as 'AKTIF' | 'NONAKTIF' }))} options={[{ value: 'AKTIF', label: 'Aktif' }, { value: 'NONAKTIF', label: 'Nonaktif' }]} />
                </div>
              </Modal>

              <ConfirmDialog
                open={!!deleteVehicle}
                onClose={() => setDeleteVehicle(null)}
                onConfirm={handleDeleteVehicle}
                title="Hapus Kendaraan"
                message={`Kendaraan "${deleteVehicle?.nama}" akan dihapus.`}
                confirmText="Hapus"
                variant="danger"
                loading={submitting}
              >
                {deleteVehicle && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="flex justify-between"><span className="text-slate-500">Nama:</span><span className="font-semibold text-slate-800">{deleteVehicle.nama}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Plat:</span><span className="font-semibold text-slate-800">{deleteVehicle.plat}</span></div>
                  </div>
                )}
              </ConfirmDialog>
            </>
          )}
        </>
      )}
    </div>
  )
}
