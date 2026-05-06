import { forwardRef, useEffect, useState } from 'react'
import { formatRupiah } from '../utils/format'
import { api } from '../utils/api'
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
  kasirName?: string
}

interface StrukSettings {
  show_logo: boolean
  show_alamat: boolean
  show_telepon: boolean
  show_email: boolean
  show_kasir: boolean
  show_customer: boolean
  footer_text: string
  qris_image: string | null
  qris_enabled: boolean
}

interface Identitas {
  nama_toko?: string
  alamat_toko?: string
  no_telp_toko?: string
  email_toko?: string
}

const Struk = forwardRef<HTMLDivElement, StrukProps>(
  ({ cart, subTotal, pajak = 0, pajakPersen = 0, totalBayar, bayar, kembalian, kdTransaksi, jenisBayar, customerName, poinEarned, kasirName }, ref) => {
    const now = new Date().toLocaleString('id-ID')
    const total = totalBayar ?? subTotal

    const [settings, setSettings] = useState<StrukSettings>({
      show_logo: true,
      show_alamat: true,
      show_telepon: true,
      show_email: true,
      show_kasir: true,
      show_customer: true,
      footer_text: 'Terima kasih atas kunjungan Anda!',
      qris_image: null,
      qris_enabled: false,
    })

    const [identitas, setIdentitas] = useState<Identitas>({})

    useEffect(() => {
      // Load settings
      api<any>('strukSettings:get').then(r => {
        if (r.success && r.data) {
          setSettings({
            show_logo: Boolean(r.data.show_logo),
            show_alamat: Boolean(r.data.show_alamat),
            show_telepon: Boolean(r.data.show_telepon),
            show_email: Boolean(r.data.show_email),
            show_kasir: Boolean(r.data.show_kasir),
            show_customer: Boolean(r.data.show_customer),
            footer_text: r.data.footer_text || 'Terima kasih atas kunjungan Anda!',
            qris_image: r.data.qris_image || null,
            qris_enabled: Boolean(r.data.qris_enabled),
          })
        }
      })

      // Load identitas
      api<Identitas>('identitas:get').then(r => {
        if (r.success && r.data) {
          setIdentitas(r.data)
        }
      })
    }, [])

    return (
      <div ref={ref} className="font-mono text-xs text-slate-800 p-4 bg-white print:p-0 print:text-black" style={{ width: 280 }}>
        <div className="text-center mb-3">
          <p className="font-bold text-sm">{identitas.nama_toko || 'MediaSoft POS'}</p>
          {settings.show_alamat && identitas.alamat_toko && (
            <p className="text-slate-500 text-xs">{identitas.alamat_toko}</p>
          )}
          {settings.show_telepon && identitas.no_telp_toko && (
            <p className="text-slate-500 text-xs">Telp: {identitas.no_telp_toko}</p>
          )}
          {settings.show_email && identitas.email_toko && (
            <p className="text-slate-500 text-xs">{identitas.email_toko}</p>
          )}
          <p className="text-slate-400 text-xs mt-1">{now}</p>
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        <p className="text-xs text-slate-500 mb-1">No: {kdTransaksi}</p>
        {settings.show_kasir && kasirName && <p className="text-xs text-slate-500 mb-1">Kasir: {kasirName}</p>}
        {settings.show_customer && customerName && <p className="text-xs text-slate-500 mb-2">Customer: {customerName}</p>}

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
        
        {/* Footer Text */}
        <p className="text-center text-slate-400 text-xs">{settings.footer_text}</p>

        {/* QRIS */}
        {settings.qris_enabled && settings.qris_image && (
          <div className="mt-3 text-center">
            <p className="text-xs text-slate-500 mb-2">Scan untuk pembayaran QRIS:</p>
            <img 
              src={settings.qris_image} 
              alt="QRIS" 
              className="w-32 h-32 mx-auto object-contain"
            />
          </div>
        )}
      </div>
    )
  }
)

Struk.displayName = 'Struk'
export default Struk
