import { supabase } from '@/lib/supabase';
import { SubscriptionPlan, SubscriptionStatus } from '@/types/database.types';

export interface UserSubscriptionInfo {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isPro: boolean;
  monthlyUsage: number;
  maxInvoices: number | null;
  canCreateInvoice: boolean;
  startedAt: string | null;
  expiresAt: string | null;
}

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Dynamically loads the official Razorpay Checkout SDK if not already loaded.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Fetches user subscription details and monthly usage from the server endpoint.
 */
export const fetchUserSubscription = async (
  userId: string
): Promise<UserSubscriptionInfo> => {
  try {
    const res = await fetch(`/api/subscription/status/${userId}`);
    if (res.ok) {
      const data = await res.json();
      return {
        userId,
        plan: data.plan || 'free',
        status: data.status || 'free',
        isPro: Boolean(data.isPro),
        monthlyUsage: Number(data.monthlyUsage) || 0,
        maxInvoices: data.isPro ? null : 5,
        canCreateInvoice: Boolean(data.canCreateInvoice),
        startedAt: data.startedAt || null,
        expiresAt: data.expiresAt || null,
      };
    }
  } catch (err) {
    console.warn('Backend subscription endpoint unavailable, falling back to direct Supabase query:', err);
  }

  // Graceful fallback: query Supabase directly
  try {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const plan: SubscriptionPlan = subData?.plan || 'free';
    const status: SubscriptionStatus = subData?.subscription_status || 'free';
    const isPro = plan === 'pro' && status === 'pro';

    // Calculate current month's start in UTC
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const { count } = await supabase
      .from('invoices')
      .select('id, business:businesses!inner(owner_id)', { count: 'exact', head: true })
      .eq('business.owner_id', userId)
      .gte('created_at', startOfMonth);

    const monthlyUsage = count || 0;
    const canCreateInvoice = isPro || monthlyUsage < 5;

    return {
      userId,
      plan,
      status,
      isPro,
      monthlyUsage,
      maxInvoices: isPro ? null : 5,
      canCreateInvoice,
      startedAt: subData?.subscription_started_at || null,
      expiresAt: subData?.subscription_expires_at || null,
    };
  } catch (err) {
    console.error('Error fetching subscription fallback:', err);
    return {
      userId,
      plan: 'free',
      status: 'free',
      isPro: false,
      monthlyUsage: 0,
      maxInvoices: 5,
      canCreateInvoice: true,
      startedAt: null,
      expiresAt: null,
    };
  }
};

/**
 * Creates a server-side verified Razorpay Order for Pro upgrade (₹99).
 */
export const createProSubscriptionOrder = async (
  userId: string
): Promise<RazorpayOrderResponse> => {
  const res = await fetch('/api/subscription/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ userId, plan: 'pro' }),
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (_e) {
      // ignore JSON parse error
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      (res.status === 503
        ? 'Razorpay keys are not yet configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to activate payments.'
        : `Payment service error (${res.status}). Please try again later.`);
    throw new Error(errorMsg);
  }

  if (!data) {
    throw new Error('Payment service returned an invalid response. Please try again.');
  }

  return data;
};

/**
 * Verifies Razorpay payment signature server-side.
 */
export const verifyProPayment = async (
  userId: string,
  response: RazorpaySuccessResponse
): Promise<{ success: boolean; message: string }> => {
  const res = await fetch('/api/subscription/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      userId,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    }),
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (_e) {
      // ignore JSON parse error
    }
  }

  if (!res.ok || !data?.success) {
    const errorMsg = data?.error || 'Payment verification failed on the server.';
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Generic Razorpay Standard Checkout order creator
 */
export const createRazorpayOrder = async (
  amountInPaise: number = 9900,
  currency: string = 'INR',
  receipt?: string,
  notes?: Record<string, any>
): Promise<RazorpayOrderResponse> => {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Failed to create Razorpay order (${res.status})`);
  }

  return {
    orderId: data.order_id || data.id,
    amount: data.amount,
    currency: data.currency,
    keyId: data.key_id,
  };
};

/**
 * Generic Razorpay payment verification
 */
export const verifyRazorpayPayment = async (
  order_id: string,
  payment_id: string,
  signature: string,
  userId?: string
): Promise<{ success: boolean; message: string }> => {
  const res = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      order_id,
      payment_id,
      signature,
      userId,
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Payment signature verification failed');
  }

  return data;
};

export interface PaymentRecord {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_subscription_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
  created_at: string;
}

/**
 * Fetches user payment transaction history
 */
export const fetchPaymentHistory = async (userId: string): Promise<PaymentRecord[]> => {
  try {
    const res = await fetch(`/api/subscription/history/${userId}`);
    if (res.ok) {
      const data = await res.json();
      return data.payments || [];
    }
  } catch (err) {
    console.warn('Failed to fetch payment history from backend, falling back to Supabase:', err);
  }

  try {
    const { data } = await supabase
      .from('subscription_payments')
      .select('id, razorpay_order_id, razorpay_payment_id, razorpay_subscription_id, amount, currency, status, receipt, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return (data as PaymentRecord[]) || [];
  } catch (err) {
    console.error('Error fetching fallback payment history:', err);
    return [];
  }
};

export type ProFeatureName =
  | 'unlimited_invoices'
  | 'custom_logo'
  | 'custom_details'
  | 'gst_support'
  | 'payment_tracking'
  | 'no_watermark'
  | 'unlimited_customers';

/**
 * Centralized subscription status check: isProUser
 */
export const isProUser = (info?: Partial<UserSubscriptionInfo> | null): boolean => {
  if (!info) return false;
  return info.plan === 'pro' && info.status === 'pro';
};

/**
 * Centralized invoice creation eligibility: canCreateInvoice
 */
export const canCreateInvoice = (info?: Partial<UserSubscriptionInfo> | null): boolean => {
  if (!info) return true;
  if (isProUser(info)) return true;
  return (info.monthlyUsage ?? 0) < 5;
};

/**
 * Centralized invoice usage accessor: getMonthlyInvoiceUsage
 */
export const getMonthlyInvoiceUsage = (info?: Partial<UserSubscriptionInfo> | null): number => {
  return info?.monthlyUsage ?? 0;
};

/**
 * Centralized feature permission check: hasFeature
 */
export const hasFeature = (
  infoOrIsPro: Partial<UserSubscriptionInfo> | boolean | undefined,
  feature: ProFeatureName
): boolean => {
  const isPro = typeof infoOrIsPro === 'boolean' ? infoOrIsPro : isProUser(infoOrIsPro);
  if (isPro) return true;

  switch (feature) {
    case 'unlimited_invoices':
      return false;
    case 'custom_logo':
    case 'custom_details':
    case 'gst_support':
    case 'payment_tracking':
    case 'no_watermark':
    case 'unlimited_customers':
      return true; // Included within allowed usage on Free
    default:
      return true;
  }
};

/**
 * Legacy alias for backwards compatibility
 */
export const checkFeatureAccess = (
  isPro: boolean,
  feature:
    | 'unlimited_invoices'
    | 'custom_logo'
    | 'custom_details'
    | 'gst_support'
    | 'payment_tracking'
    | 'no_watermark'
): boolean => {
  return hasFeature(isPro, feature as ProFeatureName);
};
