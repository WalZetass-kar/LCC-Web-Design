import { useState, useCallback, useEffect, useRef } from 'react'
import type { CartItem, Customer } from '../../shared/types'

interface HeldCart {
  id: string
  items: CartItem[]
  customerName?: string
  customerKd?: string
  note: string
  heldAt: string
  total: number
}

const STORAGE_KEY = 'zetass_pos_held_carts'
const MAX_HELD = 10

function loadHeld(): HeldCart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHeld(carts: HeldCart[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(carts))
}

export function useHoldCart() {
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(loadHeld)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }
    saveHeld(heldCarts)
  }, [heldCarts])

  const holdCart = useCallback((
    items: CartItem[],
    customer?: { nama_customer?: string; kd_customer?: string } | null,
    note = ''
  ): boolean => {
    if (items.length === 0) return false
    if (heldCarts.length >= MAX_HELD) return false

    const total = items.reduce((sum, c) => {
      const disc = (c.harga_jual * c.disc) / 100
      return sum + (c.harga_jual - disc) * c.qty
    }, 0)

    const held: HeldCart = {
      id: `hold_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      items: items.map(item => ({ ...item })),
      customerName: customer?.nama_customer,
      customerKd: customer?.kd_customer,
      note,
      heldAt: new Date().toISOString(),
      total,
    }

    setHeldCarts(prev => [held, ...prev])
    return true
  }, [heldCarts.length])

  const resumeCart = useCallback((id: string): HeldCart | null => {
    const cart = heldCarts.find(c => c.id === id)
    if (!cart) return null
    setHeldCarts(prev => prev.filter(c => c.id !== id))
    return cart
  }, [heldCarts])

  const deleteHeld = useCallback((id: string) => {
    setHeldCarts(prev => prev.filter(c => c.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setHeldCarts([])
  }, [])

  return { heldCarts, holdCart, resumeCart, deleteHeld, clearAll, maxHeld: MAX_HELD }
}
