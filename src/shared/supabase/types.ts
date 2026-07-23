export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sync_queue: {
        Row: {
          id: string
          table_name: string
          action: string
          data: Json
          created_at: string
          synced: boolean
        }
        Insert: {
          id?: string
          table_name: string
          action: string
          data: Json
          created_at?: string
          synced?: boolean
        }
        Update: {
          id?: string
          table_name?: string
          action?: string
          data?: Json
          created_at?: string
          synced?: boolean
        }
      }
      license_customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          force_popup_code: string | null
          force_popup_until: string | null
          id: string
          metadata: Json
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          force_popup_code?: string | null
          force_popup_until?: string | null
          id?: string
          metadata?: Json
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          force_popup_code?: string | null
          force_popup_until?: string | null
          id?: string
          metadata?: Json
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
      }
      customer_devices: {
        Row: {
          app_version: string | null
          customer_id: string
          device_id: string
          device_name: string | null
          first_seen_at: string
          id: string
          ip_address: string | null
          last_seen_at: string
          os_name: string | null
          platform: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
        }
        Insert: {
          app_version?: string | null
          customer_id: string
          device_id: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os_name?: string | null
          platform?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
        }
        Update: {
          app_version?: string | null
          customer_id?: string
          device_id?: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os_name?: string | null
          platform?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
        }
      }
      customer_subscriptions: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          notes: string | null
          plan_id: string
          source: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          feature_flags: Json
          id: string
          is_active: boolean
          is_recommended: boolean
          max_devices: number
          max_products: number
          max_transactions_per_day: number
          max_users: number
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          feature_flags?: Json
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          max_devices?: number
          max_products?: number
          max_transactions_per_day?: number
          max_users?: number
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          feature_flags?: Json
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          max_devices?: number
          max_products?: number
          max_transactions_per_day?: number
          max_users?: number
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
      }
    }
  }
}
