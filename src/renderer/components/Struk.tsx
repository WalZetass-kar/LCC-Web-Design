import { forwardRef } from 'react'
import { formatRupiah } from '../utils/format'
import type { CartItem } from '../../shared/types'

interface StrukProps {
  cart: CartItem[]
  subTotal: number
  pajak?: number
  pajakPersen?: number
  totalBayar?: number
  bayar: number
  kembalian: number
  kdTransaksi: string
  jenisBayar: string
  customerName?: string
  poinEarned?: number
}

const Struk = forwardRef<HTMLDivElement, StrukProps>(
  ({ cart, subTotal, pajak = 0, pajakPersen = 0, totalBayar, bayar, kembalian, kdTransaksi, jenisBayar, customerName, poinEarned }, ref) => {
    const now = new Date().toLocaleString('id-ID')
    const total = totalBayar ?? subTotal

    return (
      <div ref={ref} className="font-mono text-xs text-slate-800 p-4 bg-white print:p-0 print:text-black" style={{ width: 280 }}>
        <div className="text-center mb-3">
          <p className="font-bold text-sm">MediaSoft POS Ihwal</p>
          <p className="text-slate-500">Struk Pembelian</p>
          <p className="text-slate-400 text-xs">{now}</p>
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        <p className="text-xs text-slate-500 mb-2">No: {kdTransaksi}</p>
        {customerName && <p className="text-xs text-slate-500 mb-2">Customer: {customerName}</p>}

        <div className="space-y-1 mb-3">
          {cart.map(item => {
            const disc = (item.harga_jual * item.disc) / 100
            const itemTotal = (item.harga_jual - disc) * item.qty
            return (
              <div key={item.kd_barang}>
                <p className="truncate">{item.nama_barang}</p>
                <div className="flex justify-between text-slate-500">
                  <span>{item.qty} x {formatRupiah(item.harga_jual)}{item.disc > 0 ? ` (-${item.disc}%)` : ''}</span>
                  <span>{formatRupiah(itemTotal)}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        <div className="space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatRupiah(subTotal)}</span>
          </div>
          {pajakPersen > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>PPN {pajakPersen}%</span>
              <span>{formatRupiah(pajak)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Bayar ({jenisBayar})</span>
            <span>{formatRupiah(bayar)}</span>
          </div>
          <div className="flex justify-between font-bold text-emerald-700">
            <span>Kembalian</span>
            <span>{formatRupiah(kembalian)}</span>
          </div>
          {poinEarned && poinEarned > 0 && (
            <div className="flex justify-between text-amber-600 font-medium">
              <span>Poin Didapat</span>
              <span>+{poinEarned} poin</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-slate-300 my-3" />
        <p className="text-center text-slate-400">Terima kasih atas kunjungan Anda!</p>
      </div>
    )
  }
)

Struk.displayName = 'Struk'
export default Struk
