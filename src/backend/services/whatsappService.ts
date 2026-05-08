import https from 'https'

interface WhatsAppMessage {
  to: string // Phone number with country code (e.g., 628123456789)
  message: string
}

export class WhatsAppService {
  private static apiKey: string = ''
  private static apiUrl: string = 'https://api.fonnte.com/send'

  /**
   * Initialize WhatsApp service
   */
  static init(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Send WhatsApp message
   */
  static async sendMessage(data: WhatsAppMessage): Promise<{ success: boolean; message?: string }> {
    if (!this.apiKey) {
      return { success: false, message: 'WhatsApp API key not configured' }
    }

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        target: data.to,
        message: data.message,
      })

      const options = {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }

      const req = https.request(this.apiUrl, options, (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          try {
            const response = JSON.parse(body)
            if (response.status) {
              resolve({ success: true })
            } else {
              resolve({ success: false, message: response.reason || 'Failed to send message' })
            }
          } catch (error) {
            resolve({ success: false, message: 'Invalid response from WhatsApp API' })
          }
        })
      })

      req.on('error', (error) => {
        resolve({ success: false, message: error.message })
      })

      req.write(postData)
      req.end()
    })
  }

  /**
   * Send transaction receipt
   */
  static async sendReceipt(phone: string, data: {
    storeName: string
    transactionId: string
    date: string
    items: Array<{ name: string; qty: number; price: number }>
    total: number
    payment: string
  }) {
    const itemsList = data.items.map(item => 
      `• ${item.name} (${item.qty}x) - Rp ${item.price.toLocaleString()}`
    ).join('\n')

    const message = `
*${data.storeName}*
Struk Pembelian

No. Transaksi: ${data.transactionId}
Tanggal: ${data.date}

*Daftar Belanja:*
${itemsList}

*Total: Rp ${data.total.toLocaleString()}*
Pembayaran: ${data.payment}

Terima kasih atas kunjungan Anda! 🙏
    `.trim()

    return this.sendMessage({ to: phone, message })
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(phone: string, products: Array<{ name: string; stock: number }>) {
    const productList = products.map(p => `• ${p.name} (Stok: ${p.stock})`).join('\n')
    
    const message = `
⚠️ *PERINGATAN STOK MENIPIS*

Produk berikut memerlukan restock:
${productList}

Segera lakukan pemesanan untuk menghindari kehabisan stok.
    `.trim()

    return this.sendMessage({ to: phone, message })
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(phone: string, data: {
    customerName: string
    amount: number
    dueDate: string
    invoiceNumber: string
  }) {
    const message = `
Halo ${data.customerName},

Ini adalah pengingat pembayaran untuk:
Invoice: ${data.invoiceNumber}
Jumlah: Rp ${data.amount.toLocaleString()}
Jatuh Tempo: ${data.dueDate}

Mohon segera melakukan pembayaran. Terima kasih! 🙏
    `.trim()

    return this.sendMessage({ to: phone, message })
  }

  /**
   * Send promo notification
   */
  static async sendPromo(phone: string, data: {
    customerName: string
    promoTitle: string
    promoDescription: string
    validUntil: string
  }) {
    const message = `
🎉 *PROMO SPESIAL* 🎉

Halo ${data.customerName}!

${data.promoTitle}
${data.promoDescription}

Berlaku hingga: ${data.validUntil}

Jangan lewatkan kesempatan ini! 🛍️
    `.trim()

    return this.sendMessage({ to: phone, message })
  }
}
