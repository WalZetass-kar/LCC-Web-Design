/**
 * Midtrans Payment Gateway Service
 * Handles all Midtrans API interactions
 */

// @ts-ignore - midtrans-client doesn't have official type definitions
import midtransClient from 'midtrans-client'
import crypto from 'crypto'

// Midtrans configuration
const config = {
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
}

// Initialize Snap API
const snap = new midtransClient.Snap({
  isProduction: config.isProduction,
  serverKey: config.serverKey,
  clientKey: config.clientKey,
})

// Initialize Core API (for direct charge, status check, etc)
const coreApi = new midtransClient.CoreApi({
  isProduction: config.isProduction,
  serverKey: config.serverKey,
  clientKey: config.clientKey,
})

export interface MidtransTransactionParams {
  orderId: string
  grossAmount: number
  customerDetails: {
    firstName: string
    lastName?: string
    email: string
    phone: string
  }
  itemDetails: Array<{
    id: string
    price: number
    quantity: number
    name: string
  }>
  enabledPayments?: string[]
  customExpiry?: {
    unit: 'minute' | 'hour' | 'day'
    duration: number
  }
}

export interface MidtransSnapResponse {
  token: string
  redirectUrl: string
}

export interface MidtransTransactionStatus {
  transactionId: string
  orderId: string
  grossAmount: string
  paymentType: string
  transactionTime: string
  transactionStatus: string
  fraudStatus?: string
  vaNumbers?: Array<{
    bank: string
    vaNumber: string
  }>
  billKey?: string
  billerCode?: string
  permataVaNumber?: string
  qrCodeUrl?: string
  deeplinkUrl?: string
}

