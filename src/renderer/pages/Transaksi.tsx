import { useEffect, useState, useRef, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Printer, UserCircle, X, Image, Settings, QrCode, Tag } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import StrukSettingsModal from '../components/StrukSettingsModal'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import type { Barang, CartItem, Customer, Identitas } from '../../shared/types'
import Struk from '../components/Struk'
import { useReactToPrint } from 'react-to-print'

interface SalePayload {
  username: string
  items: CartItem[]
  yang_dibayar: number
  jenis_pembayaran: 'TUNAI' | 'TRANSFER' | 'QRIS'
  kd_customer?: string
  pajak: number
  diskon_promo: number
  kode_promo?: string
  shift_id?: number
}

interface QrisPayment {
  provider?: 'static' | 'midtrans'
  orderId: string
  qrImageUrl?: string
  qrString?: string
  transactionId?: string
  transactionStatus?: string
}

interface QrisStatus {
  paid: boolean
  failed: boolean
  pending: boolean
  transactionStatus?: string
  fraudStatus?: string
}

export default function Transaksi() {
  const toast = useToast()
  const { user } = useAuth()
  const { trackUsage, isOverLimit, remainingUsage, isDemo } = useDemoGuard()
  const [products, setProducts] = useState<Barang[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [bayar, setBayar] = useState('')
  const [jenisBayar, setJenisBayar] = useState<'TUNAI' | 'TRANSFER' | 'QRIS'>('TUNAI')
  const [loading, setLoading] = useState(false)
  const [lastKd, setLastKd] = useState<string | null>(null)
  const [showStruk, setShowStruk] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showQris, setShowQris] = useState(false)
  const [qrisPayment, setQrisPayment] = useState<QrisPayment | null>(null)
  const [qrisStatus, setQrisStatus] = useState('Menyiapkan QRIS...')
  const [qrisChecking, setQrisChecking] = useState(false)
  const [qrisCompleting, setQrisCompleting] = useState(false)
  const pendingQrisPayloadRef = useRef<SalePayload | null>(null)
  const qrisCheckingRef = useRef(false)
  const qrisCompletingRef = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const strukRef = useRef<HTMLDivElement>(null)

  // Pajak PPN
  const [pajakPersen, setPajakPersen] = useState(0)

  // Shift aktif
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null)

  // Promo
  const [promoCode, setPromoCode] = useState('')
  const [promoDiskon, setPromoDiskon] = useState(0)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)

  // Barcode scanner buffer
  const barcodeBuffer = useRef('')
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadProducts = useCallback(async () => {
    const r = await api<Barang[]>('barang:getAll')
    if (r.success) setProducts(r.data ?? [])
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    api<Customer[]>('customer:getAll').then(r => { if (r.success) setCustomers(r.data ?? []) })
    api<Identitas>('identitas:get').then(r => { if (r.success && r.data) setPajakPersen(r.data.pajak_persen ?? 0) })
    if (user?.nama_pengguna) {
      api<any>('shift:getCurrent', user.nama_pengguna).then(r => { if (r.success && r.data) setActiveShiftId(r.data.id) })
    }
  }, [user?.nama_pengguna])

  // Close customer dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Barcode scanner keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // F1: Focus search
      if (e.key === 'F1') {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }

      // F2: Focus payment amount
      if (e.key === 'F2') {
        e.preventDefault()
        const bayarInput = document.querySelector('input[type="number"]') as HTMLInputElement
        bayarInput?.focus()
        return
      }

      // F5: Process payment
      if (e.key === 'F5') {
        e.preventDefault()
        if (cart.length && (jenisBayar === 'QRIS' || bayar)) handleBayar()
        return
      }

      // Escape: Clear cart
      if (e.key === 'Escape') {
        e.preventDefault()
        if (cart.length > 0) {
          setCart([])
          setBayar('')
          toast('Keranjang dibersihkan')
        }
        return
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          const barcode = barcodeBuffer.current.trim()
          barcodeBuffer.current = ''
          if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current)

          const product = products.find(p => p.barcode === barcode)
          if (product) {
            addToCart(product)
          } else {
            toast(`Barcode "${barcode}" tidak ditemukan`, 'error')
          }
        }
        return
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current)
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBuffer.current = ''
        }, 100)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current)
    }
  }, [products, cart.length, bayar, jenisBayar])

  const filteredCustomers = customers.filter(c =>
    c.status === 'Aktif' &&
    (c.nama_customer.toLowerCase().includes(customerSearch.toLowerCase()) ||
     (c.no_telp ?? '').includes(customerSearch))
  ).slice(0, 8)

  const filtered = products.filter(p =>
    p.jenis_transaksi === 'INCOME' &&
    (p.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
     p.kd_barang.toLowerCase().includes(search.toLowerCase()) ||
     (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (p: Barang) => {
    const maxStok = p.stok ?? 0
    if (maxStok <= 0) {
      toast('Stok produk habis', 'error')
      return
    }
    setCart(prev => {
      const existing = prev.find(c => c.kd_barang === p.kd_barang)
      if (existing) {
        if (existing.qty >= maxStok) {
          toast(`Stok ${p.nama_barang} tidak mencukupi (tersisa ${maxStok})`, 'error')
          return prev
        }
        return prev.map(c => c.kd_barang === p.kd_barang ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { kd_barang: p.kd_barang, nama_barang: p.nama_barang ?? '', harga_jual: p.harga_barang ?? 0, harga_modal: p.harga_modal ?? 0, qty: 1, disc: p.potongan ?? 0 }]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  const updateQty = (kd: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.kd_barang !== kd) return c
      const newQty = c.qty + delta
      // Check stock limit when increasing
      if (delta > 0) {
        const product = products.find(p => p.kd_barang === kd)
        const maxStok = product?.stok ?? 0
        if (newQty > maxStok) {
          toast(`Stok ${c.nama_barang} tidak mencukupi (tersisa ${maxStok})`, 'error')
          return c
        }
      }
      return { ...c, qty: newQty }
    }).filter(c => c.qty > 0))
  }
  const removeItem = (kd: string) => setCart(prev => prev.filter(c => c.kd_barang !== kd))

  const subTotal = cart.reduce((sum, c) => {
    const disc = (c.harga_jual * c.disc) / 100
    return sum + (c.harga_jual - disc) * c.qty
  }, 0)

  const pajakAmount = Math.round(subTotal * pajakPersen / 100)
  const totalBayar = subTotal + pajakAmount - promoDiskon
  const paidAmount = jenisBayar === 'QRIS' ? totalBayar : (parseFloat(bayar) || 0)
  const kembalian = paidAmount - totalBayar
  const poinEarned = selectedCustomer ? Math.floor(subTotal / 10000) : 0
  const qrisCanPay = Boolean(cart.length && totalBayar > 0)
  const isStaticQrisPayment = qrisPayment?.provider === 'static'

  useEffect(() => {
    if (jenisBayar === 'QRIS') {
      setBayar(totalBayar > 0 ? String(totalBayar) : '')
    }
  }, [jenisBayar, totalBayar])

  const applyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    const r = await api<any>('promo:validate', promoCode.trim().toUpperCase(), subTotal, cart)
    setPromoLoading(false)
    if (r.success && r.data?.valid) {
      setPromoDiskon(r.data.discount)
      setPromoMsg(`✅ ${r.data.promo?.name} — hemat ${formatRupiah(r.data.discount)}`)
    } else {
      setPromoDiskon(0)
      setPromoMsg(r.data?.message ?? r.message ?? 'Kode promo tidak valid')
    }
  }

  const removePromo = () => {
    setPromoCode('')
    setPromoDiskon(0)
    setPromoMsg('')
  }

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length > 0) addToCart(filtered[0])
  }

  const handlePrint = useReactToPrint({ content: () => strukRef.current })

  const buildSalePayload = (paymentType: 'TUNAI' | 'TRANSFER' | 'QRIS', amount: number): SalePayload => ({
    username: user?.nama_pengguna ?? 'KASIR',
    items: cart.map(item => ({ ...item })),
    yang_dibayar: amount,
    jenis_pembayaran: paymentType,
    kd_customer: selectedCustomer?.kd_customer,
    pajak: pajakAmount,
    diskon_promo: promoDiskon,
    kode_promo: promoCode || undefined,
    shift_id: activeShiftId ?? undefined,
  })

  const completeSale = useCallback(async (payload: SalePayload) => {
    const r = await api<{ kd_transaksi: string }>('penjualan:create', {
      ...payload,
    })
    if (r.success) {
      if (payload.kode_promo) await api('promo:apply', payload.kode_promo.toUpperCase())
      setLastKd(r.kd_transaksi ?? null)
      toast(r.message as string)
      setShowStruk(true)
      // Track usage for demo limit system
      trackUsage()
      if (isDemo && remainingUsage <= 3 && remainingUsage > 0) {
        toast(`⚠️ Sisa ${remainingUsage - 1} transaksi demo`, 'error')
      }
      return true
    } else {
      toast(r.message as string, 'error')
      return false
    }
  }, [isDemo, remainingUsage, toast, trackUsage])

  const createQrisPayment = async () => {
    const payload = buildSalePayload('QRIS', totalBayar)
    const qrisItems = cart.map(item => {
      const disc = (item.harga_jual * item.disc) / 100
      return {
        id: item.kd_barang,
        name: item.nama_barang,
        price: item.harga_jual - disc,
        quantity: item.qty,
      }
    })
    if (pajakAmount > 0) {
      qrisItems.push({
        id: 'PPN',
        name: `PPN ${pajakPersen}%`,
        price: pajakAmount,
        quantity: 1,
      })
    }
    if (promoDiskon > 0) {
      qrisItems.push({
        id: 'PROMO',
        name: promoCode ? `Diskon ${promoCode}` : 'Diskon promo',
        price: -promoDiskon,
        quantity: 1,
      })
    }

    pendingQrisPayloadRef.current = payload
    setBayar(String(totalBayar))
    setQrisStatus('Menyiapkan QRIS...')
    setQrisPayment(null)
    setShowQris(true)

    const r = await api<QrisPayment>('payment:createQris', {
      amount: totalBayar,
      customerName: selectedCustomer?.nama_customer ?? 'Customer POS',
      customerEmail: selectedCustomer?.email ?? undefined,
      customerPhone: selectedCustomer?.no_telp ?? undefined,
      items: qrisItems,
    })

    if (r.success && r.data) {
      setQrisPayment(r.data)
      setQrisStatus(
        r.data.provider === 'static'
          ? 'Scan QRIS, lalu tekan Konfirmasi Dibayar setelah pembayaran diterima.'
          : 'Menunggu pembayaran dari pelanggan...'
      )
    } else {
      pendingQrisPayloadRef.current = null
      setShowQris(false)
      toast(r.message as string, 'error')
    }
  }

  const completeQrisSale = useCallback(async () => {
    const payload = pendingQrisPayloadRef.current
    if (!payload || qrisCompletingRef.current) return

    qrisCompletingRef.current = true
    setQrisCompleting(true)
    setQrisStatus('Pembayaran diterima. Menyimpan transaksi...')
    let saved = false
    try {
      saved = await completeSale(payload)
    } finally {
      qrisCompletingRef.current = false
      setQrisCompleting(false)
    }

    if (saved) {
      pendingQrisPayloadRef.current = null
      setShowQris(false)
      setQrisPayment(null)
    }
  }, [completeSale])

  const checkQrisStatus = useCallback(async () => {
    if (!qrisPayment?.orderId || qrisCheckingRef.current || qrisCompletingRef.current) return

    if (qrisPayment.provider === 'static') {
      setQrisStatus('QRIS ini memakai gambar upload. Konfirmasi pembayaran secara manual setelah dana diterima.')
      return
    }

    qrisCheckingRef.current = true
    setQrisChecking(true)
    try {
      const r = await api<QrisStatus>('payment:checkStatus', qrisPayment.orderId)

      if (!r.success) {
        setQrisStatus(r.message ?? 'Gagal mengecek status pembayaran')
        return
      }

      if (r.data?.paid) {
        await completeQrisSale()
        return
      }

      if (r.data?.failed) {
        pendingQrisPayloadRef.current = null
        setQrisStatus('Pembayaran QRIS gagal, dibatalkan, atau kedaluwarsa.')
        return
      }

      setQrisStatus('Menunggu pembayaran dari pelanggan...')
    } finally {
      qrisCheckingRef.current = false
      setQrisChecking(false)
    }
  }, [completeQrisSale, qrisPayment?.orderId, qrisPayment?.provider])

  useEffect(() => {
    if (!showQris || !qrisPayment?.orderId || qrisCompleting || qrisPayment.provider === 'static') return

    const interval = setInterval(() => {
      checkQrisStatus()
    }, 3000)

    checkQrisStatus()
    return () => clearInterval(interval)
  }, [checkQrisStatus, qrisCompleting, qrisPayment?.orderId, qrisPayment?.provider, showQris])

  const cancelQrisPayment = async () => {
    const orderId = qrisPayment?.orderId
    const provider = qrisPayment?.provider
    pendingQrisPayloadRef.current = null
    qrisCheckingRef.current = false
    qrisCompletingRef.current = false
    setShowQris(false)
    setQrisPayment(null)
    setQrisChecking(false)
    setQrisCompleting(false)
    setQrisStatus('Menyiapkan QRIS...')
    if (orderId && provider !== 'static') {
      await api('payment:cancelQris', orderId)
    }
  }

  const handleBayar = async () => {
    if (!cart.length) return toast('Keranjang kosong', 'error')
    if (jenisBayar !== 'QRIS' && (parseFloat(bayar) || 0) < totalBayar) return toast('Jumlah bayar kurang', 'error')
    // Warn demo users approaching limit
    if (isDemo && isOverLimit) {
      toast('Batas transaksi demo tercapai. Upgrade untuk melanjutkan.', 'error')
      return
    }
    setLoading(true)
    if (jenisBayar === 'QRIS') {
      await createQrisPayment()
      setLoading(false)
      return
    }

    await completeSale(buildSalePayload(jenisBayar, parseFloat(bayar)))
    setLoading(false)
  }

  const resetTransaksi = () => {
    setCart([])
    setBayar('')
    setShowStruk(false)
    setShowQris(false)
    setQrisPayment(null)
    setQrisChecking(false)
    setQrisCompleting(false)
    setQrisStatus('Menyiapkan QRIS...')
    pendingQrisPayloadRef.current = null
    qrisCheckingRef.current = false
    qrisCompletingRef.current = false
    setLastKd(null)
    setSelectedCustomer(null)
    setCustomerSearch('')
    setPromoCode('')
    setPromoDiskon(0)
    setPromoMsg('')
    loadProducts()
    searchRef.current?.focus()
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4 lg:h-[calc(100vh-7rem)] lg:min-h-[620px] lg:flex-row">
      {/* Left: Product Search */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Produk</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item cocok</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">F1</kbd> Cari
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">F2</kbd> Bayar
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">F5</kbd> Proses
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">Esc</kbd> Reset
          </div>
        </div>
        <Input ref={searchRef} placeholder="Cari produk (Enter untuk tambah)..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey} icon={<Search size={14} />} />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.slice(0, 50).map(p => (
              <button key={p.kd_barang} onClick={() => addToCart(p)} disabled={(p.stok ?? 0) <= 0} className={`rounded-lg border p-2.5 text-left transition-all hover:border-primary-400 hover:bg-slate-50 active:scale-[0.99] dark:hover:bg-slate-800 ${(p.stok ?? 0) <= 0 ? 'cursor-not-allowed border-slate-200 opacity-50 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  {p.foto_barang ? (
                    <img src={p.foto_barang} alt={p.nama_barang ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    <Image size={32} className="text-slate-400" />
                  )}
                </div>
                <p className="font-medium text-xs text-slate-700 dark:text-slate-200 truncate">{p.nama_barang}</p>
                <p className="text-primary-600 dark:text-primary-400 font-bold text-sm">{formatRupiah(p.harga_barang)}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${(p.stok ?? 0) <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{p.stok} stok</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                <ShoppingCart size={48} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Produk tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart + Payment */}
      <div className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:w-[24rem]">
        {/* Customer selector */}
        <div ref={customerRef} className="relative">
          <div
            onClick={() => setShowCustomerDrop(v => !v)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
          >
            <UserCircle size={18} className={selectedCustomer ? 'text-primary-500' : 'text-slate-400'} />
            <span className={`flex-1 text-sm truncate ${selectedCustomer ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>
              {selectedCustomer ? `${selectedCustomer.nama_customer} · ${(selectedCustomer.poin ?? 0)} poin` : 'Pilih customer (opsional)'}
            </span>
            {selectedCustomer && (
              <button onClick={e => { e.stopPropagation(); setSelectedCustomer(null); setCustomerSearch('') }} className="text-slate-400 hover:text-red-500">
                <X size={16} />
              </button>
            )}
          </div>
          {showCustomerDrop && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                <input
                  autoFocus
                  placeholder="Cari nama / no. telp..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada customer</p>
                ) : filteredCustomers.map(c => (
                  <button key={c.kd_customer} onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false); setCustomerSearch('') }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.nama_customer}</p>
                      <p className="text-xs text-slate-400">{c.no_telp ?? '-'}</p>
                    </div>
                    <span className="text-xs text-amber-500 font-semibold">{c.poin ?? 0} poin</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Card title="Keranjang" className="flex-1 flex flex-col overflow-hidden" 
          action={
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors"
              title="Pengaturan Struk"
            >
              <Settings size={16} />
            </button>
          }
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 -mx-1 px-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Keranjang kosong</p>
              </div>
            ) : cart.map(item => {
              const disc = (item.harga_jual * item.disc) / 100
              const total = (item.harga_jual - disc) * item.qty
              return (
                <div key={item.kd_barang} className="flex items-center gap-2 rounded-lg bg-slate-50/80 p-2 dark:bg-slate-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{item.nama_barang}</p>
                    <p className="text-xs text-slate-400">{formatRupiah(item.harga_jual)}{item.disc > 0 ? ` -${item.disc}%` : ''}</p>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{formatRupiah(total)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.kd_barang, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 transition-colors hover:bg-primary-100 dark:bg-slate-700"><Minus size={10} /></button>
                    <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.kd_barang, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 transition-colors hover:bg-primary-100 dark:bg-slate-700"><Plus size={10} /></button>
                    <button onClick={() => removeItem(item.kd_barang)} className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"><Trash2 size={10} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Payment Panel */}
        <Card>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-800 dark:text-white">{formatRupiah(subTotal)}</span>
            </div>
            {/* Promo Code */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoDiskon(0); setPromoMsg('') }}
                  onKeyDown={e => e.key === 'Enter' && applyPromo()}
                  placeholder="Kode promo"
                  disabled={promoDiskon > 0}
                  className="w-full pl-8 pr-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-60"
                />
              </div>
              {promoDiskon > 0 ? (
                <button onClick={removePromo} className="px-2.5 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 text-xs font-medium hover:bg-red-200 transition-colors">
                  <X size={14} />
                </button>
              ) : (
                <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} className="px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors">
                  {promoLoading ? '...' : 'Pakai'}
                </button>
              )}
            </div>
            {promoMsg && (
              <p className={`text-xs ${promoDiskon > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{promoMsg}</p>
            )}
            {promoDiskon > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span>Diskon Promo</span>
                <span className="font-semibold">-{formatRupiah(promoDiskon)}</span>
              </div>
            )}
            {pajakPersen > 0 && (
              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                <span>PPN {pajakPersen}%</span>
                <span className="font-semibold">+{formatRupiah(pajakAmount)}</span>
              </div>
            )}
            {pajakPersen > 0 && (
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
                <span className="text-slate-700 dark:text-slate-200">Total</span>
                <span className="text-slate-800 dark:text-white">{formatRupiah(totalBayar)}</span>
              </div>
            )}
            {selectedCustomer && poinEarned > 0 && (
              <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
                <span>Poin didapat</span>
                <span className="font-semibold">+{poinEarned} poin</span>
              </div>
            )}
            <div className="flex gap-2">
              {(['TUNAI', 'TRANSFER', 'QRIS'] as const).map(j => (
                <button key={j} onClick={() => setJenisBayar(j)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all
                    ${jenisBayar === j ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary-300'}`}>
                  {j === 'TUNAI' ? <Banknote size={14} /> : j === 'TRANSFER' ? <CreditCard size={14} /> : <QrCode size={14} />} {j}
                </button>
              ))}
            </div>
            <Input
              label="Jumlah Bayar"
              type="number"
              value={jenisBayar === 'QRIS' ? String(totalBayar) : bayar}
              onChange={e => {
                if (jenisBayar !== 'QRIS') setBayar(e.target.value)
              }}
              placeholder="0"
              disabled={jenisBayar === 'QRIS'}
              helperText={jenisBayar === 'QRIS' ? 'Nominal QRIS otomatis mengikuti total transaksi.' : undefined}
            />
            {paidAmount > 0 && (
              <div className={`flex justify-between text-sm font-semibold ${kembalian >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <span>Kembalian</span>
                <span>{formatRupiah(kembalian)}</span>
              </div>
            )}
            <Button
              className="w-full"
              loading={loading}
              disabled={jenisBayar === 'QRIS' ? !qrisCanPay : (!cart.length || !bayar)}
              onClick={handleBayar}
              icon={jenisBayar === 'QRIS' ? <QrCode size={16} /> : <ShoppingCart size={16} />}
            >
              {jenisBayar === 'QRIS' ? 'Tampilkan QRIS' : 'Bayar'}
            </Button>
          </div>
        </Card>
      </div>

      {/* QRIS Modal */}
      <Modal open={showQris} onClose={cancelQrisPayment} title="Pembayaran QRIS" size="sm"
        footer={
          <>
            {isStaticQrisPayment ? (
              <Button variant="success" onClick={completeQrisSale} loading={qrisCompleting} disabled={!qrisPayment} className="w-full sm:w-auto">
                Konfirmasi Dibayar
              </Button>
            ) : (
              <Button variant="secondary" onClick={checkQrisStatus} loading={qrisChecking} disabled={!qrisPayment || qrisCompleting} className="w-full sm:w-auto">
                Cek Status
              </Button>
            )}
            <Button variant="danger" onClick={cancelQrisPayment} disabled={qrisCompleting} className="w-full sm:w-auto">
              Batal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Pembayaran</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalBayar)}</p>
            {qrisPayment?.orderId && (
              <p className="mt-1 text-[11px] text-slate-400 break-all">Order: {qrisPayment.orderId}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            {qrisPayment?.qrImageUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
                <img src={qrisPayment.qrImageUrl} alt="QRIS pembayaran" className="h-64 w-64 object-contain" />
              </div>
            ) : qrisPayment?.qrString ? (
              <textarea
                readOnly
                value={qrisPayment.qrString}
                className="h-32 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-700 dark:text-slate-200"
              />
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                <QrCode size={48} className="mb-2" />
                <p className="text-sm">Membuat QRIS...</p>
              </div>
            )}
          </div>

          <div className={`rounded-xl px-3 py-2 text-sm font-medium ${
            qrisCompleting
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
              : qrisStatus.includes('gagal') || qrisStatus.includes('dibatalkan') || qrisStatus.includes('kedaluwarsa')
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
          }`}>
            {qrisStatus}
          </div>
        </div>
      </Modal>

      {/* Struk Modal */}
      <Modal open={showStruk} onClose={resetTransaksi} title="Transaksi Berhasil" size="sm"
        footer={
          <>
            <Button variant="secondary" icon={<Printer size={14} />} onClick={handlePrint} className="w-full sm:w-auto">Cetak Struk</Button>
            <Button onClick={resetTransaksi} className="w-full sm:w-auto">Transaksi Baru</Button>
          </>
        }
      >
        <div ref={strukRef}>
          <Struk cart={cart} subTotal={subTotal} pajak={pajakAmount} pajakPersen={pajakPersen} totalBayar={totalBayar} promoDiskon={promoDiskon} bayar={paidAmount} kembalian={kembalian} kdTransaksi={lastKd ?? ''} jenisBayar={jenisBayar} customerName={selectedCustomer?.nama_customer} poinEarned={poinEarned} kasirName={user?.nama_pengguna} />
        </div>
      </Modal>

      {/* Struk Settings Modal */}
      <StrukSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
