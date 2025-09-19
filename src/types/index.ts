export interface Customer {
  id: string;
  shopify_customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  shop_id: string;
  created_at: string;
  updated_at: string;
}

export interface UGCSubmission {
  id: string;
  customer_id: string;
  shop_id: string;
  video_url: string;
  video_key: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  submission_id: string;
  shop_id: string;
  type: 'discount' | 'gift_card';
  value: number;
  currency: string;
  shopify_discount_id?: string;
  shopify_gift_card_id?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
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