class MidtransService {
  /**
   * Create Snap transaction token
   */
  async createSnapTransaction(params: MidtransTransactionParams): Promise<MidtransSnapResponse> {
    try {
      const parameter = {
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.grossAmount,
        },
        customer_details: {
          first_name: params.customerDetails.firstName,
          last_name: params.customerDetails.lastName || '',
          email: params.customerDetails.email,
          phone: params.customerDetails.phone,
        },
        item_details: params.itemDetails.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          name: item.name,
        })),
        enabled_payments: params.enabledPayments || [
          'credit_card',
          'bca_va',
          'bni_va',
          'bri_va',
          'permata_va',
          'other_va',
          'gopay',
          'shopeepay',
          'qris',
        ],
        ...(params.customExpiry && {
          custom_expiry: {
            expiry_duration: params.customExpiry.duration,
            unit: params.customExpiry.unit,
          },
        }),
      }

      const transaction = await snap.createTransaction(parameter)
      
      return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      }
    } catch (error: any) {
      console.error('Midtrans Snap Error:', error)
      throw new Error(`Failed to create Snap transaction: ${error.message}`)
    }
  }

  /**
   * Create QRIS transaction
   */
  async createQRISTransaction(params: MidtransTransactionParams): Promise<{
    transactionId: string
    qrCodeUrl: string
    expiryTime: string
  }> {
    try {
      const parameter = {
        payment_type: 'qris',
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.grossAmount,
        },
        customer_details: {
          first_name: params.customerDetails.firstName,
          last_name: params.customerDetails.lastName || '',
          email: params.customerDetails.email,
          phone: params.customerDetails.phone,
        },
        item_details: params.itemDetails,
        qris: {
          acquirer: 'gopay', // or 'airpay'
        },
      }

      const chargeResponse = await coreApi.charge(parameter)
      
      return {
        transactionId: chargeResponse.transaction_id,
        qrCodeUrl: chargeResponse.actions?.[0]?.url || '',
        expiryTime: chargeResponse.expiry_time,
      }
    } catch (error: any) {
      console.error('Midtrans QRIS Error:', error)
      throw new Error(`Failed to create QRIS transaction: ${error.message}`)
    }
  }

  /**
   * Create GoPay transaction
   */
  async createGoPayTransaction(params: MidtransTransactionParams): Promise<{
    transactionId: string
    deeplinkUrl: string
    qrCodeUrl: string
    expiryTime: string
  }> {
    try {
      const parameter = {
        payment_type: 'gopay',
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.grossAmount,
        },
        customer_details: {
          first_name: params.customerDetails.firstName,
          last_name: params.customerDetails.lastName || '',
          email: params.customerDetails.email,
          phone: params.customerDetails.phone,
        },
        item_details: params.itemDetails,
        gopay: {
          enable_callback: true,
          callback_url: `${process.env.API_BASE_URL}/payment/gopay/callback`,
        },
      }

      const chargeResponse = await coreApi.charge(parameter)
      
      return {
        transactionId: chargeResponse.transaction_id,
        deeplinkUrl: chargeResponse.actions?.[0]?.url || '',
        qrCodeUrl: chargeResponse.actions?.[1]?.url || '',
        expiryTime: chargeResponse.expiry_time,
      }
    } catch (error: any) {
      console.error('Midtrans GoPay Error:', error)
      throw new Error(`Failed to create GoPay transaction: ${error.message}`)
    }
  }

  /**
   * Create Virtual Account transaction
   */
  async createVATransaction(
    params: MidtransTransactionParams,
    bank: 'bca' | 'bni' | 'bri' | 'mandiri' | 'permata'
  ): Promise<{
    transactionId: string
    vaNumber: string
    bank: string
    expiryTime: string
  }> {
    try {
      const parameter = {
        payment_type: 'bank_transfer',
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.grossAmount,
        },
        customer_details: {
          first_name: params.customerDetails.firstName,
          last_name: params.customerDetails.lastName || '',
          email: params.customerDetails.email,
          phone: params.customerDetails.phone,
        },
        item_details: params.itemDetails,
        bank_transfer: {
          bank: bank,
        },
      }

      const chargeResponse = await coreApi.charge(parameter)
      
      let vaNumber = ''
      if (bank === 'permata') {
        vaNumber = chargeResponse.permata_va_number
      } else {
        vaNumber = chargeResponse.va_numbers?.[0]?.va_number || ''
      }

      return {
        transactionId: chargeResponse.transaction_id,
        vaNumber: vaNumber,
        bank: bank.toUpperCase(),
        expiryTime: chargeResponse.expiry_time || '',
      }
    } catch (error: any) {
      console.error('Midtrans VA Error:', error)
      throw new Error(`Failed to create VA transaction: ${error.message}`)
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(orderId: string): Promise<MidtransTransactionStatus> {
    try {
      const statusResponse = await coreApi.transaction.status(orderId)
      
      return {
        transactionId: statusResponse.transaction_id,
        orderId: statusResponse.order_id,
        grossAmount: statusResponse.gross_amount,
        paymentType: statusResponse.payment_type,
        transactionTime: statusResponse.transaction_time,
        transactionStatus: statusResponse.transaction_status,
        fraudStatus: statusResponse.fraud_status,
        vaNumbers: statusResponse.va_numbers,
        billKey: statusResponse.bill_key,
        billerCode: statusResponse.biller_code,
        permataVaNumber: statusResponse.permata_va_number,
        qrCodeUrl: statusResponse.actions?.[0]?.url,
        deeplinkUrl: statusResponse.actions?.[1]?.url,
      }
    } catch (error: any) {
      console.error('Midtrans Status Check Error:', error)
      throw new Error(`Failed to check transaction status: ${error.message}`)
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(orderId: string): Promise<boolean> {
    try {
      await coreApi.transaction.cancel(orderId)
      return true
    } catch (error: any) {
      console.error('Midtrans Cancel Error:', error)
      throw new Error(`Failed to cancel transaction: ${error.message}`)
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(orderId: string, amount?: number, reason?: string): Promise<{
    refundKey: string
    refundAmount: number
    refundStatus: string
  }> {
    try {
      const parameter: any = {}
      if (amount) {
        parameter.amount = amount
      }
      if (reason) {
        parameter.reason = reason
      }

      const refundResponse = await coreApi.transaction.refund(orderId, parameter)
      
      return {
        refundKey: refundResponse.refund_key,
        refundAmount: parseFloat(refundResponse.refund_amount),
        refundStatus: refundResponse.status_code,
      }
    } catch (error: any) {
      console.error('Midtrans Refund Error:', error)
      throw new Error(`Failed to refund transaction: ${error.message}`)
    }
  }

  /**
   * Verify webhook notification signature
   */
  verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
    try {
      const serverKey = config.serverKey
      const input = orderId + statusCode + grossAmount + serverKey
      const hash = crypto.createHash('sha512').update(input).digest('hex')
      
      return hash === signatureKey
    } catch (error) {
      console.error('Signature Verification Error:', error)
      return false
    }
  }

  /**
   * Parse webhook notification
   */
  parseNotification(notification: any): {
    orderId: string
    transactionStatus: string
    fraudStatus: string
    paymentType: string
    grossAmount: string
    signatureKey: string
    transactionId: string
    transactionTime: string
    settlementTime?: string
  } {
    return {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status,
      fraudStatus: notification.fraud_status,
      paymentType: notification.payment_type,
      grossAmount: notification.gross_amount,
      signatureKey: notification.signature_key,
      transactionId: notification.transaction_id,
      transactionTime: notification.transaction_time,
      settlementTime: notification.settlement_time,
    }
  }

  /**
   * Get payment status from Midtrans status
   */
  getPaymentStatus(transactionStatus: string, fraudStatus?: string): 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' {
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        return 'SUCCESS'
      } else if (fraudStatus === 'challenge') {
        return 'PENDING'
      } else {
        return 'FAILED'
      }
    } else if (transactionStatus === 'settlement') {
      return 'SUCCESS'
    } else if (transactionStatus === 'pending') {
      return 'PENDING'
    } else if (transactionStatus === 'deny') {
      return 'FAILED'
    } else if (transactionStatus === 'expire') {
      return 'EXPIRED'
    } else if (transactionStatus === 'cancel') {
      return 'CANCELLED'
    }
    
    return 'PENDING'
  }

  /**
   * Check if Midtrans is configured
   */
  isConfigured(): boolean {
    return !!(config.serverKey && config.clientKey)
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    configured: boolean
    isProduction: boolean
    hasServerKey: boolean
    hasClientKey: boolean
    hasMerchantId: boolean
  } {
    return {
      configured: this.isConfigured(),
      isProduction: config.isProduction,
      hasServerKey: !!config.serverKey,
      hasClientKey: !!config.clientKey,
      hasMerchantId: !!config.merchantId,
    }
  }
}

export default new MidtransService()
