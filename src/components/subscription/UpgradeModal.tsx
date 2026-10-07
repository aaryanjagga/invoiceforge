import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  Shield,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  loadRazorpayScript,
  createProSubscriptionOrder,
  verifyProPayment,
} from '@/services/subscriptionService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const {
    plan,
    isPro,
    monthlyUsage,
    expiresAt,
    refreshSubscription,
  } = useSubscription();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulateUpgrade = async () => {
    if (!user?.id) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch('/api/subscription/simulate-test-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshSubscription();
        setSuccessMessage('Test Pro Plan activated successfully! Unlimited invoices enabled.');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        throw new Error(data.error || 'Failed to activate test mode.');
      }
    } catch (simErr: any) {
      setError(simErr.message);
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  const handleUpgradeClick = async () => {
    if (!user?.id) {
      setError('Please log in to upgrade your subscription.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error('Failed to load Razorpay Checkout script. Please check your internet connection.');
      }

      // 2. Create server-side order
      const order = await createProSubscriptionOrder(user.id);

      // 3. Configure Razorpay Checkout options
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'InvoiceForge',
        description: 'Pro Subscription — Unlimited Invoicing (₹99/mo)',
        image: '/icon.svg',
        order_id: order.orderId,
        prefill: {
          name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
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
            // 4. Send payment response to server for cryptographic signature verification
            const verifyResult = await verifyProPayment(user.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResult.success) {
              await refreshSubscription();
              setSuccessMessage('Payment successful! Your Pro subscription is now active.');
              setTimeout(() => {
                onClose();
              }, 2000);
            }
          } catch (verifyErr: any) {
            console.error('Payment verification failed:', verifyErr);
            setError(verifyErr.message || 'Payment verification failed on the server.');
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment failed or was cancelled by user.');
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Could not initiate upgrade. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-950 p-6 sm:p-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            InvoiceForge Pro
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Upgrade Your Business
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-md">
            Remove monthly limits and unlock unlimited invoicing, custom business branding, and priority GST features.
          </p>

          {/* Current Status Badge */}
          <div className="mt-4 pt-4 border-t border-indigo-700/50 flex items-center justify-between text-xs">
            <div>
              <span className="text-indigo-300 block text-[11px]">Current Plan:</span>
              <span className="font-bold text-white capitalize">
                {plan === 'pro' ? 'Pro Plan (Active)' : 'Free Plan'}
              </span>
            </div>
            {!isPro ? (
              <div className="text-right">
                <span className="text-indigo-300 block text-[11px]">Monthly Usage:</span>
                <span className="font-mono font-bold text-white">
                  {monthlyUsage} / 5 invoices used this month
                </span>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-indigo-300 block text-[11px]">Status:</span>
                <span className="font-bold text-emerald-300">Unlimited Invoices</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="font-semibold text-rose-800 dark:text-rose-200">Upgrade Notice</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Want to test Pro features without waiting for live gateway keys?
                </span>
                <button
                  type="button"
                  onClick={handleSimulateUpgrade}
                  disabled={simulating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 transition"
                >
                  {simulating ? 'Activating Pro...' : 'Activate Pro (Test Mode)'}
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}

          {/* Pricing Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FREE PLAN */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-3 ${
                !isPro
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Free Plan</h4>
                  <p className="text-[11px] text-slate-500">For starters & trial</p>
                </div>
                <span className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
                  ₹0<span className="text-[10px] font-normal text-slate-400">/mo</span>
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (monthlyUsage / 5) * 100)}%` }}
                />
              </div>

              <ul className="space-y-2 pt-1 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Max 5 invoices per calendar month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Basic customer management</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>PDF download & print</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Allowed usage history</span>
                </li>
              </ul>
            </div>

            {/* PRO PLAN */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-3 relative ${
                isPro
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-indigo-500 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
              }`}
            >
              <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white tracking-wide uppercase shadow-xs">
                Recommended
              </span>

              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Pro Plan</h4>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                    Unlimited power
                  </p>
                </div>
                <span className="font-mono font-extrabold text-base text-indigo-700 dark:text-indigo-300">
                  ₹99<span className="text-[10px] font-normal text-slate-500">/mo</span>
                </span>
              </div>

              <ul className="space-y-2 pt-1 text-slate-700 dark:text-slate-200">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited invoices every month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited customers & items</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Custom business logo & GSTIN</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Payment status tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>No watermark & full history</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action / Upgrade Button */}
          {!isPro ? (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleUpgradeClick}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing with Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Upgrade to Pro — ₹99/month</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Secure payment via Razorpay. Cancel anytime.</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                You are currently on InvoiceForge Pro
              </p>
              {expiresAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Subscription valid until {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
