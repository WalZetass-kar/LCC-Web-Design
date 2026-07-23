import { supabase } from './config.js'
import { logSupabaseQuery, logSupabaseResponse } from './logging.js'

export const subscribeLicense = (
  { email, customerId }: { email: string; customerId?: string },
  onUpdate: () => void,
  onError: (error: any) => void
) => {
  let channel: any = null
  try {
    const channelName = `license-${email}-${Date.now()}`
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'license_customers', filter: `email=eq.${email}` },
        (payload) => {
          onUpdate()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime license tracking active')
        }
      })
  } catch (err) {
    onError(err)
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel).catch(() => {})
    }
  }
}

export const syncBuyerLicense = async (params: { email: string; customerId?: string; deviceInfo: any }) => {
  try {
    if (!params.email || !params.email.includes('@')) {
      logSupabaseResponse('license_customers', 'SELECT', 400, { code: 'INVALID_EMAIL', message: `Not a valid email: ${params.email}`, details: '', hint: '' }, null)
      return { success: false, error_code: 'INVALID_EMAIL' }
    }

    // Query 1: Get customer by email (array, always 200)
    logSupabaseQuery('SELECT', 'license_customers', 'id,name,email,status,metadata', { email: params.email })
    const { data: customers, error: customerError, status: customerStatus } = await (supabase
      .from('license_customers') as any)
      .select('id, name, email, status, metadata')
      .eq('email', params.email)

    logSupabaseResponse('license_customers', 'SELECT', customerStatus, customerError, customers)
    if (customerError) throw customerError

    const customer = (customers || [])[0]
    if (!customer) return { success: false, error_code: 'NOT_FOUND' }

    // Query 2: Get active subscription by customer_id (array, always 200)
    logSupabaseQuery('SELECT', 'customer_subscriptions', 'id,expires_at,started_at,status,plan_id', { customer_id: customer.id })
    const { data: subscriptions, error: subError, status: subStatus } = await (supabase
      .from('customer_subscriptions') as any)
      .select('id, expires_at, started_at, status, plan_id')
      .eq('customer_id', customer.id)
      .eq('status', 'ACTIVE')

    logSupabaseResponse('customer_subscriptions', 'SELECT', subStatus, subError, subscriptions)
    if (subError) throw subError

    const subscription = (subscriptions || [])[0]
    if (!subscription) return { success: false, error_code: 'NOT_FOUND' }

    // Query 3: Get plan details (array, always 200)
    logSupabaseQuery('SELECT', 'subscription_plans', 'id,code,name,duration_days', { id: subscription.plan_id })
    const { data: plans, error: planError, status: planStatus } = await (supabase
      .from('subscription_plans') as any)
      .select('id, code, name, duration_days')
      .eq('id', subscription.plan_id)

    logSupabaseResponse('subscription_plans', 'SELECT', planStatus, planError, plans)
    if (planError) throw planError

    const plan = (plans || [])[0]

    return {
      success: true,
      data: {
        subscription: {
          plan: { duration_days: plan?.duration_days ?? 365 },
          expires_at: subscription.expires_at,
          days_remaining: subscription.expires_at
            ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
            : null,
        },
        popup: null,
      },
    }
  } catch (err: any) {
    if (!navigator.onLine) {
      return { success: false, error_code: 'OFFLINE' }
    }
    return { success: false, error_code: 'UNKNOWN', message: err.message }
  }
}

export const heartbeat = async (params: { email: string; customerId?: string; deviceInfo: any }) => {
  if (params.deviceInfo?.deviceId) {
    const updateData: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
      os_name: params.deviceInfo.os,
      app_version: params.deviceInfo.appVersion,
    }
    logSupabaseQuery('UPDATE', 'customer_devices', 'last_seen_at,os_name,app_version', { device_id: params.deviceInfo.deviceId })
    const { error, status } = await (supabase.from('customer_devices') as any)
      .update(updateData)
      .eq('device_id', params.deviceInfo.deviceId)
    logSupabaseResponse('customer_devices', 'UPDATE', status, error, updateData)
  }
  return { success: true }
}
