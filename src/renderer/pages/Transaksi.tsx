import { useEffect, useState, useRef, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Printer } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import type { Barang, CartItem } from '../../shared/types'
import Struk from '../components/Struk'
import { useReactToPrint } from 'react-to-print'

export default function Transaksi() {
  const toast = useToast()
  const [products, setProducts] = useState<Barang[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [bayar, setBayar] = useState('')
  const [jenisBayar, setJenisBayar] = useState<'TUNAI' | 'TRANSFER'>('TUNAI')
  const [loading, setLoading] = useState(false)
  const [lastKd, setLastKd] = useState<string | null>(null)
  const [showStruk, setShowStruk] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const strukRef = useRef<HTMLDivElement>(null)

  const loadProducts = useCallback(async () => {
    const r = await api<Barang[]>('barang:getAll')
    if (r.success) setProducts(r.data ?? [])
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus() }, [])

  const filtered = products.filter(p =>
    p.jenis_transaksi === 'INCOME' &&
    (p.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
     p.kd_barang.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (p: Barang) => {
    setCart(prev => {
      const existing = prev.find(c => c.kd_barang === p.kd_barang)
      if (existing) {
        return prev.map(c => c.kd_barang === p.kd_barang ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, {
        kd_barang: p.kd_barang,
        nama_barang: p.nama_barang ?? '',
        harga_jual: p.harga_barang ?? 0,
        harga_modal: p.harga_modal ?? 0,
        qty: 1,
        disc: p.potongan ?? 0,
      }]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  const updateQty = (kd: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.kd_barang === kd ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    )
  }

  const removeItem = (kd: string) => setCart(prev => prev.filter(c => c.kd_barang !== kd))

  const subTotal = cart.reduce((sum, c) => {
    const disc = (c.harga_jual * c.disc) / 100
    return sum + (c.harga_jual - disc) * c.qty
  }, 0)

  const kembalian = (parseFloat(bayar) || 0) - subTotal

  // Enter key on search: add first result
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length > 0) addToCart(filtered[0])
  }

  const handlePrint = useReactToPrint({ content: () => strukRef.current })

  const handleBayar = async () => {
    if (!cart.length) return toast('Keranjang kosong', 'error')
    if ((parseFloat(bayar) || 0) < subTotal) return toast('Jumlah bayar kurang', 'error')
    setLoading(true)
    const r = await api<{ kd_transaksi: string }>('penjualan:create', {
      username: 'KASIR',
      items: cart,
      yang_dibayar: parseFloat(bayar),
      jenis_pembayaran: jenisBayar,
    })
    setLoading(false)
    if (r.success) {
      setLastKd(r.kd_transaksi ?? null)
      toast(r.message as string)
      setShowStruk(true)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const resetTransaksi = () => {
    setCart([])
    setBayar('')
    setShowStruk(false)
    setLastKd(null)
    loadProducts()
    searchRef.current?.focus()
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <Input
          ref={searchRef}
          placeholder="Cari produk (Enter untuk tambah)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearchKey}
          icon={<Search size={14} />}
        />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
            {filtered.slice(0, 30).map(p => (
              <button
                key={p.kd_barang}
                onClick={() => addToCart(p)}
                className="glass-card p-3 text-left hover:border-primary-300 hover:shadow-primary-100 dark:hover:border-primary-700 transition-all duration-200 active:scale-95"
              >
                <p className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{p.nama_barang}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.kd_barang}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                    {formatRupiah(p.harga_barang)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${(p.stok ?? 0) <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {p.stok} stok
                  </span>
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
        <Card title="Keranjang" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 -mx-1 px-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Keranjang kosong</p>
              </div>
            ) : (
              cart.map(item => {
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
                      <button onClick={() => updateQty(item.kd_barang, -1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-primary-100 transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.kd_barang, 1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-primary-100 transition-colors">
                        <Plus size={10} />
                      </button>
                      <button onClick={() => removeItem(item.kd_barang)} className="w-6 h-6 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 flex items-center justify-center transition-colors ml-1">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Payment Panel */}
        <Card>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-800 dark:text-white">{formatRupiah(subTotal)}</span>
            </div>

            {/* Payment method */}
            <div className="flex gap-2">
              {(['TUNAI', 'TRANSFER'] as const).map(j => (
                <button
                  key={j}
                  onClick={() => setJenisBayar(j)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all
                    ${jenisBayar === j ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary-300'}`}
                >
                  {j === 'TUNAI' ? <Banknote size={14} /> : <CreditCard size={14} />}
                  {j}
                </button>
              ))}
            </div>

            <Input
              label="Jumlah Bayar"
              type="number"
              value={bayar}
              onChange={e => setBayar(e.target.value)}
              placeholder="0"
            />

            {parseFloat(bayar) > 0 && (
              <div className={`flex justify-between text-sm font-semibold ${kembalian >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <span>Kembalian</span>
                <span>{formatRupiah(kembalian)}</span>
              </div>
            )}

            <Button
              className="w-full"
              loading={loading}
              disabled={!cart.length || !bayar}
              onClick={handleBayar}
              icon={<ShoppingCart size={16} />}
            >
              Bayar
            </Button>
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
          <Struk cart={cart} subTotal={subTotal} bayar={parseFloat(bayar)} kembalian={kembalian} kdTransaksi={lastKd ?? ''} jenisBayar={jenisBayar} />
        </div>
      </Modal>
    </div>
  )
}
