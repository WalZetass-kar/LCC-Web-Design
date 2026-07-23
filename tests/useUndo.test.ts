import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndo } from '../src/renderer/hooks/useUndo'

// Mock ToastContext
const mockToast = vi.fn()
vi.mock('../src/renderer/contexts/ToastContext', () => ({
  useToast: () => mockToast,
}))

describe('useUndo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockToast.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns showUndo function', () => {
    const { result } = renderHook(() => useUndo())
    expect(typeof result.current.showUndo).toBe('function')
  })

  it('shows toast when undo is triggered', () => {
    const { result } = renderHook(() => useUndo())

    const undoFn = vi.fn()
    
    act(() => {
      result.current.showUndo('Item dihapus', undoFn)
    })

    expect(mockToast).toHaveBeenCalledWith(
      'Item dihapus — tekan Ctrl+Z untuk undo',
      'success'
    )
  })

  it('executes undo function on Ctrl+Z', async () => {
    const { result } = renderHook(() => useUndo())

    const undoFn = vi.fn()
    
    act(() => {
      result.current.showUndo('Item dihapus', undoFn)
    })

    // Simulate Ctrl+Z
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith('Undo berhasil', 'success')
  })

  it('executes undo function on Meta+Z (Mac)', async () => {
    const { result } = renderHook(() => useUndo())

    const undoFn = vi.fn()
    
    act(() => {
      result.current.showUndo('Item dihapus', undoFn)
    })

    // Simulate Meta+Z (Mac)
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn).toHaveBeenCalledTimes(1)
  })

  it('does not execute undo on regular Z key', async () => {
    const { result } = renderHook(() => useUndo())

    const undoFn = vi.fn()
    
    act(() => {
      result.current.showUndo('Item dihapus', undoFn)
    })

    // Simulate regular Z key (no Ctrl/Meta)
    const event = new KeyboardEvent('keydown', {
      key: 'z',
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn).not.toHaveBeenCalled()
  })

  it('handles async undo functions', async () => {
    const { result } = renderHook(() => useUndo())

    const asyncUndoFn = vi.fn().mockResolvedValue(undefined)
    
    act(() => {
      result.current.showUndo('Item dihapus', asyncUndoFn)
    })

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(asyncUndoFn).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith('Undo berhasil', 'success')
  })

  it('shows error toast when undo fails', async () => {
    const { result } = renderHook(() => useUndo())

    const failingUndoFn = vi.fn().mockRejectedValue(new Error('Undo failed'))
    
    act(() => {
      result.current.showUndo('Item dihapus', failingUndoFn)
    })

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(failingUndoFn).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith('Undo gagal', 'error')
  })

  it('removes undo action after timeout', async () => {
    const { result } = renderHook(() => useUndo())

    const undoFn = vi.fn()
    
    act(() => {
      result.current.showUndo('Item dihapus', undoFn, 3000) // 3 second timeout
    })

    // Wait for timeout
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // Try to undo after timeout
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    // Should not be called because it expired
    expect(undoFn).not.toHaveBeenCalled()
  })

  it('cancels timeout when undo is triggered', async () => {
    const { result } = renderHook(() => useUndo())

    const undoFn = vi.fn()
    
    act(() => {
      result.current.showUndo('Item dihapus', undoFn, 5000)
    })

    // Trigger undo before timeout
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn).toHaveBeenCalledTimes(1)

    // Advance time past timeout
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Should still only be called once
    expect(undoFn).toHaveBeenCalledTimes(1)
  })

  it('handles multiple undo actions (LIFO)', async () => {
    const { result } = renderHook(() => useUndo())

    const undoFn1 = vi.fn()
    const undoFn2 = vi.fn()
    const undoFn3 = vi.fn()
    
    act(() => {
      result.current.showUndo('Action 1', undoFn1)
      result.current.showUndo('Action 2', undoFn2)
      result.current.showUndo('Action 3', undoFn3)
    })

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    // First Ctrl+Z should trigger last action (LIFO)
    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn3).toHaveBeenCalledTimes(1)
    expect(undoFn2).not.toHaveBeenCalled()
    expect(undoFn1).not.toHaveBeenCalled()

    // Second Ctrl+Z should trigger second-to-last action
    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn2).toHaveBeenCalledTimes(1)
    expect(undoFn1).not.toHaveBeenCalled()

    // Third Ctrl+Z should trigger first action
    await act(async () => {
      window.dispatchEvent(event)
    })

    expect(undoFn1).toHaveBeenCalledTimes(1)
  })

  it('does nothing when no undo actions available', async () => {
    const { result } = renderHook(() => useUndo())

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    })

    await act(async () => {
      window.dispatchEvent(event)
    })

    // Should not throw or call toast
    expect(mockToast).not.toHaveBeenCalled()
  })
})
