import { useCallback, useEffect, useRef, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Barcode, AlertTriangle, Image, X, Upload, Camera, ScanLine } from 'lucide-react'
import Barcode_ from 'react-barcode'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonPage } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { ensureCameraPermission } from '../utils/nativePermissions'
import type { Barang, IpcResponse, Kategori, Satuan } from '../../shared/types'

interface FormState {
  kd_barang: string
  nama_barang: string
  stok: number
  harga_barang: number
  harga_modal: number
  potongan: number
  kd_kategori_barang: number
  kd_satuan: number
  deskripsi_barang: string
  barcode: string
  expired_date: string
  foto_barang: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type PaginatedResponse<T> = IpcResponse<T> & { pagination?: PaginationMeta }

const EMPTY: FormState = {
  kd_barang: '', nama_barang: '', stok: 0, harga_barang: 0, harga_modal: 0,
  potongan: 0, kd_kategori_barang: 0, kd_satuan: 0, deskripsi_barang: '',
  barcode: '', expired_date: '', foto_barang: '',
}

function getExpiredStatus(expired_date: string | null) {
  if (!expired_date) return null
  const today = new Date()
  const exp = new Date(expired_date)
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'soon'
  return 'ok'
}

export default function Produk() {
  const toast = useToast()
  const [data, setData] = useState<Barang[]>([])
  const [kategori, setKategori] = useState<Kategori[]>([])
  const [satuan, setSatuan] = useState<Satuan[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'barcode' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Barang | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showImport, setShowImport] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [productPageIndex, setProductPageIndex] = useState(0)
  const [productPageSize, setProductPageSize] = useState(25)
  const [productSearch, setProductSearch] = useState('')
  const [productSortBy, setProductSortBy] = useState('nama_barang')
  const [productSortOrder, setProductSortOrder] = useState<'ASC' | 'DESC'>('ASC')
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false)
  const [cameraScannerError, setCameraScannerError] = useState('')
  const [cameraScannerStatus, setCameraScannerStatus] = useState('Menyiapkan kamera...')
  const [productPagination, setProductPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })

  const loadProducts = useCallback(async () => {
    setTableLoading(true)
    const r = await api<Barang[]>('barang:getPaginated', {
      page: productPageIndex + 1,
      limit: productPageSize,
      search: productSearch,
      sortBy: productSortBy,
      sortOrder: productSortOrder,
    }) as PaginatedResponse<Barang[]>
    if (r.success) {
      setData(r.data ?? [])
      setProductPagination(r.pagination ?? {
        page: productPageIndex + 1,
        limit: productPageSize,
        total: r.data?.length ?? 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: productPageIndex > 0,
      })
    }
    setTableLoading(false)
    setLoadingData(false)
  }, [productPageIndex, productPageSize, productSearch, productSortBy, productSortOrder])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const loadLookups = async () => {
      const [r2, r3] = await Promise.all([
        api<Kategori[]>('kategori:getAll'),
        api<Satuan[]>('satuan:getAll'),
      ])
      if (r2.success) setKategori(r2.data ?? [])
      if (r3.success) setSatuan(r3.data ?? [])
    }
    loadLookups()
  }, [])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add'); setFormErrors({}) }
  const openEdit = (row: Barang) => {
    setSelected(row)
    setForm({
      kd_barang: row.kd_barang,
      nama_barang: row.nama_barang ?? '',
      stok: row.stok ?? 0,
      harga_barang: row.harga_barang ?? 0,
      harga_modal: row.harga_modal ?? 0,
      potongan: row.potongan ?? 0,
      kd_kategori_barang: row.kd_kategori_barang ?? 0,
      kd_satuan: row.kd_satuan ?? 0,
      deskripsi_barang: row.deskripsi_barang ?? '',
      barcode: row.barcode ?? '',
      expired_date: row.expired_date ?? '',
      foto_barang: row.foto_barang ?? '',
    })
    setModal('edit')
  }
  const openBarcode = (row: Barang) => { setSelected(row); setModal('barcode') }
  const openDelete = (row: Barang) => { setSelected(row); setConfirmDelete(true) }
  const closeModal = () => { setModal(null); setSelected(null) }

  const stopCameraScanner = useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    cameraStreamRef.current?.getTracks().forEach(track => track.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraScannerOpen(false)
  }, [])

  useEffect(() => stopCameraScanner, [stopCameraScanner])

  const handleCameraBarcode = useCallback((barcode: string) => {
    setForm(prev => ({ ...prev, barcode }))
    toast(`Barcode ${barcode} berhasil dipindai`)
    stopCameraScanner()
  }, [stopCameraScanner, toast])

  const openCameraScanner = async () => {
    const permission = await ensureCameraPermission()
    if (!permission.granted) {
      toast(permission.message ?? 'Izin kamera ditolak', 'error')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast('Kamera tidak tersedia di perangkat ini', 'error')
      return
    }

    setCameraScannerError('')
    setCameraScannerStatus('Menyiapkan kamera...')
    setCameraScannerOpen(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector
      if (!BarcodeDetectorCtor) {
        setCameraScannerError('Pemindai barcode kamera belum didukung oleh WebView ini. Gunakan scanner Bluetooth/USB atau ketik barcode.')
        return
      }

      const detector = new BarcodeDetectorCtor({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
      })
      setCameraScannerStatus('Arahkan kamera ke barcode produk')

      scanIntervalRef.current = window.setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return

        try {
          const codes = await detector.detect(video)
          const rawValue = codes?.[0]?.rawValue
          if (rawValue) handleCameraBarcode(String(rawValue).trim())
        } catch (error) {
          setCameraScannerError(error instanceof Error ? error.message : 'Gagal membaca barcode')
        }
      }, 500)
    } catch (error) {
      setCameraScannerError(error instanceof Error ? error.message : 'Gagal membuka kamera')
    }
  }

  const handleSave = async () => {
    const errors: Record<string, string> = {}
    if (!form.kd_barang) errors.kd_barang = 'Kode barang wajib diisi'
    if (!form.nama_barang) errors.nama_barang = 'Nama barang wajib diisi'
    if (form.harga_barang < 0) errors.harga_barang = 'Harga tidak boleh negatif'
    if (form.harga_modal < 0) errors.harga_modal = 'Harga modal tidak boleh negatif'
    if (form.stok < 0) errors.stok = 'Stok tidak boleh negatif'
    if (form.potongan < 0 || form.potongan > 100) errors.potongan = 'Diskon 0-100%'
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }

    setLoading(true)
    const r = modal === 'add'
      ? await api('barang:create', form)
      : await api('barang:update', selected!.kd_barang, form)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      closeModal()
      if (modal === 'add') setProductPageIndex(0)
      loadProducts()
    }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('barang:delete', selected!.kd_barang)
    setLoading(false)
    if (r.success) { toast(r.message as string); setConfirmDelete(false); setSelected(null); loadProducts() }
    else toast(r.message as string, 'error')
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return toast('Format CSV tidak valid', 'error')

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const products: Record<string, unknown>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        const val = values[idx] || ''
        row[h] = h === 'stok' || h === 'harga_barang' || h === 'harga_modal' || h === 'potongan' || h === 'kd_kategori_barang' || h === 'kd_satuan'
          ? parseFloat(val) || 0
          : val
      })
      products.push(row)
    }

    setLoading(true)
    const r = await api('barang:bulkImport', products)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setShowImport(false)
      setProductPageIndex(0)
      loadProducts()
    }
    else toast(r.message as string, 'error')
  }

  const columns: ColumnDef<Barang>[] = [
    { accessorKey: 'kd_barang', header: 'Kode', size: 120 },
    {
      accessorKey: 'foto_barang', header: 'Foto', size: 80,
      cell: ({ getValue }) => {
        const foto = getValue() as string | null
        return foto ? (
          <img src={foto} alt="Produk" className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Image size={20} className="text-slate-400" />
          </div>
        )
      }
    },
    { accessorKey: 'nama_barang', header: 'Nama Produk' },
    {
      accessorKey: 'kategori_barang', header: 'Kategori',
      cell: ({ getValue }) => <Badge label={String(getValue() ?? '-')} variant="blue" />,
    },
    {
      accessorKey: 'harga_barang', header: 'Harga Jual',
      cell: ({ getValue }) => formatRupiah(getValue() as number),
    },
    {
      accessorKey: 'stok', header: 'Stok',
      cell: ({ getValue }) => {
        const v = getValue() as number
        return <Badge label={String(v)} variant={v <= 5 ? 'red' : v <= 20 ? 'yellow' : 'green'} />
      },
    },
    {
      accessorKey: 'expired_date', header: 'Expired',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        if (!v) return <span className="text-slate-400 text-xs">-</span>
        const status = getExpiredStatus(v)
        const label = new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        if (status === 'expired') return <Badge label={`Expired: ${label}`} variant="red" />
        if (status === 'soon') return <Badge label={`Segera: ${label}`} variant="yellow" />
        return <span className="text-xs text-slate-500">{label}</span>
      },
    },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => openBarcode(row.original)} title="Lihat Barcode" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <Barcode size={14} />
          </button>
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => openDelete(row.original)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const f = (k: keyof FormState, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast('File harus berupa gambar', 'error')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast('Ukuran gambar maksimal 2MB', 'error')
      return
    }
    
    const reader = new FileReader()
    reader.onload = () => {
      f('foto_barang', reader.result as string)
    }
    reader.readAsDataURL(file)
    e.currentTarget.value = ''
  }

  // Count current page expired/soon products for alert banner
  const expiredCount = data.filter(d => getExpiredStatus(d.expired_date) === 'expired').length
  const soonCount = data.filter(d => getExpiredStatus(d.expired_date) === 'soon').length

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonPage rows={7} />
      ) : (
        <>
          {(expiredCount > 0 || soonCount > 0) && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                {expiredCount > 0 && <strong>{expiredCount} produk di halaman ini sudah expired. </strong>}
                {soonCount > 0 && <strong>{soonCount} produk di halaman ini akan expired dalam 30 hari.</strong>}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {productPagination.total} produk terdaftar, {data.length} ditampilkan
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" icon={<Upload size={16} />} onClick={() => setShowImport(true)} className="w-full sm:w-auto">Import CSV</Button>
              <Button icon={<Plus size={16} />} onClick={openAdd} className="w-full sm:w-auto">Tambah Produk</Button>
            </div>
          </div>

          <Card>
            <DataTable
              data={data}
              columns={columns}
              searchPlaceholder="Cari produk..."
              defaultPageSize={25}
              manualPagination
              totalRows={productPagination.total}
              pageCount={productPagination.totalPages}
              pageIndex={productPageIndex}
              pageSize={productPageSize}
              loading={tableLoading}
              onPageChange={setProductPageIndex}
              onPageSizeChange={setProductPageSize}
              onSearchChange={search => {
                setProductSearch(search)
                setProductPageIndex(0)
              }}
              onSortChange={(sortBy, sortOrder) => {
                setProductSortBy(sortBy || 'nama_barang')
                setProductSortOrder(sortOrder)
                setProductPageIndex(0)
              }}
            />
          </Card>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Tambah Produk' : 'Edit Produk'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleSave} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Kode Barang *" value={form.kd_barang} onChange={e => f('kd_barang', e.target.value)} disabled={modal === 'edit'} error={formErrors.kd_barang} />
          <Input label="Nama Barang *" value={form.nama_barang} onChange={e => f('nama_barang', e.target.value)} error={formErrors.nama_barang} />
          <Input label="Harga Jual" type="number" value={form.harga_barang} onChange={e => f('harga_barang', +e.target.value)} error={formErrors.harga_barang} />
          <Input label="Harga Modal" type="number" value={form.harga_modal} onChange={e => f('harga_modal', +e.target.value)} error={formErrors.harga_modal} />
          <Input label="Stok" type="number" value={form.stok} onChange={e => f('stok', +e.target.value)} error={formErrors.stok} />
          <Input label="Diskon (%)" type="number" value={form.potongan} onChange={e => f('potongan', +e.target.value)} error={formErrors.potongan} />
          <Select
            label="Kategori"
            value={form.kd_kategori_barang}
            onChange={e => f('kd_kategori_barang', +e.target.value)}
            placeholder="-- Pilih Kategori --"
            options={kategori.map(k => ({ value: k.kd_kategori_barang, label: k.kategori_barang ?? '' }))}
          />
          <Select
            label="Satuan"
            value={form.kd_satuan}
            onChange={e => f('kd_satuan', +e.target.value)}
            placeholder="-- Pilih Satuan --"
            options={satuan.map(s => ({ value: s.kd_satuan, label: s.nama_satuan ?? '' }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Barcode</label>
            <div className="flex gap-2">
              <input
                value={form.barcode}
                onChange={e => f('barcode', e.target.value)}
                placeholder="Scan atau ketik barcode..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <Button
                type="button"
                variant="secondary"
                icon={<ScanLine size={16} />}
                onClick={openCameraScanner}
                className="shrink-0 px-3"
              >
                <span className="hidden sm:inline">Scan</span>
              </Button>
            </div>
          </div>
          <Input label="Tanggal Expired" type="date" value={form.expired_date} onChange={e => f('expired_date', e.target.value)} />
          
          {/* Image Upload */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Foto Produk</label>
            <div className="flex gap-3 items-start">
              {form.foto_barang ? (
                <div className="relative group">
                  <img src={form.foto_barang} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2 border-slate-200 dark:border-slate-600" />
                  <button
                    type="button"
                    onClick={() => f('foto_barang', '')}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                  <Image size={32} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-capture"
                />
                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="image-capture"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 cursor-pointer"
                  >
                    <Camera size={16} />
                    Ambil Foto
                  </label>
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Image size={16} />
                    {form.foto_barang ? 'Ganti File' : 'Upload File'}
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Format: JPG, PNG, GIF. Maksimal 2MB.
                </p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Textarea label="Deskripsi" rows={3} value={form.deskripsi_barang} onChange={e => f('deskripsi_barang', e.target.value)} placeholder="Deskripsi produk..." />
          </div>
        </div>
      </Modal>

      {/* Barcode Preview Modal */}
      <Modal open={modal === 'barcode'} onClose={closeModal} title="Barcode Produk" size="sm">
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="font-medium text-slate-700 dark:text-slate-200">{selected?.nama_barang}</p>
          {selected?.barcode ? (
            <div className="bg-white p-3 rounded-xl">
              <Barcode_ value={selected.barcode} width={1.5} height={60} fontSize={12} />
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <Barcode size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada barcode untuk produk ini.</p>
              <p className="text-xs mt-1">Edit produk untuk menambahkan barcode.</p>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={cameraScannerOpen} onClose={stopCameraScanner} title="Scan Barcode Produk" size="md"
        footer={<Button variant="secondary" onClick={stopCameraScanner} className="w-full sm:w-auto">Tutup Kamera</Button>}
      >
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-700">
            <video ref={videoRef} muted playsInline className="h-72 w-full object-cover" />
          </div>
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            cameraScannerError
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            <Camera size={16} className="mt-0.5 shrink-0" />
            <span>{cameraScannerError || cameraScannerStatus}</span>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => { setConfirmDelete(false); setSelected(null) }}
        onConfirm={handleDelete}
        loading={loading}
        title="Hapus Produk"
        message={`Yakin ingin menghapus produk "${selected?.nama_barang}"? Tindakan ini tidak dapat dibatalkan.`}
      />

      {/* Import CSV Modal */}
      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Produk dari CSV"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowImport(false)} className="w-full sm:w-auto">Batal</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
            <p className="font-semibold mb-2">Format CSV yang didukung:</p>
            <p className="font-mono">kd_barang, nama_barang, harga_barang, harga_modal, stok, potongan, kd_kategori_barang, kd_satuan, barcode</p>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportCsv}
            className="hidden"
            id="csv-import"
          />
          <label
            htmlFor="csv-import"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-colors"
          >
            <Upload size={20} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Pilih File CSV</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
