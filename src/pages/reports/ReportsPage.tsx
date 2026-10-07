import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  Users,
  Download,
  Loader2,
  TrendingUp,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Invoice, Payment, Customer } from '@/types/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportInvoicesToCsv, exportPaymentsToCsv } from '@/utils/exportCsv';
import { EmptyState } from '@/components/common/EmptyState';

type ReportRange = '7d' | '30d' | '3m' | '6m' | '12m' | 'all';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export const ReportsPage: React.FC = () => {
  const { business } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ReportRange>('30d');

  const fetchReportsData = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [invRes, payRes, custRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customer:customers(*)')
          .eq('business_id', business.id),
        supabase
          .from('payments')
          .select('*, invoice:invoices(customer_id, customer:customers(name))')
          .eq('business_id', business.id),
        supabase
          .from('customers')
          .select('*')
          .eq('business_id', business.id),
      ]);

      if (invRes.data) setInvoices(invRes.data as unknown as Invoice[]);
      if (payRes.data) setPayments(payRes.data as unknown as Payment[]);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [business?.id]);

  // Filtered by selected date window
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (range === '7d') startDate.setDate(now.getDate() - 7);
    else if (range === '30d') startDate.setDate(now.getDate() - 30);
    else if (range === '3m') startDate.setMonth(now.getMonth() - 3);
    else if (range === '6m') startDate.setMonth(now.getMonth() - 6);
    else if (range === '12m') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0);

    const fInvoices = invoices.filter((i) => new Date(i.invoice_date) >= startDate);
    const fPayments = payments.filter((p) => new Date(p.payment_date) >= startDate);

    // Revenue calculations
    const totalRevenue = fPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalBilled = fInvoices.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    const outstanding = fInvoices.reduce((acc, i) => acc + (Number(i.amount_due) || 0), 0);

    // Invoice Status Breakdown
    const statusCounts: Record<string, number> = {
      paid: 0,
      partially_paid: 0,
      sent: 0,
      draft: 0,
      overdue: 0,
      cancelled: 0,
    };
    fInvoices.forEach((i) => {
      if (statusCounts[i.status] !== undefined) {
        statusCounts[i.status] += 1;
      }
    });

    const statusChartData = Object.keys(statusCounts)
      .filter((k) => statusCounts[k] > 0)
      .map((k) => ({
        name: k.replace('_', ' '),
        value: statusCounts[k],
      }));

    // Payment methods breakdown
    const methodCounts: Record<string, number> = {};
    fPayments.forEach((p) => {
      methodCounts[p.payment_method] = (methodCounts[p.payment_method] || 0) + Number(p.amount);
    });

    const methodChartData = Object.keys(methodCounts).map((k) => ({
      name: k.replace('_', ' ').toUpperCase(),
      value: Number(methodCounts[k].toFixed(2)),
    }));

    // Top Customers by Revenue Paid
    const customerRevenueMap: Record<string, { name: string; amount: number }> = {};
    fPayments.forEach((p) => {
      const cName = p.invoice?.customer?.name || 'Walk-in Client';
      if (!customerRevenueMap[cName]) {
        customerRevenueMap[cName] = { name: cName, amount: 0 };
      }
      customerRevenueMap[cName].amount += Number(p.amount);
    });

    const topCustomers = Object.values(customerRevenueMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      fInvoices,
      fPayments,
      totalRevenue,
      totalBilled,
      outstanding,
      statusChartData,
      methodChartData,
      topCustomers,
    };
  }, [invoices, payments, range]);

  const currency = business?.currency || 'INR';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Computing business reports...</span>
      </div>
    );
  }

  const hasAnyData = invoices.length > 0 || payments.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial & Business Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real cash performance, top paying clients, and payment channel distribution
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
          {(['7d', '30d', '3m', '6m', '12m', 'all'] as ReportRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md uppercase font-medium transition cursor-pointer ${
                range === r
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title="No financial data yet"
          description="Reports and charts will automatically calculate as soon as you generate invoices and record payments."
          actionText="Create Invoice"
          actionHref="/invoices/new"
        />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Total Revenue Collected
              </span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(filteredData.totalRevenue, currency)}
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">In selected range</span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Total Amount Invoiced
              </span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(filteredData.totalBilled, currency)}
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">
                {filteredData.fInvoices.length} invoices issued
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Outstanding Balance
              </span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(filteredData.outstanding, currency)}
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Pending payments</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Distribution */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" /> Revenue by Payment Method
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">Cash vs UPI vs Bank Transfer</p>

              <div className="h-56 w-full flex items-center justify-center">
                {filteredData.methodChartData.length === 0 ? (
                  <p className="text-xs text-slate-400">No payments in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredData.methodChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {filteredData.methodChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [
                          formatCurrency(Number(val) || 0, currency),
                          'Received',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Paying Clients */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" /> Top Clients by Real Revenue
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">Clients who have paid the most</p>

              <div className="space-y-3">
                {filteredData.topCustomers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-12 text-center">
                    No customer revenue recorded in this period.
                  </p>
                ) : (
                  filteredData.topCustomers.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-400 w-4">#{idx + 1}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(c.amount, currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
