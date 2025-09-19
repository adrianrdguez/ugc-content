export interface Customer {
  id: string;
  shopify_customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  shop_domain: string;
  created_at: string;
  updated_at: string;
}

export interface UGCSubmission {
  id: string;
  customer_id: string;
  shop_domain: string;
  video_url: string;
  video_key: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  reward_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  shopify_domain: string;
  access_token: string;
  email_template?: string;
  reward_type: 'discount' | 'gift_card';
  reward_value: number;
  reward_currency: string;
  created_at: string;
  updated_at: string;
}