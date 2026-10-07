import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Plus,
  Search,
  Download,
  Share2,
  ArrowRight,
  Eye,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Quotation } from '@/types/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { generateQuotationWhatsAppUrl } from '@/utils/whatsapp';
import { EmptyState } from '@/components/common/EmptyState';

export const QuotationsListPage: React.FC = () => {
  const { business } = useAuth();
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchQuotations = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customer:customers(*)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQuotations(data as Quotation[]);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [business?.id]);

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.customer?.name && q.customer.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  const currency = business?.currency || 'INR';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading quotations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Quotations & Estimates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Prepare proposals, send via WhatsApp, and convert to invoices when accepted
          </p>
        </div>

        <Link
          to="/quotations/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Create Quotation
        </Link>
      </div>

      {quotations.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No quotations yet"
          description="Send professional price estimates and quotes to potential clients."
          actionText="Create Quotation"
          actionHref="/quotations/new"
        />
      ) : (
        <>
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quote number or customer..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Status:
              </span>
              {(['all', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] as const).map(
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
                    {status}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No quotations match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => (
                      <tr
                        key={q.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/quotations/${q.id}`}
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {q.quote_number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {q.customer?.name || 'Walk-in Client'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(q.quote_date)}</td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(q.expiry_date)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(q.total, currency)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              q.status === 'accepted' || q.status === 'converted'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : q.status === 'rejected' || q.status === 'expired'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={generateQuotationWhatsAppUrl(q, business?.name || 'InvoiceForge', currency)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded text-slate-400 hover:text-emerald-600 transition"
                              title="Send on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              to={`/quotations/${q.id}`}
                              className="p-1.5 rounded text-slate-400 hover:text-indigo-600 transition"
                              title="View quotation"
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
    </div>
  );
};
