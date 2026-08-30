import { describe, it, expect } from 'vitest'

function calcSubTotal(cart: Array<{ harga_jual: number; disc: number; qty: number }>): number {
  return cart.reduce((sum, c) => {
    const disc = (c.harga_jual * c.disc) / 100
    return sum + (c.harga_jual - disc) * c.qty
  }, 0)
}

function calcPajakAmount(subTotal: number, pajakPersen: number): number {
  return Math.round(subTotal * pajakPersen / 100)
}

function calcTotalBayar(subTotal: number, pajakAmount: number, promoDiskon: number): number {
  return Math.max(0, subTotal + pajakAmount - promoDiskon)
}

function calcKembalian(paidAmount: number, totalBayar: number): number {
  return paidAmount - totalBayar
}

describe('Cart Calculations', () => {
  describe('calcSubTotal', () => {
    it('hitung subtotal tanpa diskon', () => {
      const cart = [{ harga_jual: 10000, disc: 0, qty: 2 }]
      expect(calcSubTotal(cart)).toBe(20000)
    })
    it('hitung subtotal dengan diskon 10%', () => {
      const cart = [{ harga_jual: 10000, disc: 10, qty: 1 }]
      expect(calcSubTotal(cart)).toBe(9000)
    })
    it('hitung subtotal multiple items', () => {
      const cart = [
        { harga_jual: 10000, disc: 0, qty: 2 },
        { harga_jual: 5000, disc: 20, qty: 3 },
      ]
      expect(calcSubTotal(cart)).toBe(32000)
    })
    it('cart kosong menghasilkan 0', () => {
      expect(calcSubTotal([])).toBe(0)
    })
  })

  describe('calcPajakAmount', () => {
    it('PPN 11% dari 100000', () => {
      expect(calcPajakAmount(100000, 11)).toBe(11000)
    })
    it('tanpa pajak menghasilkan 0', () => {
      expect(calcPajakAmount(100000, 0)).toBe(0)
    })
  })

  describe('calcTotalBayar', () => {
    it('total = subtotal + pajak - promo', () => {
      expect(calcTotalBayar(100000, 11000, 5000)).toBe(106000)
    })
    it('total tidak boleh negatif', () => {
      expect(calcTotalBayar(1000, 0, 99999)).toBe(0)
    })
  })

  describe('calcKembalian', () => {
    it('kembalian positif', () => {
      expect(calcKembalian(150000, 100000)).toBe(50000)
    })
    it('kembalian negatif jika kurang bayar', () => {
      expect(calcKembalian(50000, 100000)).toBe(-50000)
    })
  })
})
