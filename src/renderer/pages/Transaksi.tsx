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
  MessageCircle,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  ArrowRight,
  ChevronUp,
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
import type { Barang, CartItem, Customer, Kategori } from '../../shared/types'
import Struk from '../components/Struk'
import { useReactToPrint } from 'react-to-print'
import { ensureBluetoothPrinterPermission, ensureCameraPermission } from '../utils/nativePermissions'
import { ProductGridSkeleton } from '../components/Skeleton'
import { cashierSound } from '../utils/sound'

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
  tipe_pesanan?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  nomor_meja?: string
  catatan?: string
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
  const [mobileCartDrawerOpen, setMobileCartDrawerOpen] = useState(false)
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

  // Kategori filter
  const [categories, setCategories] = useState<Kategori[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Order Type & Table (F&B / Operational)
  const [tipePesanan, setTipePesanan] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN')
  const [nomorMeja, setNomorMeja] = useState('')
  const [availableTables, setAvailableTables] = useState<Array<{ id: number; nomor_meja: string; label?: string; status: string }>>([])
  const [manualWaPhone, setManualWaPhone] = useState('')

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
    api<Kategori[]>('kategori:getAll').then(r => { if (r.success) setCategories(r.data ?? []) })
    api<any[]>('table:getAll').then(r => { if (r.success && r.data) setAvailableTables(r.data) })
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
        setMobileCartDrawerOpen(true)
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
            cashierSound.playErrorBuzz()
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

  // Dynamic Category List with counts
  const categoryList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    const incomeProducts = products.filter(p => p.jenis_transaksi === 'INCOME')
    
    // First, register from categories table if available
    categories.forEach(c => {
      if (c.kategori_barang) {
        const id = String(c.kd_kategori_barang ?? c.kategori_barang)
        map.set(id, { id, name: c.kategori_barang, count: 0 })
      }
    })

    // Count products and populate map
    incomeProducts.forEach(p => {
      const catName = p.kategori_barang || 'Lainnya'
      const catId = String(p.kd_kategori_barang ?? catName)
      const existing = map.get(catId) || map.get(catName)
      if (existing) {
        existing.count += 1
      } else {
        map.set(catId, { id: catId, name: catName, count: 1 })
      }
    })

    return Array.from(map.values()).filter(c => c.count > 0)
  }, [categories, products])

  const filtered = useMemo(() => products.filter(p => {
    if (p.jenis_transaksi !== 'INCOME') return false

    // Category filter
    if (selectedCategory !== 'ALL') {
      const catName = (p.kategori_barang ?? '').toLowerCase()
      const catId = String(p.kd_kategori_barang ?? '')
      const selected = selectedCategory.toLowerCase()
      if (catId !== selectedCategory && catName !== selected) return false
    }

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = (p.nama_barang ?? '').toLowerCase().includes(q)
      const matchKd = p.kd_barang.toLowerCase().includes(q)
      const matchBarcode = (p.barcode ?? '').toLowerCase().includes(q)
      if (!matchName && !matchKd && !matchBarcode) return false
    }

    return true
  }), [products, search, selectedCategory])

  const addToCart = (p: Barang) => {
    const maxStok = p.stok ?? 0
    if (maxStok <= 0) {
      cashierSound.playErrorBuzz()
      toast('Stok produk habis', 'error')
      return
    }
    setCart(prev => {
      const existing = prev.find(c => c.kd_barang === p.kd_barang)
      if (existing) {
        if (existing.qty >= maxStok) {
          cashierSound.playErrorBuzz()
          toast(`Stok ${p.nama_barang} tidak mencukupi (tersisa ${maxStok})`, 'error')
          return prev
        }
        cashierSound.playScanBeep()
        return prev.map(c => c.kd_barang === p.kd_barang ? { ...c, qty: c.qty + 1 } : c)
      }
      cashierSound.playScanBeep()
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
      cashierSound.playErrorBuzz()
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

  const totalCartQty = useMemo(() => cart.reduce((a, b) => a + b.qty, 0), [cart])

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
    tipe_pesanan: tipePesanan,
    nomor_meja: tipePesanan === 'DINE_IN' ? (nomorMeja.trim() || undefined) : undefined,
  })

  // Broadcast realtime updates to Customer Display
  const broadcastCustomerDisplay = useCallback((extra?: Record<string, any>) => {
    try {
      const payload = {
        items: cart.map(item => ({
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_jual: item.harga_jual,
          disc: item.disc ?? 0,
        })),
        subtotal: subTotal,
        total: totalBayar,
        storeName: 'Zetass Pos',
        status: cart.length > 0 ? 'scanning' : 'idle',
        ...extra,
      }
      localStorage.setItem('customer_display_data', JSON.stringify(payload))
      window.postMessage({ type: 'customer-display-update', payload }, '*')
      try {
        const bc = new BroadcastChannel('customer_display_channel')
        bc.postMessage(payload)
        bc.close()
      } catch {}
    } catch {}
  }, [cart, subTotal, totalBayar])

  useEffect(() => {
    broadcastCustomerDisplay()
  }, [cart, subTotal, totalBayar, broadcastCustomerDisplay])

  const sendWhatsAppReceipt = () => {
    const rawPhone = (manualWaPhone || selectedCustomer?.no_telp || '').replace(/\D/g, '')
    const targetPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone

    const itemList = cart.map(i => `• ${i.nama_barang} (${i.qty}x) = ${formatRupiah(i.harga_jual * i.qty)}`).join('\n')
    const msg = 
`🧾 *STRUK TRANSAKSI ZETASS POS*
----------------------------------------
No. Transaksi : *${lastKd || '-'}*
Waktu         : ${new Date().toLocaleString('id-ID')}
Tipe Order    : *${tipePesanan === 'DINE_IN' ? 'Makan di Tempat (Dine-In)' : tipePesanan === 'TAKEAWAY' ? 'Bungkus (Takeaway)' : 'Pengiriman (Delivery)'}* ${nomorMeja ? `(Meja: ${nomorMeja})` : ''}
Kasir         : ${user?.nama_pengguna || 'Kasir'}
Pelanggan     : ${selectedCustomer?.nama_customer || 'Pelanggan Umum'}
----------------------------------------
*DAFTAR PESANAN:*
${itemList}
----------------------------------------
Subtotal      : ${formatRupiah(subTotal)}
${pajakAmount > 0 ? `PPN (${pajakPersen}%) : ${formatRupiah(pajakAmount)}\n` : ''}${promoDiskon > 0 ? `Diskon Promo : -${formatRupiah(promoDiskon)}\n` : ''}*TOTAL BAYAR  : ${formatRupiah(totalBayar)}*
Metode Bayar  : ${jenisBayar}
Bayar         : ${formatRupiah(paidAmount)}
Kembalian     : ${formatRupiah(kembalian)}
----------------------------------------
Terima kasih atas kunjungan Anda! 🙏`

    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    toast('Membuka WhatsApp untuk mengirim struk...', 'success')
  }

  const completeSale = useCallback(async (payload: SalePayload) => {
    const r = await api<{ kd_transaksi: string }>('penjualan:create', {
      ...payload,
    })
    if (r.success) {
      cashierSound.playSuccessChime()
      setLastKd(r.data?.kd_transaksi ?? null)
      toast(r.message as string)
      setMobileCartDrawerOpen(false)
      setShowStruk(true)
      broadcastCustomerDisplay({
        status: 'success',
        paidAmount: payload.yang_dibayar,
        kembalian: Math.max(0, payload.yang_dibayar - totalBayar),
      })
      try { trackUsage() } catch { /* ignore */ }
      if (isDemo && remainingUsage <= 3 && remainingUsage > 0) {
        toast(`Sisa ${remainingUsage - 1} transaksi demo`, 'error')
      }
      return true
    } else {
      cashierSound.playErrorBuzz()
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
      broadcastCustomerDisplay({
        status: 'paying_qris',
        qrisImage: r.data.qrImageUrl || null,
        qrisString: r.data.qrString || null,
        paymentMethod: 'QRIS',
      })
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
    if (!cart.length) {
      cashierSound.playErrorBuzz()
      return toast('Keranjang kosong', 'error')
    }
    if (!activeShiftId) {
      cashierSound.playErrorBuzz()
      toast('Shift kasir belum dibuka. Buka shift terlebih dahulu.', 'error')
      return
    }
    if (jenisBayar !== 'QRIS' && (parseFloat(bayar) || 0) < totalBayar) {
      cashierSound.playErrorBuzz()
      const kurang = totalBayar - (parseFloat(bayar) || 0)
      return toast(`Jumlah bayar kurang ${formatRupiah(kurang)}`, 'error')
    }
    
    if (isDemo && isOverLimit) {
      cashierSound.playErrorBuzz()
      toast('Batas transaksi demo tercapai. Upgrade untuk melanjutkan.', 'error')
      return
    }
    if (user?.nama_pengguna) {
      const limit = await api<{ allowed: boolean; used: number; max: number }>('subscription:checkTransactionLimit', user.nama_pengguna)
      if (limit.success && limit.data && !limit.data.allowed) {
        cashierSound.playErrorBuzz()
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
    setMobileCartDrawerOpen(false)
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
    broadcastCustomerDisplay({
      items: [],
      subtotal: 0,
      total: 0,
      status: 'idle',
      qrisImage: null,
      qrisString: null,
      paymentMethod: null,
    })
    loadProducts()
    searchRef.current?.focus()
  }

  const renderCartAndPayment = (isMobileSheet = false) => (
    <div className="flex flex-col gap-3">
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

      {/* Order Type & Table Selector */}
      <div className="flex flex-col gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setTipePesanan(type)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tipePesanan === type
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              {type === 'DINE_IN' ? <UtensilsCrossed size={13} /> : type === 'TAKEAWAY' ? <ShoppingBag size={13} /> : <Bike size={13} />}
              <span>{type === 'DINE_IN' ? 'Dine In' : type === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'}</span>
            </button>
          ))}
        </div>

        {/* Table Selector (If Dine In) */}
        {tipePesanan === 'DINE_IN' && (
          <div className="flex items-center gap-2 pt-0.5">
            <select
              value={nomorMeja}
              onChange={e => setNomorMeja(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white outline-none focus:border-red-600"
            >
              <option value="">-- Pilih Nomor Meja (Opsional) --</option>
              {availableTables.map(t => (
                <option key={t.id} value={t.nomor_meja}>
                  {t.nomor_meja} {t.label ? `(${t.label})` : ''} - {t.status}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cart Container Card */}
      <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 shrink-0">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-red-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Keranjang Belanja</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
              {totalCartQty} Item
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
                    setMobileCartDrawerOpen(false)
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

        {/* Cart Items Scroll Area - Isolated scrolling */}
        <div className={`overflow-y-auto scrollbar-thin space-y-2 pr-1 ${isMobileSheet ? 'max-h-60' : 'max-h-44 xl:max-h-52'}`}>
          {cart.length === 0 ? (
            <div className="py-6 text-center text-slate-400 space-y-1">
              <ShoppingCart size={24} className="mx-auto opacity-30" />
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

        {/* Dynamic Kembalian / Uang Kurang Feedback */}
        {jenisBayar === 'TUNAI' && bayar.trim() !== '' && (
          kembalian < 0 ? (
            <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={15} className="shrink-0 text-red-500" />
                <span>Uang Pembayaran Kurang:</span>
              </div>
              <span className="text-sm font-black">{formatRupiah(Math.abs(kembalian))}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <span>Kembalian:</span>
              </div>
              <span className="text-sm font-black">{formatRupiah(kembalian)}</span>
            </div>
          )
        )}

        {jenisBayar !== 'TUNAI' && paidAmount > 0 && (
          <div className="flex justify-between text-xs font-bold pt-1 text-emerald-600 dark:text-emerald-400">
            <span>Status Pembayaran</span>
            <span>Sesuai Tagihan</span>
          </div>
        )}

        {/* Submit Pay Button */}
        <Button
          className="w-full h-13 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/20 border-0 active:scale-[0.98] transition-all disabled:opacity-50"
          loading={loading}
          disabled={loading || (jenisBayar === 'QRIS' ? !qrisCanPay : (!cart.length || !bayar || (jenisBayar === 'TUNAI' && kembalian < 0)))}
          onClick={handleBayar}
          icon={jenisBayar === 'QRIS' ? <QrCode size={18} /> : <ShoppingCart size={18} />}
        >
          {jenisBayar === 'QRIS' ? 'BAYAR DENGAN QRIS' : 'PROSES PEMBAYARAN'}
        </Button>

      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-8.5rem)] lg:flex-row select-none">
      
      {/* Left Column (Katalog Produk) */}
      <div className="flex min-w-0 flex-none lg:flex-1 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm lg:p-4 lg:h-full lg:overflow-hidden">
        
        {/* Fixed Header Section (Shift banner, Title, Shortcuts, Search, Category chips) */}
        <div className="shrink-0 flex flex-col gap-2.5">
          {/* Shift Warning Banner */}
          {!activeShiftId && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Mobile Header Cart Shortcut */}
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileCartDrawerOpen(true)}
                  className="lg:hidden px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-600/30 active:scale-95 transition-transform"
                >
                  <ShoppingCart size={14} />
                  <span>{totalCartQty} Item</span>
                  <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{formatRupiah(totalBayar)}</span>
                </button>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">F1 Cari</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">F2 Bayar</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">F5 Proses</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Esc Reset</span>
              </div>
            </div>
          </div>

          {/* Search Input & Camera Scanner Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 group">
              <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cari produk (Nama / Kode / Barcode)... [F1]"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                className="w-full h-12 pl-11 pr-10 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-red-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-600/15 transition-all shadow-inner"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); searchRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={openCameraScanner}
              className="h-12 px-4 sm:px-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs sm:text-sm flex items-center gap-2 shrink-0 shadow-sm active:scale-95 transition-all"
              title="Buka Kamera Barcode Scanner"
            >
              <ScanLine size={20} className="text-red-600" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          </div>

          {/* Category Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Semua</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {products.filter(p => p.jenis_transaksi === 'INCOME').length}
              </span>
            </button>

            {categoryList.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Grid (Scrolls independently) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
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

      </div>

      {/* Desktop Side-by-Side Cart & Payment Panel */}
      <div className="hidden lg:flex flex-none w-full shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-sm lg:w-[26rem] xl:w-[28rem] lg:h-full lg:overflow-y-auto scrollbar-thin">
        {renderCartAndPayment(false)}
      </div>

      {/* Mobile Sticky Floating Summary Bar (Appears when cart has items and drawer is closed) */}
      <AnimatePresence>
        {cart.length > 0 && !mobileCartDrawerOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed bottom-[4.5rem] left-3 right-3 z-40 lg:hidden"
          >
            <div
              onClick={() => setMobileCartDrawerOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white shadow-2xl shadow-red-600/30 border border-red-500/30 backdrop-blur-xl cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white font-bold shadow-md">
                  <ShoppingCart size={20} />
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
                    {totalCartQty}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Tagihan ({totalCartQty} item)</p>
                  <p className="text-base font-black text-white">{formatRupiah(totalBayar)}</p>
                </div>
              </div>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-red-600/40 active:scale-95 transition-transform"
              >
                <span>Bayar</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Checkout Bottom Sheet Drawer */}
      <AnimatePresence>
        {mobileCartDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileCartDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative z-10 w-full max-h-[88vh] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Handle bar & Header */}
              <div
                className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 shrink-0 cursor-pointer"
                onClick={() => setMobileCartDrawerOpen(false)}
              />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600">
                    <ShoppingCart size={16} />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Keranjang & Pembayaran</h3>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 text-[11px] font-bold">
                    {totalCartQty} Item
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileCartDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content inside Drawer */}
              <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
                {renderCartAndPayment(true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          <div className="flex flex-wrap gap-2 w-full justify-end">
            <Button
              variant="secondary"
              icon={<MessageCircle size={16} className="text-emerald-500" />}
              onClick={sendWhatsAppReceipt}
              className="w-full sm:w-auto font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
            >
              Kirim WA
            </Button>
            <Button variant="secondary" icon={<Printer size={16} />} onClick={handlePrint} className="w-full sm:w-auto font-bold">
              Cetak Struk
            </Button>
            <Button onClick={resetTransaksi} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0">
              Transaksi Baru
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Quick WhatsApp Recipient Input */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <MessageCircle size={16} className="text-emerald-500 shrink-0" />
            <input
              type="tel"
              value={manualWaPhone || selectedCustomer?.no_telp || ''}
              onChange={e => setManualWaPhone(e.target.value)}
              placeholder="No. WhatsApp Pembeli (cth: 08123456789)..."
              className="w-full text-xs bg-transparent text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

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
