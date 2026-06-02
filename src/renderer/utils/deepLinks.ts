import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

const ALLOWED_ROUTES = new Set([
  '/',
  '/app',
  '/developer',
  '/license',
  '/login',
  '/assistant',
  '/produk',
  '/kategori',
  '/satuan',
  '/transaksi',
  '/riwayat',
  '/supplier',
  '/customer',
  '/kas',
  '/laporan',
  '/pembelian',
  '/users',
  '/backup',
  '/activity-log',
  '/returns',
  '/shifts',
  '/debts',
  '/stock-opname',
  '/subscription-plans',
  '/tutorials',
  '/hpp',
  '/promo',
  '/branch',
  '/security',
  '/loyalty',
  '/whatsapp',
  '/print-queue',
  '/ecommerce-api',
  '/payment',
  '/license-admin',
  '/settings',
  ...[
    'assistant',
    'produk',
    'kategori',
    'satuan',
    'transaksi',
    'riwayat',
    'supplier',
    'customer',
    'kas',
    'laporan',
    'pembelian',
    'users',
    'backup',
    'activity-log',
    'returns',
    'shifts',
    'debts',
    'stock-opname',
    'subscription-plans',
    'tutorials',
    'hpp',
    'promo',
    'branch',
    'security',
    'loyalty',
    'whatsapp',
    'print-queue',
    'ecommerce-api',
    'payment',
    'settings',
  ].map(route => `/app/${route}`),
])

function routeFromParts(pathname: string, search: string, hash: string) {
  if (hash.startsWith('#/')) return `${hash.slice(1)}${search}`
  return `${pathname || '/'}${search}`
}

export function normalizeDeepLink(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    const scheme = parsed.protocol.replace(':', '').toLowerCase()
    let route = ''

    if (scheme === 'mediasoftposzetass') {
      const host = parsed.hostname ? `/${parsed.hostname}` : ''
      route = routeFromParts(`${host}${parsed.pathname}`.replace(/\/+/g, '/'), parsed.search, parsed.hash)
    } else if (parsed.hash.startsWith('#/')) {
      route = routeFromParts(parsed.pathname, parsed.search, parsed.hash)
    } else {
      route = routeFromParts(parsed.pathname, parsed.search, parsed.hash)
    }

    if (!route.startsWith('/')) route = `/${route}`
    const baseRoute = route.split(/[?#]/)[0] || '/'
    if (!ALLOWED_ROUTES.has(baseRoute)) return null
    return route
  } catch {
    return null
  }
}

export function registerDeepLinkHandlers(navigate: (route: string) => void) {
  const cleanup: Array<() => void> = []

  const openRoute = (url: string) => {
    const route = normalizeDeepLink(url)
    if (route) navigate(route)
  }

  const electronCleanup = window.api?.onDeepLink?.(openRoute)
  if (electronCleanup) cleanup.push(electronCleanup)

  if (Capacitor.isNativePlatform()) {
    void CapacitorApp.getLaunchUrl()
      .then(result => {
        if (result?.url) openRoute(result.url)
      })
      .catch(() => {})

    let removeNativeListener: (() => void) | null = null
    void CapacitorApp.addListener('appUrlOpen', event => {
      if (event.url) openRoute(event.url)
    })
      .then(handle => {
        removeNativeListener = () => {
          void handle.remove()
        }
      })
      .catch(() => {})

    cleanup.push(() => removeNativeListener?.())
  }

  return () => cleanup.forEach(remove => remove())
}
