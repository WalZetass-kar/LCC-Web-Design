// @ts-ignore - midtrans-client doesn't have types
import midtransClient from 'midtrans-client'

interface PaymentRequest {
  orderId: string
  amount: number
  customerName: string
  customerEmail?: string
  customerPhone?: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

export class MidtransService {
  private static snap: any = null
  private static core: any = null

  /**
   * Initialize Midtrans client
   */
  static init(serverKey: string, clientKey: string, isProduction: boolean = false) {
    this.snap = new midtransClient.Snap({
      isProduction,
      serverKey,
      clientKey,
    })

    this.core = new midtransClient.CoreApi({
      isProduction,
      serverKey,
      clientKey,
    })
  }

  /**
   * Create payment transaction
   */
  static async createTransaction(request: PaymentRequest) {
    try {
      if (!this.snap) {
        return { success: false, message: 'Midtrans not initialized. Please configure payment gateway in settings.' }
      }

      const parameter = {
        transaction_details: {
          order_id: request.orderId,
          gross_amount: request.amount,
        },
        customer_details: {
          first_name: request.customerName,
          email: request.customerEmail || 'customer@example.com',
          phone: request.customerPhone || '08123456789',
        },
        item_details: request.items.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          name: item.name,
        })),
      }

      const transaction = await this.snap.createTransaction(parameter)
      
      return {
        success: true,
        data: {
          token: transaction.token,
          redirectUrl: transaction.redirect_url,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create payment transaction',
      }
    }
  }

  /**
   * Check transaction status
   */
  static async checkStatus(orderId: string) {
    try {
      if (!this.core) {
        return { success: false, message: 'Midtrans not initialized' }
      }

      const status = await this.core.transaction.status(orderId)
      
      return {
        success: true,
        data: {
          orderId: status.order_id,
          transactionStatus: status.transaction_status,
          fraudStatus: status.fraud_status,
          paymentType: status.payment_type,
          grossAmount: status.gross_amount,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to check transaction status',
      }
    }
  }

  /**
   * Cancel transaction
   */
  static async cancelTransaction(orderId: string) {
    try {
      if (!this.core) {
        return { success: false, message: 'Midtrans not initialized' }
      }

      await this.core.transaction.cancel(orderId)
      
      return { success: true, message: 'Transaction cancelled' }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to cancel transaction',
      }
    }
  }

  /**
   * Generate QRIS
   */
  static async generateQRIS(request: PaymentRequest) {
    try {
      if (!this.core) {
        return { success: false, message: 'Midtrans not initialized' }
      }

      const itemDetails = request.items.map(item => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      }))
      const itemTotal = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0)
      if (itemTotal !== request.amount) {
        itemDetails.push({
          id: 'ADJUSTMENT',
          price: request.amount - itemTotal,
          quantity: 1,
          name: 'Penyesuaian total',
        })
      }

      const parameter = {
        payment_type: 'qris',
        transaction_details: {
          order_id: request.orderId,
          gross_amount: request.amount,
        },
        customer_details: {
          first_name: request.customerName,
          email: request.customerEmail || 'customer@example.com',
          phone: request.customerPhone || '08123456789',
        },
        item_details: itemDetails,
      }

      const charge = await this.core.charge(parameter)
      const qrAction = charge.actions?.find((action: any) => action.name === 'generate-qr-code')
      
      return {
        success: true,
        data: {
          orderId: charge.order_id,
          qrImageUrl: qrAction?.url || charge.actions?.[0]?.url,
          qrString: charge.qr_string,
          transactionId: charge.transaction_id,
          transactionStatus: charge.transaction_status,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to generate QRIS',
      }
    }
  }
}
