import { useEffect, useState, useRef, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Printer, UserCircle, X, Image, Settings, QrCode } from 'lucide-react'
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
  const searchRef = useRef<HTMLInputElement>(null)
  const strukRef = useRef<HTMLDivElement>(null)

  // Pajak PPN
  const [pajakPersen, setPajakPersen] = useState(0)

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)

  const loadProducts = useCallback(async () => {
    const r = await api<Barang[]>('barang:getAll')
    if (r.success) setProducts(r.data ?? [])
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    api<Customer[]>('customer:getAll').then(r => { if (r.success) setCustomers(r.data ?? []) })
    api<Identitas>('identitas:get').then(r => { if (r.success && r.data) setPajakPersen(r.data.pajak_persen ?? 0) })
  }, [])

  // Close customer dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

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
  const totalBayar = subTotal + pajakAmount
  const kembalian = (parseFloat(bayar) || 0) - totalBayar
  const poinEarned = selectedCustomer ? Math.floor(subTotal / 10000) : 0

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length > 0) addToCart(filtered[0])
  }

  const handlePrint = useReactToPrint({ content: () => strukRef.current })

  const handleBayar = async () => {
    if (!cart.length) return toast('Keranjang kosong', 'error')
    if ((parseFloat(bayar) || 0) < totalBayar) return toast('Jumlah bayar kurang', 'error')
    // Warn demo users approaching limit
    if (isDemo && isOverLimit) {
      toast('Batas transaksi demo tercapai. Upgrade untuk melanjutkan.', 'error')
      return
    }
    setLoading(true)
    const r = await api<{ kd_transaksi: string }>('penjualan:create', {
      username: user?.nama_pengguna ?? 'KASIR',
      items: cart,
      yang_dibayar: parseFloat(bayar),
      jenis_pembayaran: jenisBayar,
      kd_customer: selectedCustomer?.kd_customer,
      pajak: pajakAmount,
    })
    setLoading(false)
    if (r.success) {
      setLastKd(r.kd_transaksi ?? null)
      toast(r.message as string)
      setShowStruk(true)
      // Track usage for demo limit system
      trackUsage()
      if (isDemo && remainingUsage <= 3 && remainingUsage > 0) {
        toast(`⚠️ Sisa ${remainingUsage - 1} transaksi demo`, 'error')
      }
    } else {
      toast(r.message as string, 'error')
    }
  }

  const resetTransaksi = () => {
    setCart([])
    setBayar('')
    setShowStruk(false)
    setLastKd(null)
    setSelectedCustomer(null)
    setCustomerSearch('')
    loadProducts()
    searchRef.current?.focus()
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <Input ref={searchRef} placeholder="Cari produk (Enter untuk tambah)..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey} icon={<Search size={14} />} />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
            {filtered.slice(0, 30).map(p => (
              <button key={p.kd_barang} onClick={() => addToCart(p)} disabled={(p.stok ?? 0) <= 0} className={`glass-card p-3 text-left transition-all duration-200 ${(p.stok ?? 0) <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-300 hover:shadow-primary-100 dark:hover:border-primary-700 active:scale-95'}`}>
                <div className="flex gap-3">
                  {p.foto_barang ? (
                    <img src={p.foto_barang} alt={p.nama_barang ?? ''} className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Image size={24} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{p.nama_barang}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.kd_barang}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">{formatRupiah(p.harga_barang)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${(p.stok ?? 0) <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{p.stok} stok</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Produk tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart + Payment */}
      <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
        {/* Customer selector */}
        <div ref={customerRef} className="relative">
          <div
            onClick={() => setShowCustomerDrop(v => !v)}
            className="glass-card px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:border-primary-300 transition-colors"
          >
            <UserCircle size={16} className={selectedCustomer ? 'text-primary-500' : 'text-slate-400'} />
            <span className={`flex-1 text-sm truncate ${selectedCustomer ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>
              {selectedCustomer ? `${selectedCustomer.nama_customer} · ${(selectedCustomer.poin ?? 0)} poin` : 'Pilih customer (opsional)'}
            </span>
            {selectedCustomer && (
              <button onClick={e => { e.stopPropagation(); setSelectedCustomer(null); setCustomerSearch('') }} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          {showCustomerDrop && (
            <div className="absolute top-full left-0 right-0 mt-1 glass-card shadow-xl rounded-xl overflow-hidden z-20">
              <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                <input
                  autoFocus
                  placeholder="Cari nama / no. telp..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none"
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
                <div key={item.kd_barang} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-700/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{item.nama_barang}</p>
                    <p className="text-xs text-slate-400">{formatRupiah(item.harga_jual)}{item.disc > 0 ? ` -${item.disc}%` : ''}</p>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{formatRupiah(total)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.kd_barang, -1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-primary-100 transition-colors"><Minus size={10} /></button>
                    <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.kd_barang, 1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-primary-100 transition-colors"><Plus size={10} /></button>
                    <button onClick={() => removeItem(item.kd_barang)} className="w-6 h-6 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 flex items-center justify-center transition-colors ml-1"><Trash2 size={10} /></button>
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all
                    ${jenisBayar === j ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary-300'}`}>
                  {j === 'TUNAI' ? <Banknote size={14} /> : j === 'TRANSFER' ? <CreditCard size={14} /> : <QrCode size={14} />} {j}
                </button>
              ))}
            </div>
            <Input label="Jumlah Bayar" type="number" value={bayar} onChange={e => setBayar(e.target.value)} placeholder="0" />
            {parseFloat(bayar) > 0 && (
              <div className={`flex justify-between text-sm font-semibold ${kembalian >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <span>Kembalian</span>
                <span>{formatRupiah(kembalian)}</span>
              </div>
            )}
            <Button className="w-full" loading={loading} disabled={!cart.length || !bayar} onClick={handleBayar} icon={<ShoppingCart size={16} />}>Bayar</Button>
          </div>
        </Card>
      </div>

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
          <Struk cart={cart} subTotal={subTotal} pajak={pajakAmount} pajakPersen={pajakPersen} totalBayar={totalBayar} bayar={parseFloat(bayar)} kembalian={kembalian} kdTransaksi={lastKd ?? ''} jenisBayar={jenisBayar} customerName={selectedCustomer?.nama_customer} poinEarned={poinEarned} kasirName={user?.nama_pengguna} />
        </div>
      </Modal>

      {/* Struk Settings Modal */}
      <StrukSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
