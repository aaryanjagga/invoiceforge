import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Plus,
  Mail,
  Phone,
  Building,
  MapPin,
  FileText,
  FileCheck,
  CreditCard,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Customer, Invoice, Quotation } from '@/types/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { business } = useAuth();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});

  const fetchCustomerDetails = async () => {
    if (!id || !business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [custRes, invRes, quoteRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .eq('business_id', business.id)
          .single(),
        supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', id)
          .eq('business_id', business.id)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('quotations')
          .select('*')
          .eq('customer_id', id)
          .eq('business_id', business.id)
          .order('quote_date', { ascending: false }),
      ]);

      if (custRes.data) {
        setCustomer(custRes.data as Customer);
        setEditFormData(custRes.data as Customer);
      }
      if (invRes.data) setInvoices(invRes.data as Invoice[]);
      if (quoteRes.data) setQuotations(quoteRes.data as Quotation[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id, business?.id]);

  // Aggregate Customer Metrics
  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let outstanding = 0;
    let overdue = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach((inv) => {
      const tot = Number(inv.total) || 0;
      const paid = Number(inv.amount_paid) || 0;
      const due = Number(inv.amount_due) || 0;

      totalBilled += tot;
      totalPaid += paid;
      outstanding += due;

      if (due > 0 && new Date(inv.due_date) < today) {
        overdue += due;
      }
    });

    return {
      totalInvoices: invoices.length,
      totalBilled,
      totalPaid,
      outstanding,
      overdue,
    };
  }, [invoices]);

  const currency = business?.currency || 'INR';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: editFormData.name?.trim(),
          company: editFormData.company?.trim() || null,
          email: editFormData.email?.trim() || null,
          phone: editFormData.phone?.trim() || null,
          address: editFormData.address?.trim() || null,
          city: editFormData.city?.trim() || null,
          state: editFormData.state?.trim() || null,
          country: editFormData.country?.trim() || 'India',
          postal_code: editFormData.postal_code?.trim() || null,
          gstin: editFormData.gstin?.trim() || null,
          pan: editFormData.pan?.trim() || null,
          notes: editFormData.notes?.trim() || null,
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (!error && data) {
        setCustomer(data as Customer);
        setIsEditing(false);
      }
    } catch (err) {
      alert('Failed to update customer');
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this customer? Historical invoices and quotations will safely remain intact.'
      )
    ) {
      return;
    }
    if (!customer || !isSupabaseConfigured()) return;

    try {
      await supabase.from('customers').delete().eq('id', customer.id);
      navigate('/customers');
    } catch (err) {
      alert('Unable to delete customer');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading client overview...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-slate-500">Customer not found.</p>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs text-slate-400">{customer.company || 'Individual Client'}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <Link
            to={`/invoices/new`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create Invoice
          </Link>
          <Link
            to={`/quotations/new`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create Quotation
          </Link>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold shadow-xs transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'Edit Info'}
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
            title="Delete customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5 Aggregated Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Total Invoices
          </span>
          <p className="text-base font-mono font-bold text-slate-900 dark:text-white">
            {stats.totalInvoices}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">Total Billed</span>
          <p className="text-base font-mono font-bold text-slate-900 dark:text-white truncate">
            {formatCurrency(stats.totalBilled, currency)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">Total Paid</span>
          <p className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(stats.totalPaid, currency)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">Outstanding</span>
          <p className="text-base font-mono font-bold text-amber-600 dark:text-amber-400 truncate">
            {formatCurrency(stats.outstanding, currency)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">Overdue</span>
          <p className="text-base font-mono font-bold text-rose-600 dark:text-rose-400 truncate">
            {formatCurrency(stats.overdue, currency)}
          </p>
        </div>
      </div>

      {/* Edit Form or Information Card */}
      {isEditing ? (
        <form
          onSubmit={handleUpdate}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit Customer Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Name</label>
              <input
                type="text"
                required
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Company</label>
              <input
                type="text"
                value={editFormData.company || ''}
                onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Email</label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone</label>
              <input
                type="text"
                value={editFormData.phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded border border-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-bold">
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase text-[10px] block mb-2">
              Contact Details
            </span>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
              {customer.email && <p className="flex items-center gap-2">✉ {customer.email}</p>}
              {customer.phone && <p className="flex items-center gap-2">☎ {customer.phone}</p>}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase text-[10px] block mb-2">
              Billing Address
            </span>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {[customer.address, customer.city, customer.state, customer.country, customer.postal_code]
                .filter(Boolean)
                .join(', ') || 'No address provided'}
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase text-[10px] block mb-2">
              Tax Identifiers
            </span>
            <div className="space-y-1 text-slate-700 dark:text-slate-300 font-mono">
              <p>GSTIN: {customer.gstin || '—'}</p>
              <p>PAN: {customer.pan || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Invoices & Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Invoices */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" /> Client Invoices ({invoices.length})
            </h3>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No invoices for this customer yet.</p>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline block"
                    >
                      {inv.invoice_number}
                    </Link>
                    <span className="text-[11px] text-slate-400">{formatDate(inv.invoice_date)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.total, currency)}
                    </p>
                    <span className="capitalize text-[10px] font-semibold text-slate-500">
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Quotations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-500" /> Client Quotations ({quotations.length})
            </h3>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {quotations.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No quotations for this customer yet.</p>
            ) : (
              quotations.map((q) => (
                <div key={q.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      to={`/quotations/${q.id}`}
                      className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline block"
                    >
                      {q.quote_number}
                    </Link>
                    <span className="text-[11px] text-slate-400">Valid to {formatDate(q.expiry_date)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(q.total, currency)}
                    </p>
                    <span className="capitalize text-[10px] font-semibold text-slate-500">
                      {q.status}
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
