import { useState, useEffect, useCallback } from 'react'
import { Tag, Search, Printer, CheckSquare, Square } from 'lucide-react'
import Barcode_ from 'react-barcode'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import { Skeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import type { Kategori } from '../../shared/types'

interface ProductItem {
  kd_barang: string
  nama_barang: string | null
  harga_barang: number
  barcode: string | null
}

const LABEL_SIZES = [
  { value: 'small', label: 'Kecil (40x25mm)', w: 40, h: 25 },
  { value: 'medium', label: 'Sedang (60x40mm)', w: 60, h: 40 },
  { value: 'large', label: 'Besar (80x50mm)', w: 80, h: 50 },
]

export default function LabelPrint() {
  const toast = useToast()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [kategori, setKategori] = useState<Kategori[]>([])
  const [loading, setLoading] = useState(true)
  const [kdKategori, setKdKategori] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [labelSize, setLabelSize] = useState('medium')
  const [showBarcode, setShowBarcode] = useState(true)
  const [copies, setCopies] = useState(1)

  const loadKategori = useCallback(async () => {
    const r = await api<Kategori[]>('kategori:getAll')
    if (r.success) setKategori(r.data ?? [])
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const r = await api<ProductItem[]>('priceList:get', kdKategori, search)
    if (r.success) setProducts(r.data ?? [])
    setLoading(false)
  }, [kdKategori, search])

  useEffect(() => { loadKategori() }, [loadKategori])
  useEffect(() => { loadProducts() }, [loadProducts])

  const toggleSelect = (kd: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(kd)) next.delete(kd)
      else next.add(kd)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === products.length) setSelected(new Set())
    else setSelected(new Set(products.map(p => p.kd_barang)))
  }

  const selectedProducts = products.filter(p => selected.has(p.kd_barang))
  const size = LABEL_SIZES.find(s => s.value === labelSize) ?? LABEL_SIZES[1]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Tag size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Label Cetak</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cetak label harga dan barcode sticker per produk</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <Select label="Kategori" value={kdKategori} onChange={e => { setKdKategori(+e.target.value); setSelected(new Set()) }}
            options={[{ value: 0, label: 'Semua' }, ...kategori.map(k => ({ value: k.kd_kategori_barang, label: k.kategori_barang ?? '' }))]} className="w-40" />
          <div className="flex-1">
            <Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <Select label="Ukuran" value={labelSize} onChange={e => setLabelSize(e.target.value)}
            options={LABEL_SIZES.map(s => ({ value: s.value, label: s.label }))} className="w-44" />
          <Input label="Jumlah" type="number" value={copies} onChange={e => setCopies(Math.max(1, +e.target.value))} className="w-20" />
          <Button icon={<Printer size={14} />} onClick={() => window.print()} disabled={selected.size === 0}>
            Cetak ({selected.size})
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={showBarcode} onChange={e => setShowBarcode(e.target.checked)} className="rounded border-slate-300" />
            Tampilkan Barcode
          </label>
          <button onClick={selectAll} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
            {selected.size === products.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
          </button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="w-4 h-4 rounded" />
                </div>
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-10 w-full rounded bg-white dark:bg-slate-800" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Tag size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Tidak ada produk</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map(p => (
              <button key={p.kd_barang} onClick={() => toggleSelect(p.kd_barang)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                  selected.has(p.kd_barang)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}>
                <div className="absolute top-2 right-2">
                  {selected.has(p.kd_barang) ? <CheckSquare size={16} className="text-primary-500" /> : <Square size={16} className="text-slate-300" />}
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate pr-5">{p.nama_barang}</p>
                <p className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-1">{formatRupiah(p.harga_barang)}</p>
                {showBarcode && p.barcode && (
                  <div className="mt-2 bg-white p-1 rounded">
                    <Barcode_ value={p.barcode} width={0.8} height={30} fontSize={8} margin={0} />
                  </div>
                )}
                <p className="text-[9px] text-slate-400 font-mono mt-1">{p.kd_barang}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Print area - hidden on screen, shown on print */}
      <div className="hidden print:block">
        <div className="flex flex-wrap gap-1">
          {selectedProducts.map(p => (
            Array.from({ length: copies }).map((_, ci) => (
              <div key={`${p.kd_barang}-${ci}`} className="border border-dashed border-slate-300 p-2 text-center" style={{ width: `${size.w}mm`, height: `${size.h}mm` }}>
                <p className="text-[8px] font-bold truncate">{p.nama_barang}</p>
                <p className="text-[10px] font-bold">{formatRupiah(p.harga_barang)}</p>
                {showBarcode && p.barcode && (
                  <Barcode_ value={p.barcode} width={0.7} height={20} fontSize={6} margin={0} />
                )}
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  )
}
