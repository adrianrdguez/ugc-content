export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          shopify_domain: string
          access_token: string
          email_template: string | null
          reward_type: 'discount' | 'gift_card'
          reward_value: number
          reward_currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shopify_domain: string
          access_token: string
          email_template?: string | null
          reward_type?: 'discount' | 'gift_card'
          reward_value?: number
          reward_currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shopify_domain?: string
          access_token?: string
          email_template?: string | null
          reward_type?: 'discount' | 'gift_card'
          reward_value?: number
          reward_currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          shopify_customer_id: string
          email: string
          first_name: string | null
          last_name: string | null
          orders_count: number
          shop_domain: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shopify_customer_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          orders_count?: number
          shop_domain: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shopify_customer_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          orders_count?: number
          shop_domain?: string
          created_at?: string
          updated_at?: string
        }
      }
      ugc_submissions: {
        Row: {
          id: string
          customer_id: string
          shop_domain: string
          video_url: string | null
          video_key: string | null
          status: 'pending' | 'approved' | 'rejected'
          review_notes: string | null
          reward_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          shop_domain: string
          video_url?: string | null
          video_key?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          review_notes?: string | null
          reward_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          shop_domain?: string
          video_url?: string | null
          video_key?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          review_notes?: string | null
          reward_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      email_invitations: {
        Row: {
          id: string
          customer_id: string
          shop_domain: string
          sent_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          shop_domain: string
          sent_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          shop_domain?: string
          sent_at?: string
        }
      }
    }
  }
}