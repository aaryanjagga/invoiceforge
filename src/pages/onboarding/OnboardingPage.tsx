import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  Building2,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Database,
  RefreshCw,
  Code2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logActivity } from '@/services/activityService';
import { INITIAL_SCHEMA_SQL } from '@/utils/schemaSql';

export const OnboardingPage: React.FC = () => {
  const { user, profile, business, refreshBusiness, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // If user already has a business, jump directly to dashboard
  useEffect(() => {
    if (business) {
      navigate('/dashboard');
    }
  }, [business, navigate]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [checkingTables, setCheckingTables] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  // Check if tables are already provisioned in Supabase
  const checkTablesExist = async () => {
    setCheckingTables(true);
    try {
      const { error: testErr } = await supabase.from('businesses').select('id').limit(1);
      if (testErr && (testErr.code === 'PGRST205' || testErr.message?.includes('not find the table'))) {
        setIsSchemaMissing(true);
      } else {
        setIsSchemaMissing(false);
        setError(null);
      }
    } catch {
      // ignore
    } finally {
      setCheckingTables(false);
    }
  };

  useEffect(() => {
    checkTablesExist();
  }, []);

  const copySql = () => {
    navigator.clipboard.writeText(INITIAL_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    fullName: profile?.full_name || user?.user_metadata?.full_name || '',

    // Step 2: Business
    businessName: '',
    businessType: 'Freelancer',
    email: user?.email || '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',

    // Step 3: Tax
    gstRegistered: false,
    gstin: '',
    pan: '',
    defaultTaxRate: 18,

    // Step 4: Invoice
    invoicePrefix: 'INV-',
    startingNumber: 1,
    currency: 'INR',
    defaultPaymentTerms: 'Due on receipt',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  const businessTypes = [
    'Freelancer',
    'Developer',
    'Designer',
    'Video Editor',
    'Photographer',
    'Consultant',
    'Digital Marketer',
    'Agency',
    'Tutor',
    'Local Service Provider',
    'Small Business',
    'Other',
  ];

  const handleNext = () => {
    if (step === 1 && !formData.fullName.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (step === 2 && !formData.businessName.trim()) {
      setError('Please provide your business or brand name');
      return;
    }
    setError(null);
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleComplete = async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setError('Database is not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update Profile full_name
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.fullName.trim(),
        });
      if (profileError) throw profileError;

      await refreshProfile();

      // 2. Insert Business
      const { data: newBiz, error: bizError } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: formData.businessName.trim(),
          business_type: formData.businessType,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          country: formData.country.trim() || 'India',
          postal_code: formData.postalCode.trim() || null,
          gst_registered: formData.gstRegistered,
          gstin: formData.gstin.trim() || null,
          pan: formData.pan.trim() || null,
          default_tax_rate: Number(formData.defaultTaxRate) || 0,
          currency: formData.currency,
          invoice_prefix: formData.invoicePrefix.trim() || 'INV-',
          starting_invoice_number: Number(formData.startingNumber) || 1,
          default_payment_terms: formData.defaultPaymentTerms,
          upi_id: formData.upiId.trim() || null,
          bank_name: formData.bankName.trim() || null,
          account_number: formData.accountNumber.trim() || null,
          ifsc_code: formData.ifscCode.trim() || null,
        })
        .select()
        .single();

      if (bizError) throw bizError;

      if (newBiz) {
        await logActivity({
          businessId: newBiz.id,
          userId: user.id,
          entityType: 'business',
          entityId: newBiz.id,
          action: `Business ${newBiz.name} setup completed`,
        });

        await refreshBusiness();
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Setup error:', err);
      let message = 'Unable to complete setup.';
      if (err && typeof err === 'object') {
        const anyErr = err as Record<string, unknown>;
        if (typeof anyErr.message === 'string') {
          message = anyErr.message;
        } else if (typeof anyErr.error_description === 'string') {
          message = anyErr.error_description;
        } else if (typeof anyErr.details === 'string') {
          message = anyErr.details;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header & Steps */}
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight">InvoiceForge</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold">Welcome to InvoiceForge</h1>
          <p className="text-xs text-slate-400 mt-1">
            Let&apos;s configure your business details in four simple steps
          </p>

          {/* Progress Tracker */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { num: 1, label: 'Personal', icon: User },
              { num: 2, label: 'Business', icon: Building2 },
              { num: 3, label: 'Tax & GST', icon: Receipt },
              { num: 4, label: 'Invoicing', icon: FileSpreadsheet },
            ].map((s) => {
              const Icon = s.icon;
              const isPassed = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="text-center">
                  <div
                    className={`h-1.5 rounded-full mb-2 transition-all ${
                      isPassed || isCurrent ? 'bg-indigo-500' : 'bg-slate-700'
                    }`}
                  />
                  <div className="flex items-center justify-center gap-1">
                    <Icon className={`w-3 h-3 ${isCurrent ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span
                      className={`text-[10px] hidden sm:inline font-semibold ${
                        isCurrent ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8">
          {isSchemaMissing && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    Database Schema Setup
                  </h4>
                  <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                    Tables are missing or being verified in your Supabase project. If needed, copy the SQL schema and run it in your Supabase SQL Editor.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={copySql}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'Copied SQL!' : 'Copy Migration SQL'}
                    </button>
                    <button
                      type="button"
                      onClick={checkTablesExist}
                      disabled={checkingTables}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingTables ? 'animate-spin' : ''}`} />
                      Re-check Connection
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSqlPreview(!showSqlPreview)}
                      className="px-2.5 py-1.5 text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      {showSqlPreview ? 'Hide SQL' : 'View SQL'}
                    </button>
                  </div>
                  {showSqlPreview && (
                    <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] max-h-48 overflow-y-auto">
                      {INITIAL_SCHEMA_SQL}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Step 1: Personal Information
                </h3>
                <p className="text-slate-500 mb-4">
                  How should we address you in communications and documents?
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 p-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Business Info */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Step 2: Business Profile
                </h3>
                <p className="text-slate-500 mb-4">
                  Information displayed at the top of your invoices and estimates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business / Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Rahul Sharma Designs"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Type
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {businessTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@example.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Studio #101, Business Park"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tax Settings */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Step 3: Tax & Registration
                </h3>
                <p className="text-slate-500 mb-4">
                  Configure tax parameters (you can edit or add more later).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    GST Registered Business?
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Enable if you have a GSTIN for Indian tax compliance
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.gstRegistered}
                  onChange={(e) => setFormData({ ...formData, gstRegistered: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {formData.gstRegistered && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="29AABCU9603R1ZM"
                      className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      PAN
                    </label>
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      placeholder="AABCU9603R"
                      className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.defaultTaxRate}
                  onChange={(e) => setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })}
                  placeholder="18"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Common rates: 0%, 5%, 12%, 18%, 28%. Can be overridden per line item.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Invoicing Preferences */}
          {step === 4 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Step 4: Invoicing & Payment Preferences
                </h3>
                <p className="text-slate-500 mb-4">
                  Set your invoice numbering, currency, and payment details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    placeholder="INV-"
                    className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Starting Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.startingNumber}
                    onChange={(e) => setFormData({ ...formData, startingNumber: Number(e.target.value) })}
                    className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Payment Terms
                </label>
                <select
                  value={formData.defaultPaymentTerms}
                  onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Due on receipt">Due on receipt</option>
                  <option value="Net 7">Net 7 days</option>
                  <option value="Net 15">Net 15 days</option>
                  <option value="Net 30">Net 30 days</option>
                  <option value="Net 45">Net 45 days</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block mb-2">
                  Payment Channels (Optional - can be added later)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      UPI ID (for fast QR & payments)
                    </label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      placeholder="e.g. yourname@okaxis"
                      className="w-full font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Actions */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-md transition cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Launch Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
