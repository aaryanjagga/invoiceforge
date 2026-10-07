import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Copy,
  Printer,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  ArrowRightLeft,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Quotation } from '@/types/database.types';
import { InvoiceTemplateRenderer } from '@/components/invoice/InvoiceTemplateRenderer';
import { generateQuotationWhatsAppUrl } from '@/utils/whatsapp';
import { triggerPrintModal, downloadDocumentAsPdf } from '@/utils/printPdf';
import { logActivity, createNotification } from '@/services/activityService';

export const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, business } = useAuth();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!quotation) return;
    setIsDownloadingPdf(true);
    try {
      await downloadDocumentAsPdf(`Quote_${quotation.quote_number}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const fetchQuotation = async () => {
    if (!id || !business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customer:customers(*), items:quotation_items(*)')
        .eq('id', id)
        .eq('business_id', business.id)
        .single();

      if (error) throw error;
      if (data) {
        setQuotation(data as Quotation);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id, business?.id]);

  // Section 35: Convert Quote to Invoice
  const handleConvertToInvoice = async () => {
    if (!quotation || !business?.id || !user?.id || !isSupabaseConfigured()) return;
    setActionLoading(true);

    try {
      // 1. Generate new unique invoice number
      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id);

      const nextNum = (count || 0) + (business.starting_invoice_number || 1);
      const year = new Date().getFullYear();
      const prefix = business.invoice_prefix || 'INV-';
      const newInvoiceNumber = `${prefix}${year}-${String(nextNum).padStart(4, '0')}`;

      // 2. Insert invoice preserving items, customer, pricing
      const { data: newInv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          business_id: business.id,
          customer_id: quotation.customer_id,
          invoice_number: newInvoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          payment_terms: business.default_payment_terms || 'Due on receipt',
          subtotal: quotation.subtotal,
          discount_type: 'fixed',
          discount_value: quotation.discount,
          discount_amount: quotation.discount,
          tax_amount: quotation.tax_amount,
          total: quotation.total,
          amount_paid: 0,
          amount_due: quotation.total,
          status: 'sent',
          notes: quotation.notes,
          terms: quotation.terms,
          template: quotation.template,
          upi_id: business.upi_id,
          bank_details: {
            bank_name: business.bank_name || '',
            account_number: business.account_number || '',
            ifsc_code: business.ifsc_code || '',
            account_holder: business.account_holder || '',
          },
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // 3. Insert invoice items preserving snapshot
      if (quotation.items && quotation.items.length > 0) {
        const itemsPayload = quotation.items.map((item: any, idx: number) => ({
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

      // 4. Update quotation to 'converted' and link converted_invoice_id
      await supabase
        .from('quotations')
        .update({
          status: 'converted',
          converted_invoice_id: newInv.id,
        })
        .eq('id', quotation.id);

      // 5. Activity log & notification
      await logActivity({
        businessId: business.id,
        userId: user.id,
        entityType: 'quote',
        entityId: quotation.id,
        action: `Quotation ${quotation.quote_number} converted to invoice ${newInvoiceNumber}`,
      });

      await createNotification({
        businessId: business.id,
        userId: user.id,
        type: 'quote',
        title: 'Quote Converted',
        message: `Quote ${quotation.quote_number} converted into invoice ${newInvoiceNumber}.`,
      });

      navigate(`/invoices/${newInv.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to convert quotation to invoice');
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!quotation || !business?.id || !isSupabaseConfigured()) return;
    setActionLoading(true);

    try {
      const { count } = await supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id);

      const nextNum = (count || 0) + 1;
      const year = new Date().getFullYear();
      const newQuoteNum = `QT-${year}-${String(nextNum).padStart(4, '0')}`;

      const { data: newQ, error: insErr } = await supabase
        .from('quotations')
        .insert({
          business_id: business.id,
          customer_id: quotation.customer_id,
          quote_number: newQuoteNum,
          quote_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          subtotal: quotation.subtotal,
          discount: quotation.discount,
          tax_amount: quotation.tax_amount,
          total: quotation.total,
          status: 'draft',
          notes: quotation.notes,
          terms: quotation.terms,
          template: quotation.template,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      if (quotation.items && quotation.items.length > 0) {
        const itemsPayload = quotation.items.map((item: any, idx: number) => ({
          quotation_id: newQ.id,
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
        await supabase.from('quotation_items').insert(itemsPayload);
      }

      navigate(`/quotations/${newQ.id}`);
    } catch (err) {
      console.warn(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    if (!quotation || !isSupabaseConfigured()) return;
    try {
      await supabase.from('quotations').delete().eq('id', quotation.id);
      navigate('/quotations');
    } catch (err) {
      alert('Failed to delete quotation');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading quotation...</span>
      </div>
    );
  }

  if (!quotation || !business) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-slate-500">Quotation not found.</p>
        <Link
          to="/quotations"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Quotations
        </Link>
      </div>
    );
  }

  const currency = business.currency || 'INR';
  const whatsappUrl = generateQuotationWhatsAppUrl(quotation, business.name, currency);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {quotation.quote_number}
              </h1>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  quotation.status === 'accepted' || quotation.status === 'converted'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : quotation.status === 'rejected' || quotation.status === 'expired'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {quotation.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Customer: {quotation.customer?.name || 'Walk-in'} • Template: {quotation.template}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          {quotation.status !== 'converted' ? (
            <button
              onClick={handleConvertToInvoice}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Convert to Invoice
            </button>
          ) : (
            quotation.converted_invoice_id && (
              <Link
                to={`/invoices/${quotation.converted_invoice_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> View Linked Invoice
              </Link>
            )
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
            onClick={() => triggerPrintModal(`Quote_${quotation.quote_number}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-xs transition cursor-pointer"
            title="Print quote"
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

          {quotation.status !== 'converted' && (
            <Link
              to={`/quotations/${quotation.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-xs transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </Link>
          )}

          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
            title="Delete quotation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="pt-2">
        <InvoiceTemplateRenderer document={quotation} business={business} isQuotation={true} />
      </div>
    </div>
  );
};
