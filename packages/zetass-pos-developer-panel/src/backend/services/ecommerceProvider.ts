import { assertHttpsEndpoint } from '../../shared/endpointSecurity.js'

export interface EcommerceOrder {
  id: string | number
  status?: string
  total?: string | number
  date_created?: string
  billing?: Record<string, unknown>
  line_items?: Array<Record<string, unknown>>
}

export interface EcommerceProduct {
  id: string | number
  sku?: string
  name?: string
  price?: string | number
  regular_price?: string | number
  stock_quantity?: number | null
  manage_stock?: boolean
}

export interface EcommerceProvider {
  getOrders(): Promise<EcommerceOrder[]>
  getProducts(): Promise<EcommerceProduct[]>
  updateStock(productId: string | number, qty: number): Promise<void>
}

export interface WooCommerceConfig {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

const REQUEST_TIMEOUT_MS = 30000

export class WooCommerceProvider implements EcommerceProvider {
  private readonly baseUrl: string
  private readonly authHeader: string

  constructor(private readonly config: WooCommerceConfig) {
    const endpoint = assertHttpsEndpoint(config.storeUrl, 'URL toko WooCommerce')
    if (!endpoint.valid || !endpoint.url) {
      throw new Error(endpoint.message || 'URL toko WooCommerce tidak valid')
    }
    if (!config.consumerKey.trim() || !config.consumerSecret.trim()) {
      throw new Error('Consumer key dan consumer secret WooCommerce wajib diisi')
    }

    this.baseUrl = endpoint.url.replace(/\/+$/, '')
    this.authHeader = `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const url = `${this.baseUrl}/wp-json/wc/v3${path}`

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      })
      const data = await response.json().catch(() => null) as any
      if (!response.ok) {
        const message = data?.message || data?.data?.message || `WooCommerce HTTP ${response.status}`
        throw new Error(message)
      }
      return data as T
    } finally {
      clearTimeout(timeout)
    }
  }

  async getOrders(): Promise<EcommerceOrder[]> {
    return this.request<EcommerceOrder[]>('/orders?status=processing&per_page=20&orderby=date&order=desc')
  }

  async getProducts(): Promise<EcommerceProduct[]> {
    return this.request<EcommerceProduct[]>('/products?per_page=100&orderby=modified&order=desc')
  }

  async updateStock(productId: string | number, qty: number): Promise<void> {
    await this.request(`/products/${encodeURIComponent(String(productId))}`, {
      method: 'PUT',
      body: JSON.stringify({
        manage_stock: true,
        stock_quantity: Math.max(0, Math.round(Number(qty) || 0)),
      }),
    })
  }
}
