/**
 * Type definitions for midtrans-client
 * Since @types/midtrans-client doesn't exist, we create our own
 */

declare module 'midtrans-client' {
  export interface SnapConfig {
    isProduction: boolean
    serverKey: string
    clientKey: string
  }

  export interface CoreApiConfig {
    isProduction: boolean
    serverKey: string
    clientKey: string
  }

  export interface TransactionDetails {
    order_id: string
    gross_amount: number
  }

  export interface CustomerDetails {
    first_name: string
    last_name?: string
    email: string
    phone: string
  }

  export interface ItemDetails {
    id: string
    price: number
    quantity: number
    name: string
  }

  export interface SnapParameter {
    transaction_details: TransactionDetails
    customer_details: CustomerDetails
    item_details: ItemDetails[]
    enabled_payments?: string[]
    custom_expiry?: {
      expiry_duration: number
      unit: string
    }
  }

  export interface SnapResponse {
    token: string
    redirect_url: string
  }

  export interface ChargeParameter {
    payment_type: string
    transaction_details: TransactionDetails
    customer_details: CustomerDetails
    item_details: ItemDetails[]
    [key: string]: any
  }

  export interface ChargeResponse {
    transaction_id: string
    order_id: string
    gross_amount: string
    payment_type: string
    transaction_time: string
    transaction_status: string
    fraud_status?: string
    status_code: string
    status_message: string
    expiry_time?: string
    actions?: Array<{
      name: string
      method: string
      url: string
    }>
    va_numbers?: Array<{
      bank: string
      va_number: string
    }>
    permata_va_number?: string
    bill_key?: string
    biller_code?: string
  }

  export interface TransactionStatusResponse {
    transaction_id: string
    order_id: string
    gross_amount: string
    payment_type: string
    transaction_time: string
    transaction_status: string
    fraud_status?: string
    status_code: string
    status_message: string
    va_numbers?: Array<{
      bank: string
      va_number: string
    }>
    permata_va_number?: string
    bill_key?: string
    biller_code?: string
    actions?: Array<{
      name: string
      method: string
      url: string
    }>
  }

  export interface RefundParameter {
    amount?: number
    reason?: string
  }

  export interface RefundResponse {
    refund_key: string
    refund_amount: string
    status_code: string
    status_message: string
  }

  export class Snap {
    constructor(config: SnapConfig)
    createTransaction(parameter: SnapParameter): Promise<SnapResponse>
  }

  export class CoreApi {
    constructor(config: CoreApiConfig)
    charge(parameter: ChargeParameter): Promise<ChargeResponse>
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>
      cancel(orderId: string): Promise<any>
      refund(orderId: string, parameter?: RefundParameter): Promise<RefundResponse>
    }
  }

  const midtransClient: {
    Snap: typeof Snap
    CoreApi: typeof CoreApi
  }

  export default midtransClient
}
