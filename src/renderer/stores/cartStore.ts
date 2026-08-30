import { create } from 'zustand'
import type { CartItem, Customer } from '../../shared/types'

interface CartStore {
  cart: CartItem[]
  selectedCustomer: Customer | null
  jenisBayar: 'TUNAI' | 'TRANSFER' | 'QRIS'
  bayar: string
  promoCode: string
  promoDiskon: number
  promoMsg: string
  
  addToCart: (item: CartItem) => void
  removeFromCart: (kdBarang: string) => void
  updateQty: (kdBarang: string, qty: number) => void
  clearCart: () => void
  setSelectedCustomer: (customer: Customer | null) => void
  setJenisBayar: (jenis: 'TUNAI' | 'TRANSFER' | 'QRIS') => void
  setBayar: (bayar: string) => void
  setPromo: (code: string, diskon: number, msg: string) => void
  clearPromo: () => void
}

export const useCartStore = create<CartStore>()((set) => ({
  cart: [],
  selectedCustomer: null,
  jenisBayar: 'TUNAI',
  bayar: '',
  promoCode: '',
  promoDiskon: 0,
  promoMsg: '',

  addToCart: (newItem) =>
    set((state) => {
      const existing = state.cart.find((i) => i.kd_barang === newItem.kd_barang)
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.kd_barang === newItem.kd_barang ? { ...i, qty: i.qty + 1 } : i
          ),
        }
      }
      return { cart: [...state.cart, newItem] }
    }),

  removeFromCart: (kdBarang) =>
    set((state) => ({ cart: state.cart.filter((i) => i.kd_barang !== kdBarang) })),

  updateQty: (kdBarang, qty) =>
    set((state) => ({
      cart:
        qty <= 0
          ? state.cart.filter((i) => i.kd_barang !== kdBarang)
          : state.cart.map((i) => (i.kd_barang === kdBarang ? { ...i, qty } : i)),
    })),

  clearCart: () => set({ cart: [], bayar: '', promoCode: '', promoDiskon: 0, promoMsg: '' }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  setJenisBayar: (jenis) => set({ jenisBayar: jenis }),
  setBayar: (bayar) => set({ bayar }),
  setPromo: (code, diskon, msg) => set({ promoCode: code, promoDiskon: diskon, promoMsg: msg }),
  clearPromo: () => set({ promoCode: '', promoDiskon: 0, promoMsg: '' }),
}))
