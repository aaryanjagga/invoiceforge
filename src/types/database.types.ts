export type BusinessType =
  | 'Freelancer'
  | 'Developer'
  | 'Designer'
  | 'Video Editor'
  | 'Photographer'
  | 'Consultant'
  | 'Digital Marketer'
  | 'Agency'
  | 'Tutor'
  | 'Local Service Provider'
  | 'Small Business'
  | 'Other';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled';

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'upi'
  | 'card'
  | 'cheque'
  | 'other';

export type ProductType = 'product' | 'service';

export type InvoiceTemplate =
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'professional'
  | 'compact';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankDetails {
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder?: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  business_type: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  gst_registered: boolean;
  gstin: string | null;
  pan: string | null;
  default_tax_rate: number;
  currency: string;
  invoice_prefix: string;
  starting_invoice_number: number;
  default_payment_terms: string;
  default_notes: string;
  default_terms: string;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder?: string | null;
  upi_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  gstin: string | null;
  pan: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  type: ProductType;
  price: number;
  tax_rate: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: InvoiceStatus;
  notes: string | null;
  terms: string | null;
  payment_instructions: string | null;
  bank_details?: BankDetails | null;
  upi_id: string | null;
  template: InvoiceTemplate;
  created_at: string;
  updated_at: string;

  // Joined relations
  customer?: Customer;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
}

export interface Quotation {
  id: string;
  business_id: string;
  customer_id: string | null;
  quote_number: string;
  quote_date: string;
  expiry_date: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  status: QuotationStatus;
  notes: string | null;
  terms: string | null;
  template: InvoiceTemplate;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  customer?: Customer;
  items?: QuotationItem[];
}

export interface Payment {
  id: string;
  business_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  invoice?: {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    amount_due: number;
    customer_id: string | null;
    customer?: Customer;
  };
}

export interface Notification {
  id: string;
  business_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  business_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SubscriptionPlan = 'free' | 'pro';
export type SubscriptionStatus =
  | 'free'
  | 'pro'
  | 'payment_pending'
  | 'expired'
  | 'cancelled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  razorpay_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  razorpay_subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
  created_at: string;
}

