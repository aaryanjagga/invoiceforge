import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  UserPlus,
  AlertCircle,
  FileText,
  Calculator,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Customer,
  Product,
  InvoiceItem,
  InvoiceTemplate,
  InvoiceStatus,
} from '@/types/database.types';
import { calculateInvoiceTotals, calculateItemTotal } from '@/utils/calculations';
import { formatCurrency } from '@/utils/formatters';
import { CreateCustomerModal } from '@/components/common/CreateCustomerModal';
import { logActivity, createNotification } from '@/services/activityService';

export const InvoiceFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // If id exists, Edit mode
  const isEditMode = Boolean(id);

  const { user, business } = useAuth();
  const { isPro, monthlyUsage, canCreateInvoice, openUpgradeModal, refreshSubscription } = useSubscription();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Form Fields
  const [customerId, setCustomerId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default 14 days
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState<string>(
    business?.default_payment_terms || 'Due on receipt'
  );
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [template, setTemplate] = useState<InvoiceTemplate>('classic');
  const [notes, setNotes] = useState<string>(business?.default_notes || '');
  const [terms, setTerms] = useState<string>(business?.default_terms || '');
  const [upiId, setUpiId] = useState<string>(business?.upi_id || '');
  const [status, setStatus] = useState<InvoiceStatus>('draft');

  // Line items
  const [items, setItems] = useState<
    Array<{
      id?: string;
      product_id?: string | null;
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      discount: number;
      tax_rate: number;
      tax_amount: number;
      line_total: number;
    }>
  >([
    {
      description: '',
      quantity: 1,
      unit: 'hrs',
      unit_price: 0,
      discount: 0,
      tax_rate: business?.default_tax_rate || 0,
      tax_amount: 0,
      line_total: 0,
    },
  ]);

  // Load existing customers, products, and next invoice sequence or edit data
  useEffect(() => {
    const loadInitData = async () => {
      if (!business?.id || !isSupabaseConfigured()) {
        setInitLoading(false);
        return;
      }

      try {
        setInitLoading(true);

        const [custRes, prodRes] = await Promise.all([
          supabase.from('customers').select('*').eq('business_id', business.id).order('name'),
          supabase.from('products').select('*').eq('business_id', business.id).order('name'),
        ]);

        if (custRes.data) setCustomers(custRes.data as Customer[]);
        if (prodRes.data) setProducts(prodRes.data as Product[]);

        if (isEditMode && id) {
          // Fetch existing invoice
          const { data: invData, error: invErr } = await supabase
            .from('invoices')
            .select('*, items:invoice_items(*)')
            .eq('id', id)
            .eq('business_id', business.id)
            .single();

          if (invErr) throw invErr;

          if (invData) {
            setCustomerId(invData.customer_id || '');
            setInvoiceNumber(invData.invoice_number);
            setInvoiceDate(invData.invoice_date);
            setDueDate(invData.due_date);
            setPaymentTerms(invData.payment_terms);
            setDiscountType(invData.discount_type);
            setDiscountValue(Number(invData.discount_value) || 0);
            setTemplate(invData.template);
            setNotes(invData.notes || '');
            setTerms(invData.terms || '');
            setUpiId(invData.upi_id || '');
            setStatus(invData.status);

            if (invData.items && invData.items.length > 0) {
              setItems(
                invData.items.map((it: InvoiceItem) => ({
                  id: it.id,
                  product_id: it.product_id,
                  description: it.description,
                  quantity: Number(it.quantity),
                  unit: it.unit,
                  unit_price: Number(it.unit_price),
                  discount: Number(it.discount),
                  tax_rate: Number(it.tax_rate),
                  tax_amount: Number(it.tax_amount),
                  line_total: Number(it.line_total),
                }))
              );
            }
          }
        } else {
          // Compute Next Invoice Number: INV-YYYY-0001
          const { count } = await supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', business.id);

          const nextNum = (count || 0) + (business.starting_invoice_number || 1);
          const year = new Date().getFullYear();
          const prefix = business.invoice_prefix || 'INV-';
          const formattedNum = `${prefix}${year}-${String(nextNum).padStart(4, '0')}`;
          setInvoiceNumber(formattedNum);
        }
      } catch (err) {
        console.warn('Init error:', err);
      } finally {
        setInitLoading(false);
      }
    };

    loadInitData();
  }, [business?.id, id, isEditMode]);

  // Recalculate totals whenever items or discounts change
  const totals = calculateInvoiceTotals(items, discountType, discountValue);

  // Handle line item changes
  const handleItemChange = (index: number, field: string, value: unknown) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Recompute line total
    const { taxAmount, lineTotal } = calculateItemTotal(
      item.quantity,
      item.unit_price,
      item.discount,
      item.tax_rate
    );
    item.tax_amount = taxAmount;
    item.line_total = lineTotal;

    updated[index] = item;
    setItems(updated);
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const updated = [...items];
    const { taxAmount, lineTotal } = calculateItemTotal(
      updated[index].quantity,
      prod.price,
      updated[index].discount,
      prod.tax_rate
    );

    updated[index] = {
      ...updated[index],
      product_id: prod.id,
      description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
      unit_price: Number(prod.price),
      unit: prod.unit || 'hrs',
      tax_rate: Number(prod.tax_rate),
      tax_amount: taxAmount,
      line_total: lineTotal,
    };
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit: 'hrs',
        unit_price: 0,
        discount: 0,
        tax_rate: business?.default_tax_rate || 0,
        tax_amount: 0,
        line_total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async (submitStatus: InvoiceStatus = 'draft') => {
    if (!business?.id || !user?.id || !isSupabaseConfigured()) {
      setError('Database is not connected');
      return;
    }

    if (!isEditMode && !canCreateInvoice) {
      openUpgradeModal();
      setError("Monthly limit reached: You've created 5 of 5 invoices for this calendar month. Upgrade to Pro for unlimited invoices.");
      return;
    }

    if (!invoiceNumber.trim()) {
      setError('Invoice number is required');
      return;
    }

    // Validate that at least one item has description
    const validItems = items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setError('Please provide at least one invoice item with a description.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const invoicePayload = {
        business_id: business.id,
        customer_id: customerId || null,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms: paymentTerms,
        subtotal: totals.subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total: totals.total,
        amount_paid: isEditMode ? undefined : 0,
        amount_due: totals.total, // For new invoices amount_due = total
        status: submitStatus,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        upi_id: upiId.trim() || null,
        template,
        bank_details: {
          bank_name: business.bank_name || '',
          account_number: business.account_number || '',
          ifsc_code: business.ifsc_code || '',
          account_holder: business.account_holder || '',
        },
      };

      let savedInvoiceId = id;

      if (isEditMode && id) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update(invoicePayload)
          .eq('id', id);

        if (updateError) throw updateError;

        // Delete existing items and re-insert snapshot items
        await supabase.from('invoice_items').delete().eq('invoice_id', id);
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('invoices')
          .insert(invoicePayload)
          .select()
          .single();

        if (insertError) throw insertError;
        savedInvoiceId = insertData.id;
      }

      // Insert line items
      const itemsPayload = validItems.map((item, idx) => ({
        invoice_id: savedInvoiceId,
        product_id: item.product_id || null,
        description: item.description.trim(),
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        sort_order: idx,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // Activity log
      await logActivity({
        businessId: business.id,
        userId: user.id,
        entityType: 'invoice',
        entityId: savedInvoiceId,
        action: `Invoice ${invoiceNumber} ${isEditMode ? 'updated' : 'created'}`,
      });

      if (!isEditMode) {
        await createNotification({
          businessId: business.id,
          userId: user.id,
          type: 'invoice',
          title: 'Invoice Created',
          message: `Invoice ${invoiceNumber} created with total ${formatCurrency(totals.total, business.currency)}.`,
        });
        await refreshSubscription();
      }

      navigate(`/invoices/${savedInvoiceId}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to save invoice. Please check values.'
      );
    } finally {
      setLoading(false);
    }
  };

  const currency = business?.currency || 'INR';

  if (initLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Preparing invoice workspace...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
            <p className="text-xs text-slate-500">
              Tax invoice with real-time tax calculation and snapshot preservation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave('sent')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Send
          </button>
        </div>
      </div>

      {!isEditMode && !canCreateInvoice && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Monthly Invoice Limit Reached ({monthlyUsage} / 5 used)
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                You have reached the monthly limit of 5 invoices for this calendar month. Upgrade to Pro for unlimited invoices.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openUpgradeModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Upgrade to Pro — ₹99/mo
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Invoice Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-8 text-xs">
        {/* Top Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          {/* Customer Selection */}
          <div className="md:col-span-1 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 dark:text-white">Customer</label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3 h-3" /> + New Customer
              </button>
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Customer (or Walk-in) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice # & Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-900 dark:text-white block mb-1">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-900 dark:text-white block mb-1">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as InvoiceTemplate)}
                className="w-full capitalize rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
                <option value="professional">Professional</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-900 dark:text-white block mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-900 dark:text-white block mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Line Items</h3>
            <span className="text-[11px] text-slate-400">
              Tax and discounts apply per item
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                  <th className="py-2 px-2 w-1/3">Item / Description</th>
                  <th className="py-2 px-2 w-20 text-center">Qty</th>
                  <th className="py-2 px-2 w-20 text-center">Unit</th>
                  <th className="py-2 px-2 w-28 text-right">Price</th>
                  <th className="py-2 px-2 w-20 text-right">Tax %</th>
                  <th className="py-2 px-2 w-28 text-right">Total</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item, index) => (
                  <tr key={index} className="align-top">
                    {/* Description & Product Picker */}
                    <td className="py-3 px-2 space-y-1.5">
                      {products.length > 0 && (
                        <select
                          value={item.product_id || ''}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1 text-[11px] text-slate-600 dark:text-slate-300"
                        >
                          <option value="">-- Autofill from Catalog --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.price, currency)})
                            </option>
                          ))}
                        </select>
                      )}
                      <textarea
                        rows={2}
                        required
                        placeholder="Description of work, service, or product"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="hrs"
                        className="w-full text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </td>

                    {/* Price */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(index, 'unit_price', Number(e.target.value))
                        }
                        className="w-full text-right font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </td>

                    {/* Tax % */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={item.tax_rate}
                        onChange={(e) =>
                          handleItemChange(index, 'tax_rate', Number(e.target.value))
                        }
                        className="w-full text-right font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 dark:text-white pt-4">
                      {formatCurrency(item.line_total, currency)}
                    </td>

                    {/* Delete item */}
                    <td className="py-3 px-2 text-center pt-3">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Item
          </button>
        </div>

        {/* Bottom Totals & Notes Section */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Notes, Terms & UPI */}
          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Notes to Client
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank you for your business! Please remit payment via UPI or bank transfer."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Payment Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment is due within 14 days of issue date."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. username@okhdfcbank"
                  className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Net 15"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>

            {/* Discount setting */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-slate-600 dark:text-slate-400">Discount</span>
              <div className="flex items-center gap-1.5 w-44">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-[11px]"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">Fixed</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full font-mono text-right rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-xs"
                />
              </div>
            </div>

            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px]">
                <span>Discount Applied</span>
                <span className="font-mono">-{formatCurrency(totals.discountAmount, currency)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Tax Amount</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                +{formatCurrency(totals.taxAmount, currency)}
              </span>
            </div>

            <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-3 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white">
              <span>Grand Total</span>
              <span className="text-base font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totals.total, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [...prev, newCust]);
          setCustomerId(newCust.id);
        }}
      />
    </div>
  );
};
