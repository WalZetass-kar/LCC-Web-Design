import { afterEach, vi } from 'vitest'

const win = globalThis.window as Window & typeof globalThis

if (typeof win !== 'undefined') {
  if (!win.matchMedia) {
    Object.defineProperty(win, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })
  }

  if (!win.requestAnimationFrame) {
    win.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      win.setTimeout(() => callback(performance.now()), 16)) as typeof window.requestAnimationFrame
  }

  if (!win.cancelAnimationFrame) {
    win.cancelAnimationFrame = ((handle: number) => win.clearTimeout(handle)) as typeof window.cancelAnimationFrame
  }

  if (!win.ResizeObserver) {
    win.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }

  if (!win.IntersectionObserver) {
    win.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return [] }
      root = null
      rootMargin = ''
      thresholds = []
    } as unknown as typeof IntersectionObserver
  }
}

afterEach(() => {
  vi.clearAllMocks()
})
