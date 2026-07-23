import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHoldCart } from '../src/renderer/hooks/useHoldCart'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useHoldCart', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('initializes with empty array', () => {
    const { result } = renderHook(() => useHoldCart())
    expect(result.current.heldCarts).toEqual([])
    expect(result.current.maxHeld).toBe(10)
  })

  it('loads existing carts from localStorage', () => {
    const existingCarts = [
      {
        id: 'hold_123',
        items: [{ kd_barang: 'P001', nama_barang: 'Test', qty: 1, harga_jual: 10000, disc: 0 }],
        note: 'Test note',
        heldAt: '2024-01-01T00:00:00.000Z',
        total: 10000,
      },
    ]
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existingCarts))

    const { result } = renderHook(() => useHoldCart())
    expect(result.current.heldCarts).toEqual(existingCarts)
  })

  it('holds a cart successfully', () => {
    const { result } = renderHook(() => useHoldCart())

    const items = [
      { kd_barang: 'P001', nama_barang: 'Product 1', qty: 2, harga_jual: 10000, disc: 10 },
      { kd_barang: 'P002', nama_barang: 'Product 2', qty: 1, harga_jual: 20000, disc: 0 },
    ]

    let success: boolean = false
    act(() => {
      success = result.current.holdCart(items, { nama_customer: 'John', kd_customer: 'C001' }, 'Customer waiting')
    })

    expect(success).toBe(true)
    expect(result.current.heldCarts).toHaveLength(1)
    expect(result.current.heldCarts[0].items).toEqual(items)
    expect(result.current.heldCarts[0].customerName).toBe('John')
    expect(result.current.heldCarts[0].note).toBe('Customer waiting')
    // Total: (10000 - 1000) * 2 + 20000 = 18000 + 20000 = 38000
    expect(result.current.heldCarts[0].total).toBe(38000)
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('rejects holding empty cart', () => {
    const { result } = renderHook(() => useHoldCart())

    let success: boolean = true
    act(() => {
      success = result.current.holdCart([])
    })

    expect(success).toBe(false)
    expect(result.current.heldCarts).toHaveLength(0)
  })

  it('rejects holding when max limit reached', () => {
    const { result } = renderHook(() => useHoldCart())

    // Fill up to max (10 carts)
    const items = [{ kd_barang: 'P001', nama_barang: 'Test', qty: 1, harga_jual: 10000, disc: 0 }]
    
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.holdCart(items)
      }
    })

    expect(result.current.heldCarts).toHaveLength(10)

    // Try to add one more
    let success: boolean = true
    act(() => {
      success = result.current.holdCart(items)
    })

    expect(success).toBe(false)
    expect(result.current.heldCarts).toHaveLength(10)
  })

  it('resumes a cart', () => {
    const { result } = renderHook(() => useHoldCart())

    const items = [{ kd_barang: 'P001', nama_barang: 'Test', qty: 1, harga_jual: 10000, disc: 0 }]
    
    act(() => {
      result.current.holdCart(items)
    })

    const cartId = result.current.heldCarts[0].id

    let resumedCart: any = null
    act(() => {
      resumedCart = result.current.resumeCart(cartId)
    })

    expect(resumedCart).not.toBeNull()
    expect(resumedCart.items).toEqual(items)
    expect(result.current.heldCarts).toHaveLength(0)
  })

  it('returns null when resuming non-existent cart', () => {
    const { result } = renderHook(() => useHoldCart())

    let resumedCart: any = null
    act(() => {
      resumedCart = result.current.resumeCart('non-existent-id')
    })

    expect(resumedCart).toBeNull()
  })

  it('deletes a held cart', () => {
    const { result } = renderHook(() => useHoldCart())

    const items = [{ kd_barang: 'P001', nama_barang: 'Test', qty: 1, harga_jual: 10000, disc: 0 }]
    
    act(() => {
      result.current.holdCart(items)
    })

    const cartId = result.current.heldCarts[0].id

    act(() => {
      result.current.deleteHeld(cartId)
    })

    expect(result.current.heldCarts).toHaveLength(0)
  })

  it('clears all held carts', () => {
    const { result } = renderHook(() => useHoldCart())

    const items = [{ kd_barang: 'P001', nama_barang: 'Test', qty: 1, harga_jual: 10000, disc: 0 }]
    
    act(() => {
      result.current.holdCart(items)
      result.current.holdCart(items)
      result.current.holdCart(items)
    })

    expect(result.current.heldCarts).toHaveLength(3)

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.heldCarts).toHaveLength(0)
  })

  it('persists carts to localStorage', () => {
    const { result } = renderHook(() => useHoldCart())

    const items = [{ kd_barang: 'P001', nama_barang: 'Test', qty: 1, harga_jual: 10000, disc: 0 }]
    
    act(() => {
      result.current.holdCart(items)
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'zetass_pos_held_carts',
      expect.any(String)
    )

    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
    expect(savedData).toHaveLength(1)
    expect(savedData[0].items).toEqual(items)
  })
})
