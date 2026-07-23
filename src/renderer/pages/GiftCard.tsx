import { useEffect, useState } from 'react'
import { Gift, Plus, Search, TrendingUp, History, Copy, Check } from 'lucide-react'
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

interface GiftCard {
  kd_giftcard: number
  kode: string
  nominal: number
  saldo: number
  pembeli: string
  penerima: string
  pesan: string | null
  status: 'AKTIF' | 'TERPAKAI' | 'EXPIRED' | 'DICAIRKAN'
  masa_berlaku: string
  created_at: string
}

interface GiftCardUsage {
  kd_penggunaan: number
  kd_giftcard: number
  jumlah: number
  tgl_penggunaan: string
  keterangan: string | null
}

export default function GiftCard() {
  const toast = useToast()
  const { user } = useAuth()
  const [cards, setCards] = useState<GiftCard[]>([])
  const [usage, setUsage] = useState<GiftCardUsage[]>([])
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)
  const [modal, setModal] = useState<'create' | 'topup' | 'usage' | null>(null)
  const [form, setForm] = useState({ nominal: '', pembeli: '', penerima: '', pesan: '', masa_berlaku: '' })
  const [topupForm, setTopupForm] = useState({ jumlah: '', keterangan: '' })
  const [searchCode, setSearchCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    const r = await api<GiftCard[]>('giftcard:getAll')
    if (r.success) setCards(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const loadUsage = async (kd_giftcard: number) => {
    const r = await api<GiftCardUsage[]>('giftcard:getUsage', kd_giftcard)
    if (r.success) setUsage(r.data ?? [])
  }

  const handleCreate = async () => {
    if (!form.nominal || !form.pembeli || !form.masa_berlaku) {
      return toast('Nominal, pembeli, dan masa berlaku wajib diisi', 'error')
    }
    setLoading(true)
    const r = await api('giftcard:create', {
      nominal: parseFloat(form.nominal),
      pembeli: form.pembeli,
      penerima: form.penerima,
      pesan: form.pesan || null,
      masa_berlaku: form.masa_berlaku,
    })
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setModal(null)
      setForm({ nominal: '', pembeli: '', penerima: '', pesan: '', masa_berlaku: '' })
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleTopUp = async () => {
    if (!topupForm.jumlah || !selectedCard) {
      return toast('Jumlah wajib diisi', 'error')
    }
    setLoading(true)
    const r = await api('giftcard:topUp', selectedCard.kd_giftcard, parseFloat(topupForm.jumlah), topupForm.keterangan || null)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setModal(null)
      setTopupForm({ jumlah: '', keterangan: '' })
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleSearchByCode = async () => {
    if (!searchCode.trim()) return load()
    setLoading(true)
    const r = await api<GiftCard[]>('giftcard:getByCode', searchCode.trim())
    setLoading(false)
    if (r.success) setCards(r.data ?? [])
  }

  useEffect(() => {
    if (!searchCode.trim()) load()
  }, [searchCode])

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  const openUsage = (card: GiftCard) => {
    setSelectedCard(card)
    loadUsage(card.kd_giftcard)
    setModal('usage')
  }

  const openTopup = (card: GiftCard) => {
    setSelectedCard(card)
    setTopupForm({ jumlah: '', keterangan: '' })
    setModal('topup')
  }

  const statusVariant: Record<string, 'green' | 'gray' | 'red' | 'amber'> = {
    AKTIF: 'green', TERPAKAI: 'gray', EXPIRED: 'red', DICAIRKAN: 'amber'
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={3} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari kode gift card..."
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
                className="max-w-xs"
              />
              {searchCode && (
                <Button variant="secondary" size="sm" onClick={handleSearchByCode}>
                  <Search size={16} />
                </Button>
              )}
            </div>
            <Button icon={<Plus size={16} />} onClick={() => { setForm({ nominal: '', pembeli: '', penerima: '', pesan: '', masa_berlaku: today }); setModal('create') }}>
              Buat Gift Card
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card title="Total Gift Card" action={<Gift size={16} className="text-primary-500" />}>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{cards.length}</p>
            </Card>
            <Card title="Total Nominal" action={<Gift size={16} className="text-emerald-500" />}>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {formatRupiah(cards.reduce((s, c) => s + c.nominal, 0))}
              </p>
            </Card>
            <Card title="Saldo Tersisa" action={<TrendingUp size={16} className="text-blue-500" />}>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {formatRupiah(cards.reduce((s, c) => s + c.saldo, 0))}
              </p>
            </Card>
          </div>

          <Card title="Daftar Gift Card">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[768px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kode</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nominal</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Saldo</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pembeli</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Penerima</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Masa Berlaku</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {cards.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada gift card</td>
                      </tr>
                    ) : (
                      cards.map(c => (
                        <tr key={c.kd_giftcard} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{c.kode}</code>
                              <button onClick={() => copyCode(c.kode)} className="p-0.5 hover:text-primary-500 transition-colors" title="Salin kode">
                                {copied === c.kode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">{formatRupiah(c.nominal)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(c.saldo)}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{c.pembeli}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{c.penerima || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={c.status} variant={statusVariant[c.status] || 'green'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateTime(c.masa_berlaku)}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openUsage(c)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Riwayat Penggunaan">
                                <History size={14} />
                              </button>
                              {c.status === 'AKTIF' && (
                                <button onClick={() => openTopup(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors" title="Top Up">
                                  <TrendingUp size={14} />
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

          {/* Create Modal */}
          <Modal
            open={modal === 'create'}
            onClose={() => setModal(null)}
            title="Buat Gift Card Baru"
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleCreate} className="w-full sm:w-auto">Buat</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Nominal *" type="number" value={form.nominal} onChange={e => setForm(p => ({ ...p, nominal: e.target.value }))} placeholder="0" />
              <Input label="Pembeli *" value={form.pembeli} onChange={e => setForm(p => ({ ...p, pembeli: e.target.value }))} placeholder="Nama pembeli" />
              <Input label="Penerima" value={form.penerima} onChange={e => setForm(p => ({ ...p, penerima: e.target.value }))} placeholder="Nama penerima (opsional)" />
              <Textarea label="Pesan" value={form.pesan} onChange={e => setForm(p => ({ ...p, pesan: e.target.value }))} placeholder="Pesan untuk penerima (opsional)" />
              <Input label="Masa Berlaku *" type="date" value={form.masa_berlaku} onChange={e => setForm(p => ({ ...p, masa_berlaku: e.target.value }))} />
            </div>
          </Modal>

          {/* Top Up Modal */}
          <Modal
            open={modal === 'topup'}
            onClose={() => setModal(null)}
            title={`Top Up - ${selectedCard?.kode ?? ''}`}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleTopUp} className="w-full sm:w-auto">Top Up</Button>
              </>
            }
          >
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500">Saldo Saat Ini</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{formatRupiah(selectedCard?.saldo ?? 0)}</p>
              </div>
              <Input label="Jumlah *" type="number" value={topupForm.jumlah} onChange={e => setTopupForm(p => ({ ...p, jumlah: e.target.value }))} placeholder="0" />
              <Input label="Keterangan" value={topupForm.keterangan} onChange={e => setTopupForm(p => ({ ...p, keterangan: e.target.value }))} placeholder="Keterangan top up" />
            </div>
          </Modal>

          {/* Usage History Modal */}
          <Modal
            open={modal === 'usage'}
            onClose={() => setModal(null)}
            title={`Riwayat Penggunaan - ${selectedCard?.kode ?? ''}`}
            size="md"
            footer={<Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Tutup</Button>}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500">Nominal</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{formatRupiah(selectedCard?.nominal ?? 0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500">Sisa Saldo</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{formatRupiah(selectedCard?.saldo ?? 0)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tanggal</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Jumlah</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {usage.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-10 text-center text-slate-400">Belum ada penggunaan</td>
                      </tr>
                    ) : (
                      usage.map(u => (
                        <tr key={u.kd_penggunaan}>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{formatDateTime(u.tgl_penggunaan)}</td>
                          <td className="px-3 py-2 text-right font-medium text-red-600">{formatRupiah(u.jumlah)}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{u.keterangan || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
