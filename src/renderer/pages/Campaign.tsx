import { useEffect, useState } from 'react'
import { Send, Plus, Mail, MessageSquare, Smartphone, Target, Calendar, AlertCircle } from 'lucide-react'
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
import { formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Campaign {
  kd_kampanye: number
  nama: string
  tipe: 'EMAIL' | 'SMS' | 'WHATSAPP'
  status: 'DRAFT' | 'TERJADWAL' | 'TERKIRIM' | 'GAGAL'
  subjek: string | null
  konten: string | null
  target: string
  tgl_terjadwal: string | null
  tgl_terkirim: string | null
  total_target: number
  total_terkirim: number
  total_gagal: number
  total_dibuka: number
  created_at: string
}

interface CampaignLog {
  kd_log: number
  kd_kampanye: number
  aksi: string
  detail: string | null
  created_at: string
}

export default function Campaign() {
  const toast = useToast()
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [logs, setLogs] = useState<CampaignLog[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [modal, setModal] = useState<'add' | 'edit' | 'logs' | null>(null)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [sendConfirm, setSendConfirm] = useState<Campaign | null>(null)
  const [form, setForm] = useState({
    nama: '', tipe: 'EMAIL', subjek: '', konten: '', target: 'SEMUA', tgl_terjadwal: ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null)

  const load = async () => {
    const r = await api<Campaign[]>('campaign:getAll')
    if (r.success) setCampaigns(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const loadLogs = async (kd_kampanye: number) => {
    const r = await api<CampaignLog[]>('campaign:getLogs', kd_kampanye)
    if (r.success) setLogs(r.data ?? [])
  }

  const handleSave = async () => {
    if (!form.nama || !form.konten) {
      return toast('Nama dan konten wajib diisi', 'error')
    }
    setLoading(true)
    const payload = { ...form, tgl_terjadwal: form.tgl_terjadwal || null }
    if (modal === 'add') {
      const r = await api('campaign:create', payload)
      if (r.success) { toast(r.message as string); setModal(null); resetForm(); load() }
      else toast(r.message as string, 'error')
    } else if (modal === 'edit' && editCampaign) {
      const r = await api('campaign:update', editCampaign.kd_kampanye, payload)
      if (r.success) { toast(r.message as string); setModal(null); setEditCampaign(null); load() }
      else toast(r.message as string, 'error')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ nama: '', tipe: 'EMAIL', subjek: '', konten: '', target: 'SEMUA', tgl_terjadwal: '' })
  }

  const openEdit = (c: Campaign) => {
    setEditCampaign(c)
    setForm({
      nama: c.nama, tipe: c.tipe, subjek: c.subjek || '',
      konten: c.konten || '', target: c.target,
      tgl_terjadwal: c.tgl_terjadwal ? c.tgl_terjadwal.split('T')[0] : ''
    })
    setModal('edit')
  }

  const handleSend = async () => {
    if (!sendConfirm) return
    setLoading(true)
    const r = await api('campaign:send', sendConfirm.kd_kampanye)
    setLoading(false)
    if (r.success) { toast(r.message as string); setSendConfirm(null); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    if (!deleteCampaign) return
    setLoading(true)
    const r = await api('campaign:delete', deleteCampaign.kd_kampanye)
    setLoading(false)
    if (r.success) { toast(r.message as string); setDeleteCampaign(null); load() }
    else toast(r.message as string, 'error')
  }

  const tipeIcon: Record<string, React.ReactNode> = {
    EMAIL: <Mail size={14} />,
    SMS: <MessageSquare size={14} />,
    WHATSAPP: <Smartphone size={14} />,
  }

  const tipeColors: Record<string, string> = {
    EMAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SMS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    WHATSAPP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const statusVariant: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
    DRAFT: 'gray', TERJADWAL: 'blue', TERKIRIM: 'green', GAGAL: 'red'
  }

  const targetOptions = [
    { value: 'SEMUA', label: 'Semua Pelanggan' },
    { value: 'PELANGGAN_AKTIF', label: 'Pelanggan Aktif' },
    { value: 'PELANGGAN_BARU', label: 'Pelanggan Baru' },
    { value: 'PELANGGAN_VIP', label: 'Pelanggan VIP' },
    { value: 'PELANGGAN_NONAKTIF', label: 'Pelanggan Nonaktif' },
  ]

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-primary-500" />
              <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">Kampanye Marketing</span>
            </div>
            <Button icon={<Plus size={16} />} onClick={() => { resetForm(); setModal('add') }}>Buat Kampanye</Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Total Kampanye" action={<Mail size={16} className="text-primary-500" />}>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{campaigns.length}</p>
            </Card>
            <Card title="Terkirim" action={<Send size={16} className="text-emerald-500" />}>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {campaigns.reduce((s, c) => s + c.total_terkirim, 0)}
              </p>
            </Card>
            <Card title="Dibuka" action={<Target size={16} className="text-blue-500" />}>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {campaigns.reduce((s, c) => s + c.total_dibuka, 0)}
              </p>
            </Card>
            <Card title="Gagal" action={<AlertCircle size={16} className="text-red-500" />}>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {campaigns.reduce((s, c) => s + c.total_gagal, 0)}
              </p>
            </Card>
          </div>

          <Card title="Daftar Kampanye">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[900px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nama</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tipe</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Target</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Terkirim</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Gagal</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Dibuka</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada kampanye</td>
                      </tr>
                    ) : (
                      campaigns.map(c => (
                        <tr key={c.kd_kampanye} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{c.nama}</p>
                              {c.tgl_terjadwal && (
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={10} />
                                  {formatDateTime(c.tgl_terjadwal)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tipeColors[c.tipe]}`}>
                              {tipeIcon[c.tipe]}
                              {c.tipe}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={c.status} variant={statusVariant[c.status] || 'gray'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{c.target.replace(/_/g, ' ')}</td>
                          <td className="px-3 sm:px-4 py-3 text-center font-medium text-emerald-600">{c.total_terkirim}</td>
                          <td className="px-3 sm:px-4 py-3 text-center font-medium text-red-600">{c.total_gagal}</td>
                          <td className="px-3 sm:px-4 py-3 text-center font-medium text-blue-600">{c.total_dibuka}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(c.status === 'DRAFT' || c.status === 'TERJADWAL') && (
                                <button onClick={() => setSendConfirm(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors" title="Kirim">
                                  <Send size={14} />
                                </button>
                              )}
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => { setSelectedCampaign(c); loadLogs(c.kd_kampanye); setModal('logs') }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Log">
                                <AlertCircle size={14} />
                              </button>
                              <button onClick={() => setDeleteCampaign(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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

          {/* Add/Edit Modal */}
          <Modal
            open={modal === 'add' || modal === 'edit'}
            onClose={() => { setModal(null); setEditCampaign(null) }}
            title={modal === 'add' ? 'Buat Kampanye Baru' : 'Edit Kampanye'}
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditCampaign(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleSave} className="w-full sm:w-auto">Simpan</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Nama Kampanye *" value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} placeholder="Nama kampanye" />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tipe *"
                  options={[
                    { value: 'EMAIL', label: 'Email' },
                    { value: 'SMS', label: 'SMS' },
                    { value: 'WHATSAPP', label: 'WhatsApp' },
                  ]}
                  value={form.tipe}
                  onChange={e => setForm(p => ({ ...p, tipe: e.target.value }))}
                />
                <Select
                  label="Target"
                  options={targetOptions}
                  value={form.target}
                  onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                />
              </div>
              {form.tipe === 'EMAIL' && (
                <Input label="Subjek Email" value={form.subjek} onChange={e => setForm(p => ({ ...p, subjek: e.target.value }))} placeholder="Subjek email" />
              )}
              <Textarea label="Konten *" value={form.konten} onChange={e => setForm(p => ({ ...p, konten: e.target.value }))} placeholder="Isi pesan kampanye..." rows={6} />
              <Input label="Tanggal Terjadwal" type="date" value={form.tgl_terjadwal} onChange={e => setForm(p => ({ ...p, tgl_terjadwal: e.target.value }))} />
            </div>
          </Modal>

          {/* Logs Modal */}
          <Modal
            open={modal === 'logs'}
            onClose={() => setModal(null)}
            title={`Log Kampanye - ${selectedCampaign?.nama ?? ''}`}
            size="md"
            footer={<Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Tutup</Button>}
          >
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-center text-slate-400 py-6">Belum ada log</p>
              ) : (
                logs.map(log => (
                  <div key={log.kd_log} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{log.aksi}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(log.created_at)}</span>
                    </div>
                    {log.detail && <p className="text-xs text-slate-500 mt-1">{log.detail}</p>}
                  </div>
                ))
              )}
            </div>
          </Modal>

          <ConfirmDialog
            open={!!sendConfirm}
            onClose={() => setSendConfirm(null)}
            onConfirm={handleSend}
            title="Kirim Kampanye"
            message={`Kampanye "${sendConfirm?.nama}" akan dikirim ke ${sendConfirm?.total_target ?? 0} target.`}
            confirmText="Kirim Sekarang"
            variant="success"
            loading={loading}
          />

          <ConfirmDialog
            open={!!deleteCampaign}
            onClose={() => setDeleteCampaign(null)}
            onConfirm={handleDelete}
            title="Hapus Kampanye"
            message={`Kampanye "${deleteCampaign?.nama}" akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
