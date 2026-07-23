import { useState } from 'react'
import { Percent, AlertTriangle } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Select from '../components/Select'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import type { Kategori } from '../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
  kategori: Kategori[]
  onDone: () => void
}

export default function BatchPriceUpdateModal({ open, onClose, kategori, onDone }: Props) {
  const toast = useToast()
  const [kdKategori, setKdKategori] = useState<number>(0)
  const [mode, setMode] = useState<'increase' | 'decrease' | 'set'>('increase')
  const [value, setValue] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ count: number; samples: { nama: string; lama: number; baru: number }[] } | null>(null)

  const handlePreview = async () => {
    if (!kdKategori || value <= 0) {
      toast('Pilih kategori dan isi nilai perubahan', 'error')
      return
    }
    setLoading(true)
    const r = await api<any>('barang:getByKategori', kdKategori)
    setLoading(false)
    if (!r.success || !r.data) {
      toast('Gagal memuat data produk', 'error')
      return
    }

    const products = r.data as { nama_barang: string; harga_barang: number }[]
    const samples = products.slice(0, 5).map(p => {
      let baru = p.harga_barang
      if (mode === 'increase') baru = p.harga_barang + (p.harga_barang * value / 100)
      else if (mode === 'decrease') baru = Math.max(0, p.harga_barang - (p.harga_barang * value / 100))
      else baru = value
      return { nama: p.nama_barang ?? '', lama: p.harga_barang, baru: Math.round(baru) }
    })

    setPreview({ count: products.length, samples })
  }

  const handleApply = async () => {
    if (!preview || !kdKategori) return
    setLoading(true)
    const r = await api('barang:batchUpdatePrice', {
      kd_kategori: kdKategori,
      mode,
      value,
    })
    setLoading(false)
    if (r.success) {
      toast(`Harga ${preview.count} produk berhasil diperbarui`, 'success')
      setPreview(null)
      setKdKategori(0)
      setValue(0)
      onDone()
      onClose()
    } else {
      toast(r.message as string ?? 'Gagal memperbarui harga', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update Harga Massal"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          {preview ? (
            <Button loading={loading} onClick={handleApply} variant="success">
              Terapkan ke {preview.count} Produk
            </Button>
          ) : (
            <Button loading={loading} onClick={handlePreview} icon={<Percent size={14} />}>
              Preview Perubahan
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Kategori Produk"
          value={kdKategori}
          onChange={e => { setKdKategori(+e.target.value); setPreview(null) }}
          placeholder="-- Pilih Kategori --"
          options={kategori.map(k => ({ value: k.kd_kategori_barang, label: k.kategori_barang ?? '' }))}
        />

        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'increase', label: 'Naikkan %' },
            { key: 'decrease', label: 'Turunkan %' },
            { key: 'set', label: 'Set Harga' },
          ] as const).map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setPreview(null) }}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                mode === m.key
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Input
          label={mode === 'set' ? 'Harga Baru (Rp)' : 'Persentase (%)'}
          type="number"
          value={value}
          onChange={e => { setValue(+e.target.value); setPreview(null) }}
          placeholder={mode === 'set' ? 'Contoh: 15000' : 'Contoh: 10'}
        />

        {preview && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>{preview.count} produk</strong> akan diperbarui harganya. Preview 5 produk pertama:
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500">Produk</th>
                    <th className="px-3 py-2 text-right text-slate-500">Harga Lama</th>
                    <th className="px-3 py-2 text-right text-slate-500">Harga Baru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {preview.samples.map((s, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{s.nama}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{s.lama.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-right font-bold text-primary-600 dark:text-primary-400">{s.baru.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
