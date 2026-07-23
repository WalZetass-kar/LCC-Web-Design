import { useEffect, useState } from 'react'
import { Package, Plus, Calculator, Clock, Search, Building2, Truck, Monitor, Sofa, Landmark, HardDrive } from 'lucide-react'
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

const KATEGORI_LIST = ['TANAH', 'BANGUNAN', 'KENDARAAN', 'PERALATAN', 'ELEKTRONIK', 'FURNITURE'] as const
const METODE_LIST = ['GARIS_LURUS', 'SALDO_MENURUN'] as const

interface FixedAsset {
  kd_aset: number
  kode_aset: string
  nama_aset: string
  kategori: typeof KATEGORI_LIST[number]
  deskripsi: string | null
  tgl_perolehan: string
  harga_perolehan: number
  nilai_residu: number
  masa_manfaat_tahun: number
  metode_penyusutan: typeof METODE_LIST[number]
  nilai_buku: number
  lokasi: string | null
  penanggung_jawab: string | null
  catatan: string | null
  status: 'AKTIF' | 'DISEWAKAN' | 'PERBAIKAN' | 'DIHAPUSKAN' | 'TERJUAL'
  created_at: string
}

interface DepreciationHistory {
  kd_depresiasi: number
  kd_aset: number
  tahun_ke: number
  penyusutan_tahunan: number
  akumulasi_penyusutan: number
  nilai_buku_awal: number
  nilai_buku_akhir: number
  tgl_hitung: string
}

const kategoriIcon: Record<string, React.ReactNode> = {
  TANAH: <Landmark size={16} />,
  BANGUNAN: <Building2 size={16} />,
  KENDARAAN: <Truck size={16} />,
  PERALATAN: <HardDrive size={16} />,
  ELEKTRONIK: <Monitor size={16} />,
  FURNITURE: <Sofa size={16} />,
}

