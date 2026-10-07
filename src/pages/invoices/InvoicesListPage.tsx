import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  DollarSign,
  MoreVertical,
  Calendar,
  AlertCircle,
  Loader2,
  CreditCard,
  Eye,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Invoice, InvoiceStatus } from '@/types/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportInvoicesToCsv } from '@/utils/exportCsv';
import { generateInvoiceWhatsAppUrl } from '@/utils/whatsapp';
import { EmptyState } from '@/components/common/EmptyState';
import { RecordPaymentModal } from '@/components/common/RecordPaymentModal';

export const InvoicesListPage: React.FC = () => {
  const { business } = useAuth();
  const { isPro, monthlyUsage, canCreateInvoice, openUpgradeModal } = useSubscription();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(*)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvoices(data as Invoice[]);
      }
    } catch (err) {
      console.warn('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [business?.id]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.customer?.name && inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inv.customer?.company && inv.customer.company.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const currency = business?.currency || 'INR';

  const handleExportCsv = () => {
    exportInvoicesToCsv(filteredInvoices, `invoices_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Invoices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, manage, and track payment status for all client billings
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {invoices.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}

          {canCreateInvoice ? (
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Invoice
            </Link>
          ) : (
            <button
              type="button"
              onClick={openUpgradeModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" /> Upgrade to Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Plan Usage Banner */}
      {!isPro ? (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                monthlyUsage >= 5
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Monthly Free Plan Usage:
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {monthlyUsage} / 5 invoices used this month
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {monthlyUsage >= 5
                  ? 'You have reached the monthly limit of 5 invoices. Upgrade to Pro for unlimited invoices.'
                  : 'Free plan includes up to 5 invoices each calendar month. Usage resets on the 1st.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openUpgradeModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Upgrade to Pro — ₹99/mo
          </button>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              Pro Plan Active: You have unlimited invoice creation enabled.
            </span>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice and start tracking your business payments."
          actionText="Create Invoice"
          actionHref="/invoices/new"
        />
      ) : (
        <>
          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice number or customer..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Status:
              </span>
              {(['all', 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize shrink-0 transition cursor-pointer ${
                      statusFilter === status
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No invoices match your current search or status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {inv.customer?.name || 'Walk-in Client'}
                          </p>
                          {inv.customer?.company && (
                            <p className="text-[11px] text-slate-400">{inv.customer.company}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(inv.invoice_date)}</td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(inv.due_date)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inv.total, currency)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          <span
                            className={
                              inv.amount_due > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {formatCurrency(inv.amount_due, currency)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.amount_due > 0 && inv.status !== 'cancelled' && (
                              <button
                                onClick={() => setSelectedInvoiceForPayment(inv)}
                                className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] transition cursor-pointer"
                                title="Record payment"
                              >
                                Record Payment
                              </button>
                            )}

                            <a
                              href={generateInvoiceWhatsAppUrl(inv, business?.name || 'InvoiceForge', currency)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded text-slate-400 hover:text-emerald-600 transition"
                              title="Send on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </a>

                            <Link
                              to={`/invoices/${inv.id}`}
                              className="p-1.5 rounded text-slate-400 hover:text-indigo-600 transition"
                              title="View invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={Boolean(selectedInvoiceForPayment)}
          onClose={() => setSelectedInvoiceForPayment(null)}
          invoice={selectedInvoiceForPayment}
          onPaymentRecorded={() => {
            fetchInvoices();
            setSelectedInvoiceForPayment(null);
          }}
        />
      )}
    </div>
  );
};
