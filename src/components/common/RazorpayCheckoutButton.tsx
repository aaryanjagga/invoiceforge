import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { loadRazorpayScript, createRazorpayOrder, verifyRazorpayPayment } from '@/services/subscriptionService';
import { useAuth } from '@/contexts/AuthContext';

interface RazorpayCheckoutButtonProps {
  amount?: number; // In paise (minimum 100 paise = ₹1)
  currency?: string;
  name?: string;
  description?: string;
  receipt?: string;
  className?: string;
  buttonText?: string;
  onSuccess?: (paymentId: string, orderId: string) => void;
  onError?: (errorMessage: string) => void;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount = 9900,
  currency = 'INR',
  name = 'InvoiceForge',
  description = 'InvoiceForge Pro Upgrade (₹99/month)',
  receipt,
  className = '',
  buttonText = 'Pay with Razorpay',
  onSuccess,
  onError,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your connection.');
      }

      // 2. Call backend endpoint to create order
      const order = await createRazorpayOrder(amount, currency, receipt, {
        userId: user?.id,
        plan: 'pro',
      });

      // 3. Configure checkout options
      const options: any = {
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TkyOoArNAYJ4z2',
        amount: order.amount,
        currency: order.currency,
        name,
        description,
        order_id: order.orderId,
        image: '/icon.svg',
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async (response: any) => {
          try {
            setLoading(true);
            // 4. Send payment response to backend for cryptographic HMAC-SHA256 signature verification
            const verifyRes = await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              user?.id
            );

            if (verifyRes.success) {
              if (onSuccess) {
                onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
              }
            } else {
              throw new Error(verifyRes.message || 'Payment signature verification failed.');
            }
          } catch (verifyErr: any) {
            const errStr = verifyErr.message || 'Payment verification failed.';
            setErrorMessage(errStr);
            if (onError) onError(errStr);
          } finally {
            setLoading(false);
          }
        },
      };

      // 5. Open Razorpay modal
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        const failureMsg = resp.error?.description || 'Payment was unsuccessful or cancelled.';
        setErrorMessage(failureMsg);
        setLoading(false);
        if (onError) onError(failureMsg);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      const msg = err.message || 'Could not initiate Razorpay checkout.';
      setErrorMessage(msg);
      setLoading(false);
      if (onError) onError(msg);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-50'
        }
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShieldCheck className="w-4 h-4" />
        )}
        {loading ? 'Processing...' : buttonText}
      </button>

      {errorMessage && (
        <p className="mt-2 text-xs text-rose-500 font-medium">{errorMessage}</p>
      )}
    </div>
  );
};
