import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CreditCard,
  AlertCircle,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Package,
  Calendar,
  Loader2,
  Clock,
  CheckCircle2,
  Share2,
  Zap,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Invoice, Payment, Activity } from '@/types/database.types';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';
import { EmptyState } from '@/components/common/EmptyState';

type ChartRange = '7d' | '30d' | '3m' | '6m' | '12m' | 'all';

export const DashboardPage: React.FC = () => {
  const { user, business } = useAuth();
  const { isPro, monthlyUsage, canCreateInvoice, openUpgradeModal } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>('30d');

  const fetchDashboardData = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [invoicesRes, paymentsRes, custCountRes, activitiesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customer:customers(*)')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('business_id', business.id)
          .order('payment_date', { ascending: false }),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id),
        supabase
          .from('activities')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data as Invoice[]);
      }
      if (paymentsRes.data) {
        setPayments(paymentsRes.data as Payment[]);
      }
      if (custCountRes.count !== null && custCountRes.count !== undefined) {
        setCustomerCount(custCountRes.count);
      }
      if (activitiesRes.data) {
        setActivities(activitiesRes.data as Activity[]);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [business?.id]);

  // Purely computed metrics from database:
  // Rule 25: Revenue means actual recorded payments, not invoice totals.
  const metrics = useMemo(() => {
    const totalRevenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    let outstanding = 0;
    let paidInvoicesCount = 0;
    let unpaidInvoicesCount = 0;
    let overdueInvoicesCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach((inv) => {
      const due = Number(inv.amount_due) || 0;
      outstanding += due;

      if (inv.status === 'paid' || (due === 0 && Number(inv.total) > 0)) {
        paidInvoicesCount += 1;
      } else if (inv.status === 'overdue' || (due > 0 && new Date(inv.due_date) < today)) {
        overdueInvoicesCount += 1;
        unpaidInvoicesCount += 1;
      } else if (inv.status !== 'cancelled') {
        unpaidInvoicesCount += 1;
      }
    });

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      outstanding: Number(outstanding.toFixed(2)),
      paidInvoicesCount,
      unpaidInvoicesCount,
      overdueInvoicesCount,
      customerCount,
    };
  }, [payments, invoices, customerCount]);

  // Chart data calculation strictly from real payments
  const chartData = useMemo(() => {
    if (payments.length === 0) return [];

    const now = new Date();
    let startDate = new Date();

    if (chartRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (chartRange === '30d') startDate.setDate(now.getDate() - 30);
    else if (chartRange === '3m') startDate.setMonth(now.getMonth() - 3);
    else if (chartRange === '6m') startDate.setMonth(now.getMonth() - 6);
    else if (chartRange === '12m') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0); // All time

    // Filter payments within window
    const filteredPayments = payments.filter((p) => new Date(p.payment_date) >= startDate);

    // Group by date
    const dateMap: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const dateKey = p.payment_date;
      dateMap[dateKey] = (dateMap[dateKey] || 0) + Number(p.amount);
    });

    // Sort by date ascending
    const sortedKeys = Object.keys(dateMap).sort();
    return sortedKeys.map((dateStr) => ({
      date: formatDate(dateStr),
      amount: dateMap[dateStr],
    }));
  }, [payments, chartRange]);

  const currency = business?.currency || 'INR';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading workspace metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial overview for <strong className="text-slate-800 dark:text-slate-200">{business?.name}</strong>
          </p>
        </div>

        {/* Quick Actions (Section 24) */}
        <div className="flex items-center flex-wrap gap-2">
          {canCreateInvoice ? (
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </Link>
          ) : (
            <button
              type="button"
              onClick={openUpgradeModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" /> Upgrade for Invoices
            </button>
          )}
          <Link
            to="/quotations/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Quote
          </Link>
          <Link
            to="/customers"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition"
          >
            <Users className="w-3.5 h-3.5" /> Add Customer
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition"
          >
            <Package className="w-3.5 h-3.5" /> Add Product
          </Link>
        </div>
      </div>

      {/* Subscription Status & Usage Overview */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isPro
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
            }`}
          >
            {isPro ? <Sparkles className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {isPro ? 'Pro Subscription' : 'Free Plan'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isPro
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isPro ? 'Active' : 'Basic Tier'}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              {isPro
                ? 'Unlimited monthly invoices, custom branding, and priority GST management enabled.'
                : `Monthly Usage: ${monthlyUsage} / 5 invoices created this month (resets monthly).`}
            </p>
          </div>
        </div>

        {!isPro ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-28 hidden sm:block">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    monthlyUsage >= 5 ? 'bg-rose-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, (monthlyUsage / 5) * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={openUpgradeModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              Upgrade to Pro — ₹99/mo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Unlimited Invoices</span>
          </div>
        )}
      </div>

      {/* 6 Core Metrics Cards (Section 4 & 24) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Total Revenue
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white truncate">
            {formatCurrency(metrics.totalRevenue, currency)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
            Actual received
          </span>
        </div>

        {/* Outstanding Amount */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Outstanding
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white truncate">
            {formatCurrency(metrics.outstanding, currency)}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
            Pending balance
          </span>
        </div>

        {/* Paid Invoices */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Paid Invoices
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.paidInvoicesCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Settled in full</span>
        </div>

        {/* Unpaid Invoices */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Unpaid Invoices
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
            {metrics.unpaidInvoicesCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Awaiting settlement</span>
        </div>

        {/* Overdue Invoices */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Overdue
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
            {metrics.overdueInvoicesCount}
          </p>
          <span className="text-[10px] text-rose-500 font-medium block mt-1">Past due date</span>
        </div>

        {/* Total Customers */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Customers
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
            {metrics.customerCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Active directory</span>
        </div>
      </div>

      {/* Revenue Trend Chart (Section 24: 7d, 30d, 3m, 6m, 12m, all) */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Cash Collections & Revenue Trend
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Based solely on actual recorded customer payments
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
            {(['7d', '30d', '3m', '6m', '12m', 'all'] as ChartRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setChartRange(range)}
                className={`px-2.5 py-1 rounded-md font-medium uppercase transition cursor-pointer ${
                  chartRange === range
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 mt-4 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <CreditCard className="w-8 h-8 mb-2 stroke-1 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No payment records yet</p>
              <p className="text-[11px] mt-0.5">
                Charts will populate automatically as you record payments against your invoices.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [
                    formatCurrency(Number(val) || 0, currency),
                    'Received',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two Column Grid: Recent Invoices & Recent Business Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Invoices</h3>
              <p className="text-[11px] text-slate-400">Latest invoices issued to clients</p>
            </div>
            <Link
              to="/invoices"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4">
            {invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice and start tracking your business payments."
                actionText="Create Invoice"
                actionHref="/invoices/new"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <th className="py-2.5">Invoice #</th>
                      <th className="py-2.5">Customer</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Due Date</th>
                      <th className="py-2.5 text-right">Amount</th>
                      <th className="py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {invoices.slice(0, 5).map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                          {inv.customer?.name || 'Walk-in'}
                        </td>
                        <td className="py-3 text-slate-500">{formatDate(inv.invoice_date)}</td>
                        <td className="py-3 text-slate-500">{formatDate(inv.due_date)}</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inv.total, currency)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : inv.status === 'overdue'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                : inv.status === 'partially_paid'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Business Activity Feed (Section 67: Real Activity) */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activity History</h3>
            <p className="text-[11px] text-slate-400">Audit trail of workspace actions</p>
          </div>

          <div className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>No activity recorded yet.</p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  Actions you take in the app will appear here.
                </p>
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition"
                >
                  <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                      {act.action}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
