import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Printer,
  UserCircle,
  X,
  Image as ImageIcon,
  Settings,
  QrCode,
  Tag,
  ScanLine,
  Camera,
  Pause,
  Play,
  Keyboard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  Receipt,
  Zap,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StrukSettingsModal from '../components/StrukSettingsModal'
import QuickAmountButtons from '../components/QuickAmountButtons'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import { useHoldCart } from '../hooks/useHoldCart'
import type { Barang, CartItem, Customer } from '../../shared/types'
import Struk from '../components/Struk'
import { useReactToPrint } from 'react-to-print'
import { ensureBluetoothPrinterPermission, ensureCameraPermission } from '../utils/nativePermissions'
import { ProductGridSkeleton } from '../components/Skeleton'

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
  const navigate = useNavigate()
  const { trackUsage, isOverLimit, remainingUsage, isDemo, showPricing } = useDemoGuard()
  
  const [products, setProducts] = useState<Barang[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [bayar, setBayar] = useState('')
  const [jenisBayar, setJenisBayar] = useState<'TUNAI' | 'TRANSFER' | 'QRIS'>('TUNAI')
  const [loading, setLoading] = useState(false)
  const [lastKd, setLastKd] = useState<string | null>(null)
  const [showStruk, setShowStruk] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHeldCarts, setShowHeldCarts] = useState(false)
  const [showClearCart, setShowClearCart] = useState(false)
  const { heldCarts, holdCart, resumeCart, deleteHeld } = useHoldCart()
  const [showQris, setShowQris] = useState(false)
  const [qrisPayment, setQrisPayment] = useState<QrisPayment | null>(null)
  const [qrisStatus, setQrisStatus] = useState('Menyiapkan QRIS...')
  const [qrisChecking, setQrisChecking] = useState(false)
  const [qrisCompleting, setQrisCompleting] = useState(false)
  
  const pendingQrisPayloadRef = useRef<SalePayload | null>(null)
  const qrisCreatingRef = useRef(false)
  const qrisCheckingRef = useRef(false)
  const qrisCompletingRef = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const bayarInputRef = useRef<HTMLInputElement>(null)
  const strukRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false)
  const [cameraScannerError, setCameraScannerError] = useState('')
  const [cameraScannerStatus, setCameraScannerStatus] = useState('Menyiapkan kamera...')

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

  // Refs to avoid stale closures in keyboard handler
  const handleBayarRef = useRef<() => Promise<void>>(async () => {})
  const addToCartRef = useRef<(p: Barang) => void>(() => {})
  const holdCartRef = useRef<(cart: CartItem[], customer: Customer | null) => boolean>(() => false)
  const selectedCustomerRef = useRef<Customer | null>(null)

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    const r = await api<Barang[]>('barang:getAll')
    if (r.success) setProducts(r.data ?? [])
    setProductsLoading(false)
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    api<Customer[]>('customer:getAll').then(r => { if (r.success) setCustomers(r.data ?? []) })
    api<{ rate: number }>('tax:getActiveRate').then(r => { if (r.success && r.data) setPajakPersen(r.data.rate) })
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

  useEffect(() => {
    selectedCustomerRef.current = selectedCustomer
  }, [selectedCustomer])

  // Barcode scanner keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'F1') {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(v => !v)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        if (cart.length > 0) {
          const ok = holdCartRef.current(cart, selectedCustomerRef.current)
          if (ok) {
            setCart([])
            setBayar('')
            setSelectedCustomer(null)
            toast('Transaksi di-hold. Tekan tombol Held untuk melanjutkan.', 'success')
          } else {
            toast('Gagal hold: keranjang kosong atau batas hold tercapai', 'error')
          }
        }
        return
      }

      if (e.key === 'F2') {
        e.preventDefault()
        bayarInputRef.current?.focus()
        return
      }

      if (e.key === 'F5') {
        e.preventDefault()
        if (!loading && cart.length && (jenisBayar === 'QRIS' || bayar)) handleBayarRef.current()
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (cart.length > 0) {
          setShowClearCart(true)
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
            addToCartRef.current(product)
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
        }, 300)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current)
    }
  }, [products, cart.length, bayar, jenisBayar])

  const filteredCustomers = useMemo(() => customers.filter(c =>
    c.status === 'Aktif' &&
    (c.nama_customer.toLowerCase().includes(customerSearch.toLowerCase()) ||
     (c.no_telp ?? '').includes(customerSearch))
  ).slice(0, 8), [customers, customerSearch])

  const filtered = useMemo(() => products.filter(p =>
    p.jenis_transaksi === 'INCOME' &&
    (p.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
     p.kd_barang.toLowerCase().includes(search.toLowerCase()) ||
     (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()))
  ), [products, search])

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
    toast(`${p.nama_barang} ditambahkan ke keranjang`, 'success')
    setSearch('')
    searchRef.current?.focus()
  }

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
    const product = products.find(p => p.barcode === barcode || p.kd_barang === barcode)
    if (!product) {
      toast(`Barcode "${barcode}" tidak ditemukan`, 'error')
      stopCameraScanner()
      return
    }

    addToCart(product)
    toast(`${product.nama_barang ?? product.kd_barang} ditambahkan`)
    stopCameraScanner()
  }, [products, stopCameraScanner, toast])

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
        setCameraScannerError('Pemindai barcode kamera belum didukung oleh WebView ini. Gunakan scanner USB/Bluetooth atau ketik barcode.')
        return
      }

      const detector = new BarcodeDetectorCtor({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
      })
      setCameraScannerStatus('Arahkan kamera ke barcode')

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

  const updateQty = (kd: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.kd_barang !== kd) return c
      const newQty = c.qty + delta
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

  const subTotal = useMemo(() => cart.reduce((sum, c) => {
    const disc = (c.harga_jual * c.disc) / 100
    return sum + (c.harga_jual - disc) * c.qty
  }, 0), [cart])

  const pajakAmount = useMemo(() => Math.round(subTotal * pajakPersen / 100), [subTotal, pajakPersen])
  const totalBayar = useMemo(() => Math.max(0, subTotal + pajakAmount - promoDiskon), [subTotal, pajakAmount, promoDiskon])
  const paidAmount = useMemo(() => jenisBayar === 'QRIS' ? totalBayar : (parseFloat(bayar) || 0), [jenisBayar, totalBayar, bayar])
  const kembalian = useMemo(() => paidAmount - totalBayar, [paidAmount, totalBayar])
  const poinEarned = useMemo(() => selectedCustomer ? Math.floor(subTotal / 10000) : 0, [selectedCustomer, subTotal])
  const qrisCanPay = useMemo(() => Boolean(cart.length && totalBayar > 0), [cart.length, totalBayar])
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
      setPromoMsg(`${r.data.promo?.name} - hemat ${formatRupiah(r.data.discount)}`)
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

  const printReceipt = useReactToPrint({ content: () => strukRef.current })

  const handlePrint = async () => {
    const permission = await ensureBluetoothPrinterPermission()
    if (!permission.granted) {
      toast(permission.message ?? 'Izin Bluetooth printer ditolak', 'error')
      return
    }
    printReceipt()
  }

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
      setLastKd(r.data?.kd_transaksi ?? null)
      toast(r.message as string)
      setShowStruk(true)
      try { trackUsage() } catch { /* ignore */ }
      if (isDemo && remainingUsage <= 3 && remainingUsage > 0) {
        toast(`Sisa ${remainingUsage - 1} transaksi demo`, 'error')
      }
      return true
    } else {
      if (['TRANSACTION_LIMIT', 'FEATURE_LOCKED', 'EXPIRED'].includes(r.error_code ?? '')) {
        showPricing()
      }
      toast(r.message as string, 'error')
      return false
    }
  }, [isDemo, remainingUsage, showPricing, toast, trackUsage])

  const createQrisPayment = async () => {
    if (qrisCreatingRef.current) return
    qrisCreatingRef.current = true
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
    qrisCreatingRef.current = false
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
    qrisCreatingRef.current = false
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
    if (loading) return
    if (!cart.length) return toast('Keranjang kosong', 'error')
    if (!activeShiftId) {
      toast('Shift kasir belum dibuka. Buka shift terlebih dahulu.', 'error')
      return
    }
    if (jenisBayar !== 'QRIS' && (parseFloat(bayar) || 0) < totalBayar) return toast('Jumlah bayar kurang', 'error')
    
    if (isDemo && isOverLimit) {
      toast('Batas transaksi demo tercapai. Upgrade untuk melanjutkan.', 'error')
      return
    }
    if (user?.nama_pengguna) {
      const limit = await api<{ allowed: boolean; used: number; max: number }>('subscription:checkTransactionLimit', user.nama_pengguna)
      if (limit.success && limit.data && !limit.data.allowed) {
        toast(`Limit transaksi harian paket sudah tercapai (${limit.data.used}/${limit.data.max}).`, 'error')
        showPricing()
        return
      }
    }
    setLoading(true)
    try {
      if (jenisBayar === 'QRIS') {
        await createQrisPayment()
        return
      }
      await completeSale(buildSalePayload(jenisBayar, parseFloat(bayar)))
    } finally {
      setLoading(false)
    }
  }

  handleBayarRef.current = handleBayar
  addToCartRef.current = addToCart
  holdCartRef.current = holdCart

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
    qrisCreatingRef.current = false
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
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-7rem)] lg:flex-row select-none">
      
      <div className="flex min-w-0 flex-none lg:flex-1 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm lg:p-5 lg:min-h-0 lg:max-h-none lg:overflow-y-auto">
        
        {/* Shift Warning Banner */}
        {!activeShiftId && (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>Shift kasir belum dibuka. Buka shift untuk memproses transaksi.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shifts')}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white transition-colors hover:bg-amber-700 shadow-sm shrink-0"
            >
              Buka Shift Kasir
            </button>
          </div>
        )}

        {/* Top Header & Keyboard Shortcuts Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Katalog Kasir</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/10 text-red-600 dark:bg-red-950/60 dark:text-red-400 text-[11px] font-bold border border-red-600/20">
                {filtered.length} Produk
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pilih produk atau scan barcode untuk menambahkan ke keranjang</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">F1 Cari</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">F2 Bayar</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">F5 Proses</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Esc Reset</span>
          </div>
        </div>

        {/* Search Input & Camera Scanner Button */}
        <div className="flex gap-2">
          <Input
            ref={searchRef}
            placeholder="Cari produk (Nama / Kode / Barcode)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            icon={<Search size={16} className="text-slate-400" />}
            className="flex-1 rounded-xl border-slate-200 dark:border-slate-800 focus:border-red-600 focus:ring-red-600/10"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={openCameraScanner}
            icon={<ScanLine size={16} />}
            className="shrink-0 rounded-xl border-slate-200 dark:border-slate-800 font-bold"
          >
            Scan Barcode
          </Button>
        </div>

        {/* Product Catalog Grid */}
        {productsLoading ? (
          <ProductGridSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <ShoppingCart size={32} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Produk Tidak Ditemukan</p>
              <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian Anda</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((p, index) => {
              const isOutOfStock = (p.stok ?? 0) <= 0
              return (
                <button
                  key={p.kd_barang ?? String(index)}
                  onClick={() => addToCart(p)}
                  disabled={isOutOfStock}
                  className={`w-full rounded-2xl border p-3 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isOutOfStock
                      ? 'cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-50'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 active:border-red-600/40 active:shadow-md'
                  }`}
                >
                  <div>
                    <div className="mb-2.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/80 relative">
                      {p.foto_barang ? (
                        <img src={p.foto_barang} alt={p.nama_barang ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={32} className="text-slate-400 opacity-60" />
                      )}
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOutOfStock ? 'bg-red-500 text-white' : (p.stok ?? 0) <= 5 ? 'bg-amber-500 text-white' : 'bg-slate-900/70 text-white backdrop-blur-sm'
                      }`}>
                        {isOutOfStock ? 'Habis' : `${p.stok} stok`}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate leading-snug">{p.nama_barang}</p>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <p className="text-red-600 dark:text-red-400 font-extrabold text-sm">{formatRupiah(p.harga_barang)}</p>
                    <div className="w-6 h-6 rounded-lg bg-red-600/10 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Plus size={14} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>

      <div className="flex flex-none w-full shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm lg:w-[26rem] xl:w-[28rem] lg:shrink">
        
        {/* Customer Selector Bar */}
        <div ref={customerRef} className="relative">
          <div
            onClick={() => setShowCustomerDrop(v => !v)}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 transition-colors hover:border-red-600/40"
          >
            <UserCircle size={20} className={selectedCustomer ? 'text-red-600' : 'text-slate-400'} />
            <span className={`flex-1 text-xs truncate ${selectedCustomer ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500'}`}>
              {selectedCustomer ? `${selectedCustomer.nama_customer} · ${selectedCustomer.poin ?? 0} Poin` : 'Pilih Pelanggan / Member (Opsional)'}
            </span>
            {selectedCustomer && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setSelectedCustomer(null); setCustomerSearch('') }}
                className="p-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Customer Dropdown */}
          {showCustomerDrop && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <input
                  autoFocus
                  placeholder="Cari nama / no. telepon..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full rounded-xl border-0 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600/30"
                />
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                {filteredCustomers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada customer cocok</p>
                ) : filteredCustomers.map(c => (
                  <button
                    key={c.kd_customer}
                    type="button"
                    onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false); setCustomerSearch('') }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{c.nama_customer}</p>
                      <p className="text-[11px] text-slate-400">{c.no_telp ?? '-'}</p>
                    </div>
                    <span className="text-xs text-amber-600 font-bold">{c.poin ?? 0} Poin</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cart Container Card */}
        <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3.5 overflow-hidden">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-red-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Keranjang Belanja</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                {cart.reduce((a, b) => a + b.qty, 0)} Item
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) {
                    const ok = holdCart(cart, selectedCustomer)
                    if (ok) {
                      setCart([])
                      setBayar('')
                      setSelectedCustomer(null)
                      toast('Transaksi di-hold', 'success')
                    } else {
                      toast('Batas hold tercapai (maks 10)', 'error')
                    }
                  }
                }}
                disabled={cart.length === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors disabled:opacity-30"
                title="Hold Transaksi (Ctrl+H)"
              >
                <Pause size={16} />
              </button>

              {heldCarts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHeldCarts(true)}
                  className="relative p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors"
                  title="Lihat Transaksi Hold"
                >
                  <Play size={16} />
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-amber-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {heldCarts.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600 transition-colors"
                title="Pengaturan Struk"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Cart Items Scroll Area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingCart size={32} className="mx-auto opacity-30" />
                <p className="text-xs font-semibold">Keranjang Belanja Kosong</p>
                <p className="text-[11px]">Klik produk untuk menambahkan item</p>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map(item => {
                  const disc = (item.harga_jual * item.disc) / 100
                  const total = (item.harga_jual - disc) * item.qty
                  return (
                    <motion.div
                      key={item.kd_barang}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.nama_barang}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatRupiah(item.harga_jual)} {item.disc > 0 && <span className="text-red-600">(-{item.disc}%)</span>}
                        </p>
                        <p className="text-xs font-extrabold text-red-600 dark:text-red-400 mt-0.5">{formatRupiah(total)}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQty(item.kd_barang, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-xs font-extrabold text-slate-900 dark:text-white">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.kd_barang, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.kd_barang)}
                          className="ml-1 w-6 h-6 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Payment Summary Panel */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
          
          {/* Subtotal */}
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-500">Subtotal Belanja</span>
            <span className="text-slate-900 dark:text-white font-bold">{formatRupiah(subTotal)}</span>
          </div>

          {/* Promo Code Input */}
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoDiskon(0); setPromoMsg('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder="Kode Promo"
                disabled={promoDiskon > 0}
                className="w-full h-9 pl-8 pr-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60 focus:outline-none focus:border-red-600"
              />
            </div>
            {promoDiskon > 0 ? (
              <button
                type="button"
                onClick={removePromo}
                className="px-3 h-9 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
              >
                <X size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={applyPromo}
                disabled={promoLoading || !promoCode.trim()}
                className="px-3.5 h-9 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {promoLoading ? '...' : 'Gunakan'}
              </button>
            )}
          </div>

          {promoMsg && (
            <p className={`text-[11px] font-medium ${promoDiskon > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{promoMsg}</p>
          )}

          {promoDiskon > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-bold">
              <span>Diskon Promo</span>
              <span>-{formatRupiah(promoDiskon)}</span>
            </div>
          )}

          {pajakPersen > 0 && (
            <div className="flex justify-between text-xs text-amber-600 font-bold">
              <span>PPN ({pajakPersen}%)</span>
              <span>+{formatRupiah(pajakAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between text-base font-black border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <span className="text-slate-900 dark:text-white">TOTAL BAYAR</span>
            <span className="text-red-600 dark:text-red-400">{formatRupiah(totalBayar)}</span>
          </div>

          {/* Payment Method Selector Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {(['TUNAI', 'TRANSFER', 'QRIS'] as const).map(j => (
              <button
                key={j}
                type="button"
                onClick={() => setJenisBayar(j)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  jenisBayar === j
                    ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {j === 'TUNAI' ? <Banknote size={14} /> : j === 'TRANSFER' ? <CreditCard size={14} /> : <QrCode size={14} />} {j}
              </button>
            ))}
          </div>

          {/* Quick Cash Amounts */}
          {jenisBayar === 'TUNAI' && (
            <QuickAmountButtons total={totalBayar} onAmount={amount => setBayar(String(amount))} />
          )}

          {/* Cash Paid Amount Input */}
          <Input
            ref={bayarInputRef}
            label="Jumlah Diterima (Rp)"
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
            <div className={`flex justify-between text-xs font-bold pt-1 ${kembalian >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              <span>Kembalian</span>
              <span>{formatRupiah(kembalian)}</span>
            </div>
          )}

          {/* Submit Pay Button */}
          <Button
            className="w-full h-13 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/20 border-0 active:scale-[0.98] transition-all"
            loading={loading}
            disabled={loading || (jenisBayar === 'QRIS' ? !qrisCanPay : (!cart.length || !bayar))}
            onClick={handleBayar}
            icon={jenisBayar === 'QRIS' ? <QrCode size={18} /> : <ShoppingCart size={18} />}
          >
            {jenisBayar === 'QRIS' ? 'BAYAR DENGAN QRIS' : 'PROSES PEMBAYARAN'}
          </Button>

        </div>

      </div>

      {/* QRIS Modal */}
      <Modal
        open={showQris}
        onClose={cancelQrisPayment}
        title="Pembayaran QRIS Pembeli"
        size="sm"
        footer={
          <>
            {isStaticQrisPayment ? (
              <Button variant="success" onClick={completeQrisSale} loading={qrisCompleting} disabled={!qrisPayment} className="w-full sm:w-auto font-bold">
                Konfirmasi Dibayar
              </Button>
            ) : (
              <Button variant="secondary" onClick={checkQrisStatus} loading={qrisChecking} disabled={!qrisPayment || qrisCompleting} className="w-full sm:w-auto font-bold">
                Cek Status
              </Button>
            )}
            <Button variant="danger" onClick={cancelQrisPayment} disabled={qrisCompleting} className="w-full sm:w-auto font-bold">
              Batal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <p className="text-xs text-slate-500 font-medium">Total Pembayaran QRIS</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">{formatRupiah(totalBayar)}</p>
            {qrisPayment?.orderId && (
              <p className="mt-1 text-[11px] text-slate-400 break-all font-mono">Order ID: {qrisPayment.orderId}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            {qrisPayment?.qrImageUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
                <img src={qrisPayment.qrImageUrl} alt="QRIS Pembayaran" className="h-64 w-64 object-contain" />
              </div>
            ) : qrisPayment?.qrString ? (
              <textarea
                readOnly
                value={qrisPayment.qrString}
                className="h-32 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-white font-mono"
              />
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
                <QrCode size={48} className="mb-2 text-slate-400 animate-pulse" />
                <p className="text-xs font-bold">Membuat Kode QRIS...</p>
              </div>
            )}
          </div>

          <div className={`rounded-xl px-3.5 py-2.5 text-xs font-bold ${
            qrisCompleting
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : qrisStatus.includes('gagal') || qrisStatus.includes('dibatalkan')
                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          }`}>
            {qrisStatus}
          </div>
        </div>
      </Modal>

      {/* Struk Print Modal */}
      <Modal
        open={showStruk}
        onClose={resetTransaksi}
        title="Transaksi Berhasil Disimpan"
        size="sm"
        footer={
          <>
            <Button variant="secondary" icon={<Printer size={16} />} onClick={handlePrint} className="w-full sm:w-auto font-bold">
              Cetak Struk
            </Button>
            <Button onClick={resetTransaksi} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0">
              Transaksi Baru
            </Button>
          </>
        }
      >
        <div ref={strukRef}>
          <Struk
            cart={cart}
            subTotal={subTotal}
            pajak={pajakAmount}
            pajakPersen={pajakPersen}
            totalBayar={totalBayar}
            promoDiskon={promoDiskon}
            bayar={paidAmount}
            kembalian={kembalian}
            kdTransaksi={lastKd ?? ''}
            jenisBayar={jenisBayar}
            customerName={selectedCustomer?.nama_customer}
            poinEarned={poinEarned}
            kasirName={user?.nama_pengguna}
          />
        </div>
      </Modal>

      {/* Camera Barcode Scanner Modal */}
      <Modal
        open={cameraScannerOpen}
        onClose={stopCameraScanner}
        title="Scan Barcode Kamera"
        size="md"
        footer={
          <Button variant="secondary" onClick={stopCameraScanner} className="w-full sm:w-auto font-bold">
            Tutup Kamera
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
            <video ref={videoRef} muted playsInline className="h-72 w-full object-cover" />
          </div>
          <div className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold ${
            cameraScannerError
              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            <Camera size={16} className="mt-0.5 shrink-0" />
            <span>{cameraScannerError || cameraScannerStatus}</span>
          </div>
        </div>
      </Modal>

      {/* Struk Settings Modal */}
      <StrukSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Held Carts Modal */}
      <Modal open={showHeldCarts} onClose={() => setShowHeldCarts(false)} title={`Daftar Transaksi Hold (${heldCarts.length})`} size="sm">
        <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
          {heldCarts.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Pause size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">Tidak Ada Transaksi Di-Hold</p>
            </div>
          ) : heldCarts.map(held => (
            <div key={held.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {held.items.length} Item — {formatRupiah(held.total)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {held.customerName && <span>{held.customerName} · </span>}
                  {new Date(held.heldAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (cart.length > 0) {
                      toast('Keranjang saat ini harus dikosongkan atau di-hold dulu', 'error')
                      return
                    }
                    const resumed = resumeCart(held.id)
                    if (resumed) {
                      setCart(resumed.items)
                      toast('Transaksi dilanjutkan', 'success')
                      setShowHeldCarts(false)
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  Lanjutkan
                </button>
                <button
                  type="button"
                  onClick={() => deleteHeld(held.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Clear Cart Confirmation */}
      <ConfirmDialog
        open={showClearCart}
        onClose={() => setShowClearCart(false)}
        onConfirm={() => {
          setCart([])
          setBayar('')
          toast('Keranjang dibersihkan')
          setShowClearCart(false)
        }}
        title="Kosongkan Keranjang Belanja"
        message="Apakah Anda yakin ingin menghapus semua barang dari keranjang?"
        confirmText="Ya, Kosongkan"
        cancelText="Batal"
        variant="warning"
      />
    </div>
  )
}
