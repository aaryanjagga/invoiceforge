import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Settings,
  User,
  Shield,
  Smartphone,
  Trash2,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  fetchPaymentHistory,
  PaymentRecord,
} from '@/services/subscriptionService';
import {
  supabase,
  isSupabaseConfigured,
} from '@/lib/supabase';

export const SettingsPage: React.FC = () => {
  const { user, profile, business, refreshProfile, signOut } = useAuth();
  const { plan, isPro, monthlyUsage, expiresAt, openUpgradeModal } = useSubscription();
  const { theme, setTheme } = useTheme();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  // Profile Form
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Account Deletion
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Payment Transaction History
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  React.useEffect(() => {
    if (user?.id) {
      setLoadingPayments(true);
      fetchPaymentHistory(user.id)
        .then((data) => setPayments(data))
        .catch((err) => console.error('Failed to load payments:', err))
        .finally(() => setLoadingPayments(false));
    }
  }, [user?.id, isPro]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isSupabaseConfigured()) return;
    setProfileLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      await refreshProfile();
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      console.warn(err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Permanent Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE PERMANENTLY') {
      setDeleteError('Please type DELETE PERMANENTLY to confirm.');
      return;
    }

    if (!user?.id || !isSupabaseConfigured()) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Delete business owned by user (cascade deletes invoices, quotes, payments, etc.)
      if (business?.id) {
        await supabase.from('businesses').delete().eq('id', business.id);
      }
      // Delete profile
      await supabase.from('profiles').delete().eq('id', user.id);

      // Sign out
      await signOut();
      navigate('/');
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : 'Unable to complete deletion.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 text-xs">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Profile, visual theme, Progressive Web App status, and database security
        </p>
      </div>

      {/* 1. User Profile */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" /> Account Profile
        </h2>

        {profileMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {profileMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 p-2 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition cursor-pointer"
            >
              {profileLoading ? 'Saving...' : 'Update Name'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Subscription & Billing */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500" /> Subscription & Plan
          </h2>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isPro
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {isPro ? 'Pro Plan Active' : 'Free Plan'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {isPro ? 'Pro Subscription (₹99/month)' : 'Free Plan (₹0/month)'}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {isPro
                  ? 'Unlimited invoices, custom business branding, GST support, and full history.'
                  : `Monthly limit: 5 invoices per calendar month (${monthlyUsage} / 5 used).`}
              </p>
            </div>
            {!isPro ? (
              <button
                type="button"
                onClick={openUpgradeModal}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                Upgrade to Pro — ₹99/mo
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active</span>
              </div>
            )}
          </div>

          {!isPro ? (
            <div className="pt-2">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Monthly Invoices</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {monthlyUsage} of 5 used
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    monthlyUsage >= 5 ? 'bg-rose-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, (monthlyUsage / 5) * 100)}%` }}
                />
              </div>
            </div>
          ) : expiresAt ? (
            <p className="text-[11px] text-slate-500 pt-1">
              Next renewal: <strong className="text-slate-700 dark:text-slate-300">{new Date(expiresAt).toLocaleDateString()}</strong>
            </p>
          ) : null}
        </div>

        {/* Payment History Log */}
        <div className="pt-2">
          <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span>Payment History</span>
            <span className="text-[10px] text-slate-400 font-normal">Secure server-verified records</span>
          </h3>

          {loadingPayments ? (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading payment history...</span>
            </div>
          ) : payments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/60">
              No payment transactions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        ₹{Number(p.amount).toFixed(2)}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'captured'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : p.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                      {p.razorpay_payment_id || p.razorpay_order_id}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Appearance */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Appearance & Theme
        </h2>
        <p className="text-slate-500">
          Choose between Dark, Light, or automatic system theme preferences.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-sm">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-400 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
              theme === 'system'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Laptop className="w-5 h-5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* 3. PWA Installation & Status (Section 45, 47, 49) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-500" /> Progressive Web App (PWA)
        </h2>
        <div className="space-y-2 text-slate-600 dark:text-slate-300">
          <p>
            <strong>App Shell Status:</strong> {isInstalled ? 'Installed as Standalone PWA' : 'Running in Browser'}
          </p>
          <p>
            <strong>Network Status:</strong> {isOnline ? '● Online (Connected)' : '● Offline Mode'}
          </p>
        </div>

        {isInstallable && (
          <button
            onClick={install}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
          >
            Install InvoiceForge to Device
          </button>
        )}
      </div>

      {/* 4. Account Deletion (Section 46) */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-6 space-y-4">
        <h2 className="font-bold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Permanent Account Deletion
        </h2>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-slate-700 dark:text-slate-300">
          <p className="font-bold text-rose-600 dark:text-rose-400 mb-1">
            This will permanently delete your account and business data.
          </p>
          <p className="text-[11px]">This action cannot be undone.</p>
        </div>

        {deleteError && (
          <div className="text-rose-600 dark:text-rose-400 font-semibold">{deleteError}</div>
        )}

        <div className="space-y-2">
          <label className="block text-slate-600 dark:text-slate-400">
            Type <strong className="text-rose-600 font-mono">DELETE PERMANENTLY</strong> to confirm:
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE PERMANENTLY"
            className="w-full max-w-sm font-mono rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 p-2 text-rose-700 dark:text-rose-300"
          />
        </div>

        <button
          onClick={handleDeleteAccount}
          disabled={deleteConfirmText !== 'DELETE PERMANENTLY' || isDeleting}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer disabled:opacity-40"
        >
          {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
        </button>
      </div>
    </div>
  );
};
