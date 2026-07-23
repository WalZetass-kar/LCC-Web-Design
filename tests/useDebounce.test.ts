import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebouncedCallback } from '../src/renderer/hooks/useDebounce'

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('debounces value changes', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'updated', delay: 500 })
    
    // Should still be old value before delay
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now should be updated
    expect(result.current).toBe('updated')

    vi.useRealTimers()
  })

  it('resets timer on rapid changes', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    )

    // Rapid changes
    rerender({ value: 'b', delay: 500 })
    act(() => { vi.advanceTimersByTime(200) })
    
    rerender({ value: 'c', delay: 500 })
    act(() => { vi.advanceTimersByTime(200) })
    
    rerender({ value: 'd', delay: 500 })
    
    // Should still be initial
    expect(result.current).toBe('a')

    // Wait for full delay
    act(() => { vi.advanceTimersByTime(500) })
    
    // Should be final value
    expect(result.current).toBe('d')

    vi.useRealTimers()
  })
})

describe('useDebouncedCallback', () => {
  it('returns a function', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))
    expect(typeof result.current).toBe('function')
  })

  it('debounces callback execution', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    // Call multiple times rapidly
    act(() => {
      result.current('arg1')
      result.current('arg2')
      result.current('arg3')
    })

    // Should not be called yet
    expect(callback).not.toHaveBeenCalled()

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should be called once with last arguments
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg3')

    vi.useRealTimers()
  })

  it('cancels previous calls', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('first')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    act(() => {
      result.current('second')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should only be called with 'second'
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')

    vi.useRealTimers()
  })

  it('uses latest callback', async () => {
    vi.useFakeTimers()
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    
    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 500),
      { initialProps: { callback: callback1 } }
    )

    act(() => {
      result.current('test')
    })

    // Change callback
    rerender({ callback: callback2 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should call the new callback
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('test')

    vi.useRealTimers()
  })
})
