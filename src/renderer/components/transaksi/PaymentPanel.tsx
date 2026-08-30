import React from 'react'
import { Tag, X, Banknote, CreditCard, QrCode, AlertCircle, CheckCircle2, ShoppingCart } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import QuickAmountButtons from '../../components/QuickAmountButtons'
import { formatRupiah } from '../../utils/format'
import { CartItem } from '../../../shared/types'

interface PaymentPanelProps {
  cart: CartItem[]
  subTotal: number
  promoCode: string
  promoDiskon: number
  promoMsg: string
  promoLoading: boolean
  pajakPersen: number
  pajakAmount: number
  totalBayar: number
  jenisBayar: 'TUNAI' | 'TRANSFER' | 'QRIS'
  bayar: string
  bayarInputRef: React.RefObject<HTMLInputElement>
  paidAmount: number
  kembalian: number
  qrisCanPay: boolean
  loading: boolean
  onChangePromoCode: (code: string) => void
  onApplyPromo: () => void
  onRemovePromo: () => void
  onChangeBayar: (val: string) => void
  onChangeJenisBayar: (jenis: 'TUNAI' | 'TRANSFER' | 'QRIS') => void
  onHandleBayar: () => void
}

export default function PaymentPanel({
  cart, subTotal, promoCode, promoDiskon, promoMsg, promoLoading, pajakPersen, pajakAmount, totalBayar,
  jenisBayar, bayar, bayarInputRef, paidAmount, kembalian, qrisCanPay, loading,
  onChangePromoCode, onApplyPromo, onRemovePromo, onChangeBayar, onChangeJenisBayar, onHandleBayar
}: PaymentPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-slate-500">Subtotal Belanja</span>
        <span className="text-slate-900 dark:text-white font-bold">{formatRupiah(subTotal)}</span>
      </div>

      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={promoCode}
            onChange={e => onChangePromoCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && onApplyPromo()}
            placeholder="Kode Promo"
            disabled={promoDiskon > 0}
            className="w-full h-9 pl-8 pr-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60 focus:outline-none focus:border-red-600"
          />
        </div>
        {promoDiskon > 0 ? (
          <button
            type="button"
            onClick={onRemovePromo}
            className="px-3 h-9 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onApplyPromo}
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

      <div className="flex justify-between text-base font-black border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <span className="text-slate-900 dark:text-white">TOTAL BAYAR</span>
        <span className="text-red-600 dark:text-red-400">{formatRupiah(totalBayar)}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {(['TUNAI', 'TRANSFER', 'QRIS'] as const).map(j => (
          <button
            key={j}
            type="button"
            onClick={() => onChangeJenisBayar(j)}
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

      {jenisBayar === 'TUNAI' && (
        <QuickAmountButtons total={totalBayar} onAmount={amount => onChangeBayar(String(amount))} />
      )}

      <Input
        ref={bayarInputRef}
        label="Jumlah Diterima (Rp)"
        type="number"
        value={jenisBayar === 'QRIS' ? String(totalBayar) : bayar}
        onChange={e => {
          if (jenisBayar !== 'QRIS') onChangeBayar(e.target.value)
        }}
        placeholder="0"
        disabled={jenisBayar === 'QRIS'}
        helperText={jenisBayar === 'QRIS' ? 'Nominal QRIS otomatis mengikuti total transaksi.' : undefined}
      />

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

      <Button
        className="w-full h-13 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/20 border-0 active:scale-[0.98] transition-all disabled:opacity-50"
        loading={loading}
        disabled={loading || (jenisBayar === 'QRIS' ? !qrisCanPay : (!cart.length || !bayar || (jenisBayar === 'TUNAI' && kembalian < 0)))}
        onClick={onHandleBayar}
        icon={jenisBayar === 'QRIS' ? <QrCode size={18} /> : <ShoppingCart size={18} />}
      >
        {jenisBayar === 'QRIS' ? 'BAYAR DENGAN QRIS' : 'PROSES PEMBAYARAN'}
      </Button>
    </div>
  )
}
