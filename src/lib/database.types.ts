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
          shop_id: string
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
          shop_id: string
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
          shop_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      ugc_submissions: {
        Row: {
          id: string
          customer_id: string
          shop_id: string
          video_url: string | null
          video_key: string | null
          status: 'pending' | 'processing' | 'approved' | 'rejected'
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          shop_id: string
          video_url?: string | null
          video_key?: string | null
          status?: 'pending' | 'processing' | 'approved' | 'rejected'
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          shop_id?: string
          video_url?: string | null
          video_key?: string | null
          status?: 'pending' | 'processing' | 'approved' | 'rejected'
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rewards: {
        Row: {
          id: string
          submission_id: string
          shop_id: string
          type: 'discount' | 'gift_card'
          value: number
          currency: string
          shopify_discount_id: string | null
          shopify_gift_card_id: string | null
          status: 'pending' | 'sent' | 'failed'
          sent_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          shop_id: string
          type: 'discount' | 'gift_card'
          value: number
          currency: string
          shopify_discount_id?: string | null
          shopify_gift_card_id?: string | null
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          shop_id?: string
          type?: 'discount' | 'gift_card'
          value?: number
          currency?: string
          shopify_discount_id?: string | null
          shopify_gift_card_id?: string | null
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_invitations: {
        Row: {
          id: string
          customer_id: string
          shop_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          shop_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          shop_id?: string
          sent_at?: string
        }
      }
    }
    Functions: {
      increment_order_count: {
        Args: {
          customer_id: string
        }
        Returns: Database['public']['Tables']['customers']['Row']
      }
      get_shop_id: {
        Args: {
          domain: string
        }
        Returns: string
      }
    }
  }
}