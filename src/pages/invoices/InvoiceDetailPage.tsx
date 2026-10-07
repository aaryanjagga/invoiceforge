import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Copy,
  Printer,
  Download,
  Share2,
  CreditCard,
  Send,
  Trash2,
  XCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Invoice } from '@/types/database.types';
import { InvoiceTemplateRenderer } from '@/components/invoice/InvoiceTemplateRenderer';
import { RecordPaymentModal } from '@/components/common/RecordPaymentModal';
import { generateInvoiceWhatsAppUrl } from '@/utils/whatsapp';
import { triggerPrintModal, downloadDocumentAsPdf } from '@/utils/printPdf';
import { formatCurrency } from '@/utils/formatters';
import { logActivity, createNotification } from '@/services/activityService';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, business } = useAuth();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setIsDownloadingPdf(true);
    try {
      await downloadDocumentAsPdf(`Invoice_${invoice.invoice_number}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const fetchInvoice = async () => {
    if (!id || !business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(*), items:invoice_items(*), payments:payments(*)')
        .eq('id', id)
        .eq('business_id', business.id)
        .single();

      if (error) throw error;
      if (data) {
        setInvoice(data as Invoice);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id, business?.id]);

  const handleDuplicate = async () => {
    if (!invoice || !business?.id || !user?.id || !isSupabaseConfigured()) return;
    setActionLoading(true);

    try {
      // 1. Get next invoice number
      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id);

      const nextNum = (count || 0) + (business.starting_invoice_number || 1);
      const year = new Date().getFullYear();
      const prefix = business.invoice_prefix || 'INV-';
      const newInvoiceNumber = `${prefix}${year}-${String(nextNum).padStart(4, '0')}`;

      // 2. Insert new invoice (fresh status, 0 paid, no payments duplicated)
      const { data: newInv, error: invError } = await supabase
        .from('invoices')
        .insert({
          business_id: business.id,
          customer_id: invoice.customer_id,
          invoice_number: newInvoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          payment_terms: invoice.payment_terms,
          subtotal: invoice.subtotal,
          discount_type: invoice.discount_type,
          discount_value: invoice.discount_value,
          discount_amount: invoice.discount_amount,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          amount_paid: 0,
          amount_due: invoice.total,
          status: 'draft',
          notes: invoice.notes,
          terms: invoice.terms,
          upi_id: invoice.upi_id,
          template: invoice.template,
          bank_details: invoice.bank_details,
        })
        .select()
        .single();

      if (invError) throw invError;

      // 3. Duplicate items
      if (invoice.items && invoice.items.length > 0) {
        const itemsPayload = invoice.items.map((item, idx) => ({
          invoice_id: newInv.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount: item.discount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          line_total: item.line_total,
          sort_order: idx,
        }));

        await supabase.from('invoice_items').insert(itemsPayload);
      }

      await logActivity({
        businessId: business.id,
        userId: user.id,
        entityType: 'invoice',
        entityId: newInv.id,
        action: `Invoice ${invoice.invoice_number} duplicated as ${newInvoiceNumber}`,
      });

      navigate(`/invoices/${newInv.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsSent = async () => {
    if (!invoice || !business?.id || !isSupabaseConfigured()) return;
    setActionLoading(true);
    try {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      setInvoice((prev) => (prev ? { ...prev, status: 'sent' } : null));

      if (user?.id) {
        await logActivity({
          businessId: business.id,
          userId: user.id,
          entityType: 'invoice',
          entityId: invoice.id,
          action: `Invoice ${invoice.invoice_number} marked as sent`,
        });
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    if (!invoice || !business?.id || !isSupabaseConfigured()) return;
    setActionLoading(true);
    try {
      await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoice.id);

      setInvoice((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    } catch (err) {
      console.warn(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    if (!invoice || !isSupabaseConfigured()) return;
    setActionLoading(true);
    try {
      await supabase.from('invoices').delete().eq('id', invoice.id);
      navigate('/invoices');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete invoice');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading invoice...</span>
      </div>
    );
  }

  if (!invoice || !business) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-slate-500">Invoice not found or no business active.</p>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Invoices
        </Link>
      </div>
    );
  }

  const currency = business.currency || 'INR';
  const whatsappUrl = generateInvoiceWhatsAppUrl(invoice, business.name, currency);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar (no-print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {invoice.invoice_number}
              </h1>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : invoice.status === 'overdue'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    : invoice.status === 'partially_paid'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Customer: {invoice.customer?.name || 'Walk-in'} • Template: {invoice.template}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {invoice.amount_due > 0 && invoice.status !== 'cancelled' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold hover:bg-emerald-100 transition"
          >
            <Share2 className="w-3.5 h-3.5" /> WhatsApp
          </a>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition cursor-pointer disabled:opacity-60"
            title="Download A4 PDF"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={() => triggerPrintModal(`Invoice_${invoice.invoice_number}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-xs transition cursor-pointer"
            title="Print invoice"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>

          <button
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-xs transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>

          {invoice.status !== 'paid' && (
            <Link
              to={`/invoices/${invoice.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-xs transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </Link>
          )}

          {invoice.status === 'draft' && (
            <button
              onClick={handleMarkAsSent}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Mark Sent
            </button>
          )}

          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button
              onClick={handleCancelInvoice}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
              title="Cancel invoice"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}

          {invoice.status === 'draft' && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Delete draft invoice"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render the Exact Document Template */}
      <div className="pt-2">
        <InvoiceTemplateRenderer document={invoice} business={business} />
      </div>

      {/* Payment History Section (Section 36) */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 no-print text-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Recorded Payments History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2">Date</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Ref / UTR #</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      {p.payment_date}
                    </td>
                    <td className="py-2.5 uppercase font-medium">{p.payment_method}</td>
                    <td className="py-2.5 font-mono text-slate-500">{p.reference_number || '—'}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          invoice={invoice}
          onPaymentRecorded={() => {
            fetchInvoice();
            setIsPaymentModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
