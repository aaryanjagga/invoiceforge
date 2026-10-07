import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logActivity } from '@/services/activityService';

export const BusinessProfilePage: React.FC = () => {
  const { user, business, refreshBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    business_type: 'Freelancer',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    gst_registered: false,
    gstin: '',
    pan: '',
    default_tax_rate: 18,
    currency: 'INR',
    invoice_prefix: 'INV-',
    starting_invoice_number: 1,
    default_payment_terms: 'Due on receipt',
    default_notes: '',
    default_terms: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder: '',
    upi_id: '',
  });

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        logo_url: business.logo_url || '',
        business_type: business.business_type || 'Freelancer',
        email: business.email || '',
        phone: business.phone || '',
        website: business.website || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        country: business.country || 'India',
        postal_code: business.postal_code || '',
        gst_registered: business.gst_registered || false,
        gstin: business.gstin || '',
        pan: business.pan || '',
        default_tax_rate: Number(business.default_tax_rate) || 18,
        currency: business.currency || 'INR',
        invoice_prefix: business.invoice_prefix || 'INV-',
        starting_invoice_number: Number(business.starting_invoice_number) || 1,
        default_payment_terms: business.default_payment_terms || 'Due on receipt',
        default_notes: business.default_notes || '',
        default_terms: business.default_terms || '',
        bank_name: business.bank_name || '',
        account_number: business.account_number || '',
        ifsc_code: business.ifsc_code || '',
        account_holder: business.account_holder || '',
        upi_id: business.upi_id || '',
      });
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !user?.id || !isSupabaseConfigured()) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error: updErr } = await supabase
        .from('businesses')
        .update({
          name: formData.name.trim(),
          logo_url: formData.logo_url.trim() || null,
          business_type: formData.business_type,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          country: formData.country.trim() || 'India',
          postal_code: formData.postal_code.trim() || null,
          gst_registered: formData.gst_registered,
          gstin: formData.gstin.trim() || null,
          pan: formData.pan.trim() || null,
          default_tax_rate: Number(formData.default_tax_rate) || 0,
          currency: formData.currency,
          invoice_prefix: formData.invoice_prefix.trim() || 'INV-',
          starting_invoice_number: Number(formData.starting_invoice_number) || 1,
          default_payment_terms: formData.default_payment_terms,
          default_notes: formData.default_notes.trim() || null,
          default_terms: formData.default_terms.trim() || null,
          bank_name: formData.bank_name.trim() || null,
          account_number: formData.account_number.trim() || null,
          ifsc_code: formData.ifsc_code.trim() || null,
          account_holder: formData.account_holder.trim() || null,
          upi_id: formData.upi_id.trim() || null,
        })
        .eq('id', business.id);

      if (updErr) throw updErr;

      await logActivity({
        businessId: business.id,
        userId: user.id,
        entityType: 'business',
        entityId: business.id,
        action: 'Business profile and billing details updated',
      });

      await refreshBusiness();
      setMessage({ type: 'success', text: 'Business profile successfully updated!' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update business details',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Business Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure header branding, GST compliance, bank accounts, and invoice templates
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Basic Brand Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" /> General Company Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">
                Business Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Business Type</label>
              <input
                type="text"
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                placeholder="e.g. Freelancer / Agency"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Billing Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Website URL</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Logo URL (Optional)</label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Street Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">PIN / Postal</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* GST & Tax Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-500" /> Tax & Identification
          </h2>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="gst_registered"
              checked={formData.gst_registered}
              onChange={(e) => setFormData({ ...formData, gst_registered: e.target.checked })}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="gst_registered" className="font-semibold text-slate-800 dark:text-slate-200">
              GST Registered Entity
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">PAN</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Default Tax Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={formData.default_tax_rate}
                onChange={(e) => setFormData({ ...formData, default_tax_rate: Number(e.target.value) })}
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Invoice Preferences */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Invoice Defaults & Numbering
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Starting Number</label>
              <input
                type="number"
                min="1"
                value={formData.starting_invoice_number}
                onChange={(e) =>
                  setFormData({ ...formData, starting_invoice_number: Number(e.target.value) })
                }
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Default Payment Terms</label>
            <input
              type="text"
              value={formData.default_payment_terms}
              onChange={(e) => setFormData({ ...formData, default_payment_terms: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Default Invoice Notes</label>
            <textarea
              rows={2}
              value={formData.default_notes}
              onChange={(e) => setFormData({ ...formData, default_notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Bank & UPI Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-purple-500" /> Banking & UPI Instructions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">UPI ID (VPA)</label>
              <input
                type="text"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                placeholder="yourname@okaxis"
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="HDFC Bank"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Account Holder</label>
              <input
                type="text"
                value={formData.account_holder}
                onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Account Number</label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Business Settings
          </button>
        </div>
      </form>
    </div>
  );
};
