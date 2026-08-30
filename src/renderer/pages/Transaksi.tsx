import React, { useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import {
  Search,
  ShoppingCart,
  X,
  AlertCircle,
  ScanLine,
  ArrowRight,
  Clock
} from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import StrukSettingsModal from '../components/StrukSettingsModal'
import BluetoothPrinterModal from '../components/BluetoothPrinterModal'
import CameraBarcodeScannerModal from '../components/CameraBarcodeScannerModal'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import { useHoldCart } from '../hooks/useHoldCart'
import type { Barang, Customer, Kategori } from '../../shared/types'
import { useReactToPrint } from 'react-to-print'
import { ensureBluetoothPrinterPermission } from '../utils/nativePermissions'
import { bluetoothPrinter } from '../utils/bluetoothPrinter'
import { cashierSound } from '../utils/sound'
import { useTransaksiState } from '../components/transaksi/useTransaksiState'
import { SalePayload, QrisStatus, QrisPayment } from '../components/transaksi/types'

import CustomerSelector from '../components/transaksi/CustomerSelector'
import OrderTypeSelector from '../components/transaksi/OrderTypeSelector'
import CartPanel from '../components/transaksi/CartPanel'
import PaymentPanel from '../components/transaksi/PaymentPanel'
import ProductGrid from '../components/transaksi/ProductGrid'
import QrisModal from '../components/transaksi/QrisModal'
import StrukModal from '../components/transaksi/StrukModal'
import HeldCartsModal from '../components/transaksi/HeldCartsModal'

export default function Transaksi() {
  const toast = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { trackUsage, isOverLimit, remainingUsage, isDemo, showPricing } = useDemoGuard()
  const { heldCarts, holdCart, resumeCart, deleteHeld } = useHoldCart()
  const lastScanTimestampRef = useRef<number>(0)

  const state = useTransaksiState()
  
  const loadProducts = useCallback(async () => {
    state.setProductsLoading(true)
    const r = await api<Barang[]>('barang:getAll')
    if (r.success) state.setProducts(r.data ?? [])
    state.setProductsLoading(false)
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      state.searchRef.current?.focus()
    }
  }, [])
  useEffect(() => {
    api<Customer[]>('customer:getAll').then(r => { if (r.success) state.setCustomers(r.data ?? []) })
    api<Kategori[]>('kategori:getAll').then(r => { if (r.success) state.setCategories(r.data ?? []) })
    api<any[]>('table:getAll').then(r => { if (r.success && r.data) state.setAvailableTables(r.data) })
    api<{ rate: number }>('tax:getActiveRate').then(r => { if (r.success && r.data) state.setPajakPersen(r.data.rate) })
    if (user?.nama_pengguna) {
      api<any>('shift:getCurrent', user.nama_pengguna).then(r => { if (r.success && r.data) state.setActiveShiftId(r.data.id) })
    }
  }, [user?.nama_pengguna])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (state.customerRef.current && !state.customerRef.current.contains(e.target as Node)) state.setShowCustomerDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    state.selectedCustomerRef.current = state.selectedCustomer
  }, [state.selectedCustomer])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'F1') {
        e.preventDefault()
        state.searchRef.current?.focus()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        state.setShowShortcuts(v => !v)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        if (state.cart.length > 0) {
          const ok = state.holdCartRef.current(state.cart, state.selectedCustomerRef.current)
          if (ok) {
            state.setCart([])
            state.setBayar('')
            state.setSelectedCustomer(null)
            toast('Transaksi di-hold. Tekan tombol Held untuk melanjutkan.', 'success')
          } else {
            toast('Gagal hold: keranjang kosong atau batas hold tercapai', 'error')
          }
        }
        return
      }

      if (e.key === 'F2') {
        e.preventDefault()
        state.setMobileCartDrawerOpen(true)
        state.bayarInputRef.current?.focus()
        return
      }

      if (e.key === 'F5') {
        e.preventDefault()
        if (!state.loading && state.cart.length && (state.jenisBayar === 'QRIS' || state.bayar)) state.handleBayarRef.current()
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (state.cart.length > 0) {
          state.setShowClearCart(true)
        }
        return
      }

      if (e.key === 'Enter') {
        if (state.barcodeBuffer.current.length > 0) {
          const barcode = state.barcodeBuffer.current.trim()
          state.barcodeBuffer.current = ''
          if (state.barcodeTimeoutRef.current) clearTimeout(state.barcodeTimeoutRef.current)

          const product = state.products.find(p => p.barcode === barcode)
          if (product) {
            state.addToCartRef.current(product)
          } else {
            cashierSound.playErrorBuzz()
            toast(`Barcode "${barcode}" tidak ditemukan`, 'error')
          }
        }
        return
      }

      if (e.key.length === 1) {
        state.barcodeBuffer.current += e.key
        if (state.barcodeTimeoutRef.current) clearTimeout(state.barcodeTimeoutRef.current)
        state.barcodeTimeoutRef.current = setTimeout(() => {
          state.barcodeBuffer.current = ''
        }, 300)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (state.barcodeTimeoutRef.current) clearTimeout(state.barcodeTimeoutRef.current)
    }
  }, [state.products, state.cart.length, state.bayar, state.jenisBayar, toast])

  const categoryList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    const incomeProducts = state.products.filter(p => p.jenis_transaksi === 'INCOME')
    
    state.categories.forEach(c => {
      if (c.kategori_barang) {
        const id = String(c.kd_kategori_barang ?? c.kategori_barang)
        map.set(id, { id, name: c.kategori_barang, count: 0 })
      }
    })

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
  }, [state.categories, state.products])

  const filtered = useMemo(() => state.products.filter(p => {
    if (p.jenis_transaksi !== 'INCOME') return false

    if (state.selectedCategory !== 'ALL') {
      const catName = (p.kategori_barang ?? '').toLowerCase()
      const catId = String(p.kd_kategori_barang ?? '')
      const selected = state.selectedCategory.toLowerCase()
      if (catId !== state.selectedCategory && catName !== selected) return false
    }

    if (state.search.trim()) {
      const q = state.search.toLowerCase()
      const matchName = (p.nama_barang ?? '').toLowerCase().includes(q)
      const matchKd = p.kd_barang.toLowerCase().includes(q)
      const matchBarcode = (p.barcode ?? '').toLowerCase().includes(q)
      if (!matchName && !matchKd && !matchBarcode) return false
    }

    return true
  }), [state.products, state.search, state.selectedCategory])

  const addToCart = (p: Barang) => {
    const maxStok = p.stok ?? 0
    if (maxStok <= 0) {
      cashierSound.playErrorBuzz()
      toast('Stok produk habis', 'error')
      return
    }
    state.setCart(prev => {
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
    state.setSearch('')
    if (!Capacitor.isNativePlatform()) {
      state.searchRef.current?.focus()
    }
  }

  const handleCameraBarcode = useCallback((barcode: string) => {
    const now = Date.now()
    if (now - lastScanTimestampRef.current < 600) return
    lastScanTimestampRef.current = now

    const trimmed = barcode.trim()
    const product = state.products.find(p => p.barcode === trimmed || p.kd_barang === trimmed)
    if (!product) {
      cashierSound.playErrorBuzz()
      toast(`Barcode "${trimmed}" tidak ditemukan`, 'error')
      return
    }

    addToCart(product)
  }, [state.products, toast, addToCart])

  const openCameraScanner = () => {
    state.setCameraScannerOpen(true)
  }

  const updateQty = (kd: string, delta: number) => {
    state.setCart(prev => prev.map(c => {
      if (c.kd_barang !== kd) return c
      const newQty = c.qty + delta
      if (delta > 0) {
        const product = state.products.find(p => p.kd_barang === kd)
        const maxStok = product?.stok ?? 0
        if (newQty > maxStok) {
          toast(`Stok ${c.nama_barang} tidak mencukupi (tersisa ${maxStok})`, 'error')
          return c
        }
      }
      return { ...c, qty: newQty }
    }).filter(c => c.qty > 0))
  }
  
  const removeItem = (kd: string) => state.setCart(prev => prev.filter(c => c.kd_barang !== kd))

  const subTotal = useMemo(() => state.cart.reduce((sum, c) => {
    const disc = (c.harga_jual * c.disc) / 100
    return sum + (c.harga_jual - disc) * c.qty
  }, 0), [state.cart])

  const totalCartQty = useMemo(() => state.cart.reduce((a, b) => a + b.qty, 0), [state.cart])

  const pajakAmount = useMemo(() => Math.round(subTotal * state.pajakPersen / 100), [subTotal, state.pajakPersen])
  const totalBayar = useMemo(() => Math.max(0, subTotal + pajakAmount - state.promoDiskon), [subTotal, pajakAmount, state.promoDiskon])
  const paidAmount = useMemo(() => state.jenisBayar === 'QRIS' ? totalBayar : (parseFloat(state.bayar) || 0), [state.jenisBayar, totalBayar, state.bayar])
  const kembalian = useMemo(() => paidAmount - totalBayar, [paidAmount, totalBayar])
  const poinEarned = useMemo(() => state.selectedCustomer ? Math.floor(subTotal / 10000) : 0, [state.selectedCustomer, subTotal])
  const qrisCanPay = useMemo(() => Boolean(state.cart.length && totalBayar > 0), [state.cart.length, totalBayar])
  const isStaticQrisPayment = state.qrisPayment?.provider === 'static'

  useEffect(() => {
    if (state.jenisBayar === 'QRIS') {
      state.setBayar(totalBayar > 0 ? String(totalBayar) : '')
    }
  }, [state.jenisBayar, totalBayar])

  const applyPromo = async () => {
    if (!state.promoCode.trim()) return
    state.setPromoLoading(true)
    const r = await api<any>('promo:validate', state.promoCode.trim().toUpperCase(), subTotal, state.cart)
    state.setPromoLoading(false)
    if (r.success && r.data?.valid) {
      state.setPromoDiskon(r.data.discount)
      state.setPromoMsg(`${r.data.promo?.name} - hemat ${formatRupiah(r.data.discount)}`)
    } else {
      state.setPromoDiskon(0)
      state.setPromoMsg(r.data?.message ?? r.message ?? 'Kode promo tidak valid')
    }
  }

  const removePromo = () => {
    state.setPromoCode('')
    state.setPromoDiskon(0)
    state.setPromoMsg('')
  }

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length > 0) addToCart(filtered[0])
  }

  const printReceipt = useReactToPrint({ content: () => state.strukRef.current })

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
    items: state.cart.map(item => ({ ...item })),
    yang_dibayar: amount,
    jenis_pembayaran: paymentType,
    kd_customer: state.selectedCustomer?.kd_customer,
    pajak: pajakAmount,
    diskon_promo: state.promoDiskon,
    kode_promo: state.promoCode || undefined,
    shift_id: state.activeShiftId ?? undefined,
    tipe_pesanan: state.tipePesanan,
    nomor_meja: state.tipePesanan === 'DINE_IN' ? (state.nomorMeja.trim() || undefined) : undefined,
  })

  const broadcastCustomerDisplay = useCallback((extra?: Record<string, any>) => {
    try {
      const payload = {
        items: state.cart.map(item => ({
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_jual: item.harga_jual,
          disc: item.disc ?? 0,
        })),
        subtotal: subTotal,
        total: totalBayar,
        storeName: 'Zetass Pos',
        status: state.cart.length > 0 ? 'scanning' : 'idle',
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
  }, [state.cart, subTotal, totalBayar])

  useEffect(() => {
    broadcastCustomerDisplay()
  }, [state.cart, subTotal, totalBayar, broadcastCustomerDisplay])

  const sendWhatsAppReceipt = () => {
    const rawPhone = (state.manualWaPhone || state.selectedCustomer?.no_telp || '').replace(/\D/g, '')
    const targetPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone

    const itemList = state.cart.map(i => `• ${i.nama_barang} (${i.qty}x) = ${formatRupiah(i.harga_jual * i.qty)}`).join('\n')
    const msg = 
`*STRUK TRANSAKSI ZETASS POS*
----------------------------------------
No. Transaksi : *${state.lastKd || '-'}*
Waktu         : ${new Date().toLocaleString('id-ID')}
Tipe Order    : *${state.tipePesanan === 'DINE_IN' ? 'Makan di Tempat (Dine-In)' : state.tipePesanan === 'TAKEAWAY' ? 'Bungkus (Takeaway)' : 'Pengiriman (Delivery)'}* ${state.nomorMeja ? `(Meja: ${state.nomorMeja})` : ''}
Kasir         : ${user?.nama_pengguna || 'Kasir'}
Pelanggan     : ${state.selectedCustomer?.nama_customer || 'Pelanggan Umum'}
----------------------------------------
*DAFTAR PESANAN:*
${itemList}
----------------------------------------
Subtotal      : ${formatRupiah(subTotal)}
${pajakAmount > 0 ? `PPN (${state.pajakPersen}%) : ${formatRupiah(pajakAmount)}\n` : ''}${state.promoDiskon > 0 ? `Diskon Promo : -${formatRupiah(state.promoDiskon)}\n` : ''}*TOTAL BAYAR  : ${formatRupiah(totalBayar)}*
Metode Bayar  : ${state.jenisBayar}
Bayar         : ${formatRupiah(paidAmount)}
Kembalian     : ${formatRupiah(kembalian)}
----------------------------------------
Terima kasih atas kunjungan Anda!`

    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    toast('Membuka WhatsApp untuk mengirim struk...', 'success')
  }

  const completeSale = useCallback(async (payload: SalePayload) => {
    const r = await api<{ kd_transaksi: string }>('penjualan:create', { ...payload })
    if (r.success) {
      cashierSound.playSuccessChime()
      state.setLastKd(r.data?.kd_transaksi ?? null)
      toast(r.message as string)
      state.setMobileCartDrawerOpen(false)
      state.setShowStruk(true)
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
  }, [isDemo, remainingUsage, showPricing, toast, trackUsage, broadcastCustomerDisplay, totalBayar])

  const createQrisPayment = async () => {
    if (state.qrisCreatingRef.current) return
    state.qrisCreatingRef.current = true
    const payload = buildSalePayload('QRIS', totalBayar)
    const qrisItems = state.cart.map(item => {
      const disc = (item.harga_jual * item.disc) / 100
      return {
        id: item.kd_barang,
        name: item.nama_barang,
        price: item.harga_jual - disc,
        quantity: item.qty,
      }
    })
    if (pajakAmount > 0) {
      qrisItems.push({ id: 'PPN', name: `PPN ${state.pajakPersen}%`, price: pajakAmount, quantity: 1 })
    }
    if (state.promoDiskon > 0) {
      qrisItems.push({ id: 'PROMO', name: state.promoCode ? `Diskon ${state.promoCode}` : 'Diskon promo', price: -state.promoDiskon, quantity: 1 })
    }

    state.pendingQrisPayloadRef.current = payload
    state.setBayar(String(totalBayar))
    state.setQrisStatus('Menyiapkan QRIS...')
    state.setQrisPayment(null)
    state.setShowQris(true)

    const r = await api<QrisPayment>('payment:createQris', {
      amount: totalBayar,
      customerName: state.selectedCustomer?.nama_customer ?? 'Customer POS',
      customerEmail: state.selectedCustomer?.email ?? undefined,
      customerPhone: state.selectedCustomer?.no_telp ?? undefined,
      items: qrisItems,
    })

    if (r.success && r.data) {
      state.setQrisPayment(r.data)
      state.setQrisStatus(
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
      state.pendingQrisPayloadRef.current = null
      state.setShowQris(false)
      toast(r.message as string, 'error')
    }
    state.qrisCreatingRef.current = false
  }

  const completeQrisSale = useCallback(async () => {
    const payload = state.pendingQrisPayloadRef.current
    if (!payload || state.qrisCompletingRef.current) return

    state.qrisCompletingRef.current = true
    state.setQrisCompleting(true)
    state.setQrisStatus('Pembayaran diterima. Menyimpan transaksi...')
    let saved = false
    try {
      saved = await completeSale(payload)
    } finally {
      state.qrisCompletingRef.current = false
      state.setQrisCompleting(false)
    }

    if (saved) {
      state.pendingQrisPayloadRef.current = null
      state.setShowQris(false)
      state.setQrisPayment(null)
    }
  }, [completeSale])

  const checkQrisStatus = useCallback(async () => {
    if (!state.qrisPayment?.orderId || state.qrisCheckingRef.current || state.qrisCompletingRef.current) return

    if (state.qrisPayment.provider === 'static') {
      state.setQrisStatus('QRIS ini memakai gambar upload. Konfirmasi pembayaran secara manual setelah dana diterima.')
      return
    }

    state.qrisCheckingRef.current = true
    state.setQrisChecking(true)
    try {
      const r = await api<QrisStatus>('payment:checkStatus', state.qrisPayment.orderId)

      if (!r.success) {
        state.setQrisStatus(r.message ?? 'Gagal mengecek status pembayaran')
        return
      }

      if (r.data?.paid) {
        await completeQrisSale()
        return
      }

      if (r.data?.failed) {
        state.pendingQrisPayloadRef.current = null
        state.setQrisStatus('Pembayaran QRIS gagal, dibatalkan, atau kedaluwarsa.')
        return
      }

      state.setQrisStatus('Menunggu pembayaran dari pelanggan...')
    } finally {
      state.qrisCheckingRef.current = false
      state.setQrisChecking(false)
    }
  }, [completeQrisSale, state.qrisPayment?.orderId, state.qrisPayment?.provider])

  useEffect(() => {
    if (!state.showQris || !state.qrisPayment?.orderId || state.qrisCompleting || state.qrisPayment.provider === 'static') return
    const interval = setInterval(() => { checkQrisStatus() }, 3000)
    checkQrisStatus()
    return () => clearInterval(interval)
  }, [checkQrisStatus, state.qrisCompleting, state.qrisPayment?.orderId, state.qrisPayment?.provider, state.showQris])

  const cancelQrisPayment = async () => {
    const orderId = state.qrisPayment?.orderId
    const provider = state.qrisPayment?.provider
    state.pendingQrisPayloadRef.current = null
    state.qrisCreatingRef.current = false
    state.qrisCheckingRef.current = false
    state.qrisCompletingRef.current = false
    state.setShowQris(false)
    state.setQrisPayment(null)
    state.setQrisChecking(false)
    state.setQrisCompleting(false)
    state.setQrisStatus('Menyiapkan QRIS...')
    if (orderId && provider !== 'static') {
      await api('payment:cancelQris', orderId)
    }
  }

  const handleBluetoothPrint = async () => {
    if (!bluetoothPrinter.isConnected()) {
      state.setShowBtPrinterModal(true)
      return
    }
    state.setBtPrinting(true)
    try {
      const identitasRes = await api<any>('identitas:get')
      const strukSettingsRes = await api<any>('strukSettings:get')
      const paperSize = (localStorage.getItem('zetass_bt_paper_size') as '58mm' | '80mm') || strukSettingsRes?.data?.paper_size || '58mm'

      const result = await bluetoothPrinter.printStruk({
        namaToko: identitasRes?.data?.namatoko || 'Zetass Pos',
        alamat: identitasRes?.data?.alamattoko,
        telepon: identitasRes?.data?.nomortelptoko,
        kdTransaksi: state.lastKd || 'TRX-TEMP',
        waktu: new Date().toLocaleString('id-ID'),
        kasir: user?.nama_lengkap || user?.nama_pengguna || 'Kasir',
        customer: state.selectedCustomer?.nama_customer,
        items: state.cart.map(c => ({
          nama: c.nama_barang,
          qty: c.qty,
          harga: c.harga_jual,
          subtotal: (c.harga_jual - (c.harga_jual * c.disc) / 100) * c.qty,
          catatan: (c as any).catatan,
        })),
        totalItem: state.cart.reduce((s, i) => s + i.qty, 0),
        subtotal: subTotal,
        diskon: state.promoDiskon,
        pajak: pajakAmount,
        totalBayar: totalBayar,
        nominalBayar: paidAmount,
        kembalian: kembalian,
        metodeBayar: state.jenisBayar,
        pesanFooter: strukSettingsRes?.data?.footer_text || 'Terima kasih atas kunjungan Anda!',
        tipeKertas: paperSize,
        openCashDrawer: true,
      })
      if (result.success) toast(result.message, 'success')
      else toast(result.message, 'error')
    } catch (err: any) {
      toast(err.message || 'Gagal mencetak ke printer Bluetooth.', 'error')
    } finally {
      state.setBtPrinting(false)
    }
  }

  const handleBayar = async () => {
    if (state.loading) return
    if (!state.cart.length) {
      cashierSound.playErrorBuzz()
      return toast('Keranjang kosong', 'error')
    }
    if (!state.activeShiftId) {
      cashierSound.playErrorBuzz()
      toast('Shift kasir belum dibuka. Buka shift terlebih dahulu.', 'error')
      return
    }
    if (state.jenisBayar !== 'QRIS' && (parseFloat(state.bayar) || 0) < totalBayar) {
      cashierSound.playErrorBuzz()
      const kurang = totalBayar - (parseFloat(state.bayar) || 0)
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
    state.setLoading(true)
    try {
      if (state.jenisBayar === 'QRIS') {
        await createQrisPayment()
        return
      }
      await completeSale(buildSalePayload(state.jenisBayar, parseFloat(state.bayar)))
    } finally {
      state.setLoading(false)
    }
  }

  state.handleBayarRef.current = handleBayar
  state.addToCartRef.current = addToCart
  state.holdCartRef.current = holdCart

  const resetTransaksi = () => {
    state.setCart([])
    state.setBayar('')
    state.setMobileCartDrawerOpen(false)
    state.setShowStruk(false)
    state.setShowQris(false)
    state.setQrisPayment(null)
    state.setQrisChecking(false)
    state.setQrisCompleting(false)
    state.setQrisStatus('Menyiapkan QRIS...')
    state.pendingQrisPayloadRef.current = null
    state.qrisCreatingRef.current = false
    state.qrisCheckingRef.current = false
    state.qrisCompletingRef.current = false
    state.setLastKd(null)
    state.setSelectedCustomer(null)
    state.setCustomerSearch('')
    state.setPromoCode('')
    state.setPromoDiskon(0)
    state.setPromoMsg('')
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
    if (!Capacitor.isNativePlatform()) {
      state.searchRef.current?.focus()
    }
  }

  const renderCartAndPayment = (isMobileSheet = false) => (
    <div className="flex flex-col gap-3">
      <CustomerSelector
        customers={state.customers}
        selectedCustomer={state.selectedCustomer}
        customerSearch={state.customerSearch}
        showCustomerDrop={state.showCustomerDrop}
        customerRef={state.customerRef}
        onSelectCustomer={c => { state.setSelectedCustomer(c); state.setShowCustomerDrop(false); state.setCustomerSearch('') }}
        onClearCustomer={() => { state.setSelectedCustomer(null); state.setCustomerSearch('') }}
        onSearchChange={state.setCustomerSearch}
        onToggleDropdown={() => state.setShowCustomerDrop(v => !v)}
      />

      <OrderTypeSelector
        tipePesanan={state.tipePesanan}
        nomorMeja={state.nomorMeja}
        availableTables={state.availableTables}
        onChangeTipe={state.setTipePesanan}
        onChangeMeja={state.setNomorMeja}
      />

      <CartPanel
        cart={state.cart}
        totalCartQty={totalCartQty}
        heldCarts={heldCarts}
        bluetoothPrinterConnected={bluetoothPrinter.isConnected()}
        onHold={() => {
          if (state.cart.length > 0) {
            const ok = holdCart(state.cart, state.selectedCustomer)
            if (ok) {
              state.setCart([])
              state.setBayar('')
              state.setSelectedCustomer(null)
              state.setMobileCartDrawerOpen(false)
              toast('Transaksi di-hold', 'success')
            } else {
              toast('Batas hold tercapai (maks 10)', 'error')
            }
          }
        }}
        onShowHeld={() => state.setShowHeldCarts(true)}
        onShowBtPrinter={() => state.setShowBtPrinterModal(true)}
        onShowSettings={() => state.setShowSettings(true)}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        isMobileSheet={isMobileSheet}
      />

      <PaymentPanel
        cart={state.cart}
        subTotal={subTotal}
        promoCode={state.promoCode}
        promoDiskon={state.promoDiskon}
        promoMsg={state.promoMsg}
        promoLoading={state.promoLoading}
        pajakPersen={state.pajakPersen}
        pajakAmount={pajakAmount}
        totalBayar={totalBayar}
        jenisBayar={state.jenisBayar}
        bayar={state.bayar}
        bayarInputRef={state.bayarInputRef}
        paidAmount={paidAmount}
        kembalian={kembalian}
        qrisCanPay={qrisCanPay}
        loading={state.loading}
        onChangePromoCode={c => { state.setPromoCode(c); state.setPromoDiskon(0); state.setPromoMsg('') }}
        onApplyPromo={applyPromo}
        onRemovePromo={removePromo}
        onChangeBayar={state.setBayar}
        onChangeJenisBayar={state.setJenisBayar}
        onHandleBayar={handleBayar}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-8.5rem)] lg:flex-row select-none">
      <div className="flex min-w-0 flex-none lg:flex-1 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm lg:p-4 lg:h-full lg:overflow-hidden">
        
        <div className="shrink-0 flex flex-col gap-2.5">
          {!state.activeShiftId && (
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
              <button
                type="button"
                onClick={() => navigate('/shifts')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 shadow-sm transition shrink-0"
                title="Buka / Tutup Shift Kasir"
              >
                <Clock size={14} className={state.activeShiftId ? "text-emerald-500" : "text-amber-500"} />
                <span>{state.activeShiftId ? 'Shift Aktif' : 'Shift Kasir'}</span>
              </button>

              {state.cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => state.setMobileCartDrawerOpen(true)}
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

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 group">
              <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" />
              <input
                ref={state.searchRef}
                type="text"
                placeholder="Cari produk (Nama / Kode / Barcode)... [F1]"
                value={state.search}
                onChange={e => state.setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                className="w-full h-12 pl-11 pr-10 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-red-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-600/15 transition-all shadow-inner"
              />
              {state.search && (
                <button
                  type="button"
                  onClick={() => { state.setSearch(''); state.searchRef.current?.focus() }}
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

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
            <button
              type="button"
              onClick={() => state.setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                state.selectedCategory === 'ALL'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Semua</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                state.selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {state.products.filter(p => p.jenis_transaksi === 'INCOME').length}
              </span>
            </button>

            {categoryList.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => state.setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  state.selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  state.selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
          <ProductGrid
            products={state.products}
            productsLoading={state.productsLoading}
            filtered={filtered}
            onAddToCart={addToCart}
          />
        </div>

      </div>

      <div className="hidden lg:flex flex-none w-full shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-sm lg:w-[26rem] xl:w-[28rem] lg:h-full lg:overflow-y-auto scrollbar-thin">
        {renderCartAndPayment(false)}
      </div>

      <AnimatePresence>
        {state.cart.length > 0 && !state.mobileCartDrawerOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed bottom-[4.5rem] left-3 right-3 z-40 lg:hidden"
          >
            <div
              onClick={() => state.setMobileCartDrawerOpen(true)}
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

      <AnimatePresence>
        {state.mobileCartDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => state.setMobileCartDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative z-10 w-full max-h-[88vh] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col shadow-2xl overflow-hidden"
            >
              <div
                className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 shrink-0 cursor-pointer"
                onClick={() => state.setMobileCartDrawerOpen(false)}
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
                  onClick={() => state.setMobileCartDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
                {renderCartAndPayment(true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QrisModal
        open={state.showQris}
        totalBayar={totalBayar}
        qrisPayment={state.qrisPayment}
        qrisStatus={state.qrisStatus}
        qrisChecking={state.qrisChecking}
        qrisCompleting={state.qrisCompleting}
        isStaticQrisPayment={isStaticQrisPayment}
        onCancel={cancelQrisPayment}
        onCompleteQrisSale={completeQrisSale}
        onCheckStatus={checkQrisStatus}
      />

      <StrukModal
        open={state.showStruk}
        cart={state.cart}
        subTotal={subTotal}
        pajakAmount={pajakAmount}
        pajakPersen={state.pajakPersen}
        totalBayar={totalBayar}
        promoDiskon={state.promoDiskon}
        paidAmount={paidAmount}
        kembalian={kembalian}
        lastKd={state.lastKd}
        jenisBayar={state.jenisBayar}
        selectedCustomer={state.selectedCustomer}
        poinEarned={poinEarned}
        user={user}
        strukRef={state.strukRef}
        manualWaPhone={state.manualWaPhone}
        btPrinting={state.btPrinting}
        bluetoothPrinterConnected={bluetoothPrinter.isConnected()}
        onClose={resetTransaksi}
        onSendWhatsApp={sendWhatsAppReceipt}
        onHandlePrint={handlePrint}
        onHandleBluetoothPrint={handleBluetoothPrint}
        onChangeManualWaPhone={state.setManualWaPhone}
      />

      <CameraBarcodeScannerModal
        open={state.cameraScannerOpen}
        onClose={() => state.setCameraScannerOpen(false)}
        onScan={handleCameraBarcode}
      />

      <BluetoothPrinterModal
        open={state.showBtPrinterModal}
        onClose={() => state.setShowBtPrinterModal(false)}
      />

      <StrukSettingsModal isOpen={state.showSettings} onClose={() => state.setShowSettings(false)} />

      <HeldCartsModal
        open={state.showHeldCarts}
        heldCarts={heldCarts}
        cart={state.cart}
        onClose={() => state.setShowHeldCarts(false)}
        onResume={id => {
          const resumed = resumeCart(id)
          if (resumed) {
            state.setCart(resumed.items)
            toast('Transaksi dilanjutkan', 'success')
            state.setShowHeldCarts(false)
          }
        }}
        onDelete={deleteHeld}
        toast={toast}
      />

      <KeyboardShortcutsModal open={state.showShortcuts} onClose={() => state.setShowShortcuts(false)} />

      <ConfirmDialog
        open={state.showClearCart}
        onClose={() => state.setShowClearCart(false)}
        onConfirm={() => {
          state.setCart([])
          state.setBayar('')
          toast('Keranjang dibersihkan')
          state.setShowClearCart(false)
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
