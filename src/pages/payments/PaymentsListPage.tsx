import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Download,
  Calendar,
  Search,
  Filter,
  Loader2,
  Trash2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Payment, Invoice } from '@/types/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportPaymentsToCsv } from '@/utils/exportCsv';
import { EmptyState } from '@/components/common/EmptyState';

export const PaymentsListPage: React.FC = () => {
  const { business } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('all');

  const fetchPayments = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [payRes, invRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*, invoice:invoices(id, invoice_number, total, amount_paid, amount_due, customer:customers(name))')
          .eq('business_id', business.id)
          .order('payment_date', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('business_id', business.id),
      ]);

      if (payRes.data) setPayments(payRes.data as unknown as Payment[]);
      if (invRes.data) setInvoices(invRes.data as Invoice[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [business?.id]);

  // Aggregate Metrics (Section 37)
  const metrics = useMemo(() => {
    const totalReceived = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    let outstanding = 0;
    let overdue = 0;
    let partialPaymentsCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach((inv) => {
      const due = Number(inv.amount_due) || 0;
      outstanding += due;

      if (inv.status === 'partially_paid') {
        partialPaymentsCount += 1;
      }
      if (due > 0 && new Date(inv.due_date) < today) {
        overdue += due;
      }
    });

    return {
      totalReceived,
      outstanding,
      overdue,
      partialPaymentsCount,
    };
  }, [payments, invoices]);

  // Monthly Revenue Chart Data
  const monthlyChartData = useMemo(() => {
    if (payments.length === 0) return [];

    const monthMap: Record<string, number> = {};
    payments.forEach((p) => {
      const date = new Date(p.payment_date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[monthKey] = (monthMap[monthKey] || 0) + Number(p.amount);
    });

    return Object.keys(monthMap).map((m) => ({
      month: m,
      amount: monthMap[m],
    }));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (methodFilter === 'all') return payments;
    return payments.filter((p) => p.payment_method === methodFilter);
  }, [payments, methodFilter]);

  const currency = business?.currency || 'INR';

  const handleDeletePayment = async (p: Payment) => {
    if (!confirm('Are you sure you want to delete this payment record? This will adjust the balance due on the invoice.')) return;
    if (!isSupabaseConfigured()) return;

    try {
      // 1. Delete payment
      await supabase.from('payments').delete().eq('id', p.id);

      // 2. Fetch remaining payments for this invoice
      const { data: remainingPays } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', p.invoice_id);

      const totalPaid = (remainingPays || []).reduce(
        (acc: number, cur: { amount: number }) => acc + Number(cur.amount),
        0
      );

      // Fetch invoice total
      const { data: inv } = await supabase
        .from('invoices')
        .select('total, due_date')
        .eq('id', p.invoice_id)
        .single();

      if (inv) {
        const due = Math.max(0, inv.total - totalPaid);
        const newStatus =
          due <= 0 && inv.total > 0
            ? 'paid'
            : totalPaid > 0
            ? 'partially_paid'
            : new Date(inv.due_date) < new Date()
            ? 'overdue'
            : 'sent';

        await supabase
          .from('invoices')
          .update({
            amount_paid: totalPaid,
            amount_due: due,
            status: newStatus,
          })
          .eq('id', p.invoice_id);
      }

      fetchPayments();
    } catch (err) {
      alert('Unable to delete payment');
    }
  };

  const handleExportCsv = () => {
    exportPaymentsToCsv(
      filteredPayments,
      `payments_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading payment records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Payments Received
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit log of all cash, UPI, bank transfers, and partial invoice payments
          </p>
        </div>

        {payments.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Payments CSV
          </button>
        )}
      </div>

      {/* 4 Summary Metric Cards (Section 37) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Total Received
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(metrics.totalReceived, currency)}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Settled payments</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Outstanding
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white truncate">
            {formatCurrency(metrics.outstanding, currency)}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Pending collection</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Overdue
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-rose-600 dark:text-rose-400 truncate">
            {formatCurrency(metrics.overdue, currency)}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Past due dates</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Partial Invoices
          </span>
          <p className="text-base sm:text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
            {metrics.partialPaymentsCount}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Partially paid</span>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded yet"
          description="When clients pay invoices, use 'Record Payment' on any invoice to log it here."
          actionText="View Invoices"
          actionHref="/invoices"
        />
      ) : (
        <>
          {/* Monthly Collections Chart */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Monthly Revenue Collected
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">Actual payments received by month</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: any) => [
                      formatCurrency(Number(val) || 0, currency),
                      'Amount',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Method:
            </span>
            {(['all', 'upi', 'bank_transfer', 'cash', 'card', 'cheque', 'other'] as const).map(
              (m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition cursor-pointer shrink-0 ${
                    methodFilter === m
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 text-slate-500">{formatDate(p.payment_date)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {p.invoice?.id ? (
                          <Link to={`/invoices/${p.invoice.id}`} className="hover:underline">
                            {p.invoice.invoice_number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {p.invoice?.customer?.name || 'Walk-in'}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
                        {p.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{p.reference_number || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amount, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeletePayment(p)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