const kategoriColors: Record<string, string> = {
  TANAH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BANGUNAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  KENDARAAN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  PERALATAN: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  ELEKTRONIK: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  FURNITURE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export default function FixedAsset() {
  const toast = useToast()
  const { user } = useAuth()
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [depHistory, setDepHistory] = useState<DepreciationHistory[]>([])
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null)
  const [modal, setModal] = useState<'add' | 'edit' | 'depreciation' | 'depHistory' | null>(null)
  const [editAsset, setEditAsset] = useState<FixedAsset | null>(null)
  const [form, setForm] = useState({
    nama_aset: '', kategori: 'PERALATAN', deskripsi: '', tgl_perolehan: '', harga_perolehan: '',
    nilai_residu: '0', masa_manfaat_tahun: '5', metode_penyusutan: 'GARIS_LURUS',
    lokasi: '', penanggung_jawab: '', catatan: ''
  })
  const [depTahun, setDepTahun] = useState('1')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [deleteAsset, setDeleteAsset] = useState<FixedAsset | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    const r = await api<FixedAsset[]>('asset:getAll')
    if (r.success) setAssets(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const loadDepHistory = async (kd_aset: number) => {
    const r = await api<DepreciationHistory[]>('asset:getDepreciationHistory', kd_aset)
    if (r.success) setDepHistory(r.data ?? [])
  }

  const handleSaveAsset = async () => {
    if (!form.nama_aset || !form.tgl_perolehan || !form.harga_perolehan) {
      return toast('Nama, tanggal perolehan, dan harga wajib diisi', 'error')
    }
    setLoading(true)
    const payload = { ...form, harga_perolehan: parseFloat(form.harga_perolehan), nilai_residu: parseFloat(form.nilai_residu), masa_manfaat_tahun: parseInt(form.masa_manfaat_tahun) }
    if (modal === 'add') {
      const r = await api('asset:create', payload)
      if (r.success) { toast(r.message as string); setModal(null); resetForm(); load() }
      else toast(r.message as string, 'error')
    } else if (modal === 'edit' && editAsset) {
      const r = await api('asset:update', editAsset.kd_aset, payload)
      if (r.success) { toast(r.message as string); setModal(null); setEditAsset(null); load() }
      else toast(r.message as string, 'error')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ nama_aset: '', kategori: 'PERALATAN', deskripsi: '', tgl_perolehan: '', harga_perolehan: '', nilai_residu: '0', masa_manfaat_tahun: '5', metode_penyusutan: 'GARIS_LURUS', lokasi: '', penanggung_jawab: '', catatan: '' })
  }

  const openEdit = (asset: FixedAsset) => {
    setEditAsset(asset)
    setForm({
      nama_aset: asset.nama_aset, kategori: asset.kategori, deskripsi: asset.deskripsi || '',
      tgl_perolehan: asset.tgl_perolehan.split('T')[0], harga_perolehan: asset.harga_perolehan.toString(),
      nilai_residu: asset.nilai_residu.toString(), masa_manfaat_tahun: asset.masa_manfaat_tahun.toString(),
      metode_penyusutan: asset.metode_penyusutan, lokasi: asset.lokasi || '',
      penanggung_jawab: asset.penanggung_jawab || '', catatan: asset.catatan || ''
    })
    setModal('edit')
  }

  const handleCalcDep = async () => {
    if (!selectedAsset || !depTahun) return
    setLoading(true)
    const r = await api('asset:calcDepreciation', selectedAsset.kd_aset, parseInt(depTahun))
    setLoading(false)
    if (r.success) { toast(r.message as string); setModal(null); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    if (!deleteAsset) return
    setLoading(true)
    const r = await api('asset:delete', deleteAsset.kd_aset)
    setLoading(false)
    if (r.success) { toast(r.message as string); setDeleteAsset(null); load() }
    else toast(r.message as string, 'error')
  }

  const statusVariant: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'amber'> = {
    AKTIF: 'green', DISEWAKAN: 'blue', PERBAIKAN: 'yellow', DIHAPUSKAN: 'red', TERJUAL: 'amber'
  }

  const filteredAssets = assets.filter(a =>
    a.nama_aset.toLowerCase().includes(search.toLowerCase()) ||
    a.kode_aset.toLowerCase().includes(search.toLowerCase()) ||
    a.kategori.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <Input
              placeholder="Cari aset/kode/kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button icon={<Plus size={16} />} onClick={() => { resetForm(); setModal('add') }}>Tambah Aset</Button>
          </div>

          <Card title="Daftar Aset Tetap">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[1024px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kode Aset</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nama</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kategori</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tgl Perolehan</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Harga Perolehan</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nilai Buku</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada aset tetap</td>
                      </tr>
                    ) : (
                      filteredAssets.map(a => (
                        <tr key={a.kd_aset} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-slate-500">#{a.kode_aset}</td>
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{a.nama_aset}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${kategoriColors[a.kategori]}`}>
                              {kategoriIcon[a.kategori]}
                              {a.kategori}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateTime(a.tgl_perolehan)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(a.harga_perolehan)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(a.nilai_buku)}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={a.status} variant={statusVariant[a.status] || 'green'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => { setSelectedAsset(a); setDepTahun('1'); setModal('depreciation') }}
                                className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                                title="Hitung Depresiasi"
                              >
                                <Calculator size={14} />
                              </button>
                              <button
                                onClick={() => { setSelectedAsset(a); loadDepHistory(a.kd_aset); setModal('depHistory') }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                                title="Riwayat Depresiasi"
                              >
                                <Clock size={14} />
                              </button>
                              <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => setDeleteAsset(a)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
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

          {/* Add/Edit Asset Modal */}
          <Modal
            open={modal === 'add' || modal === 'edit'}
            onClose={() => { setModal(null); setEditAsset(null) }}
            title={modal === 'add' ? 'Tambah Aset Tetap' : 'Edit Aset Tetap'}
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditAsset(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleSaveAsset} className="w-full sm:w-auto">Simpan</Button>
              </>
            }
          >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <Input label="Nama Aset *" value={form.nama_aset} onChange={e => setForm(p => ({ ...p, nama_aset: e.target.value }))} placeholder="Nama aset tetap" />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Kategori *"
                  options={KATEGORI_LIST.map(k => ({ value: k, label: k }))}
                  value={form.kategori}
                  onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}
                />
                <Select
                  label="Metode Penyusutan"
                  options={METODE_LIST.map(m => ({ value: m, label: m === 'GARIS_LURUS' ? 'Garis Lurus' : 'Saldo Menurun' }))}
                  value={form.metode_penyusutan}
                  onChange={e => setForm(p => ({ ...p, metode_penyusutan: e.target.value }))}
                />
              </div>
              <Textarea label="Deskripsi" value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} placeholder="Deskripsi aset" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tanggal Perolehan *" type="date" value={form.tgl_perolehan} onChange={e => setForm(p => ({ ...p, tgl_perolehan: e.target.value }))} />
                <Input label="Harga Perolehan *" type="number" value={form.harga_perolehan} onChange={e => setForm(p => ({ ...p, harga_perolehan: e.target.value }))} placeholder="0" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Nilai Residu" type="number" value={form.nilai_residu} onChange={e => setForm(p => ({ ...p, nilai_residu: e.target.value }))} placeholder="0" />
                <Input label="Masa Manfaat (thn)" type="number" value={form.masa_manfaat_tahun} onChange={e => setForm(p => ({ ...p, masa_manfaat_tahun: e.target.value }))} placeholder="5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Lokasi" value={form.lokasi} onChange={e => setForm(p => ({ ...p, lokasi: e.target.value }))} placeholder="Lokasi aset" />
                <Input label="Penanggung Jawab" value={form.penanggung_jawab} onChange={e => setForm(p => ({ ...p, penanggung_jawab: e.target.value }))} placeholder="Nama penanggung jawab" />
              </div>
              <Textarea label="Catatan" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} placeholder="Catatan tambahan" />
            </div>
          </Modal>

          {/* Depreciation Modal */}
          <Modal
            open={modal === 'depreciation'}
            onClose={() => setModal(null)}
            title={`Hitung Depresiasi - ${selectedAsset?.nama_aset ?? ''}`}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleCalcDep} className="w-full sm:w-auto">Hitung</Button>
              </>
            }
          >
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Nilai Buku Saat Ini</span><span className="font-semibold">{formatRupiah(selectedAsset?.nilai_buku ?? 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Metode</span><span className="font-semibold">{selectedAsset?.metode_penyusutan === 'GARIS_LURUS' ? 'Garis Lurus' : 'Saldo Menurun'}</span></div>
              </div>
              <Input
                label="Tahun Ke-"
                type="number"
                value={depTahun}
                onChange={e => setDepTahun(e.target.value)}
                placeholder="1"
              />
            </div>
          </Modal>

          {/* Depreciation History Modal */}
          <Modal
            open={modal === 'depHistory'}
            onClose={() => setModal(null)}
            title={`Riwayat Depresiasi - ${selectedAsset?.nama_aset ?? ''}`}
            size="md"
            footer={<Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Tutup</Button>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tahun Ke</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Penyusutan</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Akumulasi</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Nilai Awal</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Nilai Akhir</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tgl Hitung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {depHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-slate-400">Belum ada riwayat depresiasi</td>
                    </tr>
                  ) : (
                    depHistory.map(d => (
                      <tr key={d.kd_depresiasi} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2 font-medium">Tahun {d.tahun_ke}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatRupiah(d.penyusutan_tahunan)}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatRupiah(d.akumulasi_penyusutan)}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatRupiah(d.nilai_buku_awal)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatRupiah(d.nilai_buku_akhir)}</td>
                        <td className="px-3 py-2 text-slate-500">{formatDateTime(d.tgl_hitung)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteAsset}
            onClose={() => setDeleteAsset(null)}
            onConfirm={handleDelete}
            title="Hapus Aset Tetap"
            message={`Aset "${deleteAsset?.nama_aset}" (${deleteAsset?.kode_aset}) akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
