import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Shield,
  Zap,
  Smartphone,
  CreditCard,
  FileCheck,
  Users,
  Download,
  Share2,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Database,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const isConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                InvoiceForge
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block -mt-0.5">
                Professional Invoicing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <PWAInstallButton />
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition"
              >
                Go to Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Simple, Fast & Powerful Invoicing for Modern Businesses
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Professional invoicing. <br />
            <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
              Simple business management.
            </span> <br />
            Built for growth.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            InvoiceForge empowers freelancers, independent consultants, service providers, and growing businesses to generate professional tax invoices, send WhatsApp reminders, track payments, and manage quotations with ease.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <span>Create Invoice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-3.5 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 transition"
            >
              View Pricing
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real Supabase PostgreSQL
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Offline Capable PWA
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> WhatsApp & PDF Export
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-Currency & GST
            </span>
          </div>
        </div>
      </section>

      {/* 2. Product Overview */}
      <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Built For Modern Creators & Businesses
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Everything you need to bill clients and get paid.
            </h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              From initial quotation to instant WhatsApp payment reminders and automated balance tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Invoices & Quotations
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Generate clean, compliant tax invoices with custom prefixes (INV-2026-0001). Create estimates and convert quotes to invoices in one click with historical item snapshots.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Actual Payment Tracking
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Revenue is calculated strictly from actual recorded payments, never fake numbers. Support partial payments, UPI QR tags, bank transfers, and automated overdue status checks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Installable Offline PWA
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Works seamlessly across Android, iOS, Windows, and Mac as a native standalone app. Cache the app shell, review saved records, and create invoices on the go.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Complete Feature Suite
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Engineered for absolute reliability
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Row Level Security (RLS)',
                desc: 'User isolation at the PostgreSQL database level. Your clients, revenue, and rates remain strictly confidential.',
              },
              {
                icon: Share2,
                title: 'One-Click WhatsApp Sharing',
                desc: 'Pre-formatted deep links with breakdown, due date, UPI ID, and payment instructions. No API billing needed.',
              },
              {
                icon: Download,
                title: 'A4 PDF Download & Print',
                desc: '5 built-in professional layout templates (Classic, Modern, Minimal, Professional, Compact) with high-density print styling.',
              },
              {
                icon: Users,
                title: 'Client Directory & History',
                desc: 'Keep track of client GSTIN, billing addresses, past invoices, total amount paid, and outstanding balances.',
              },
              {
                icon: Zap,
                title: 'Product & Service Catalog',
                desc: 'Pre-configure your hourly rates, unit prices, SKU, and tax rates for rapid 30-second invoice creation.',
              },
              {
                icon: Lock,
                title: 'Export & Account Ownership',
                desc: 'One-click CSV exports for Invoices, Customers, and Payments. Permanent account deletion whenever you choose.',
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                >
                  <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Invoice Preview Section */}
      <section id="preview" className="py-20 bg-slate-100/60 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Interactive Preview
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Crisp, professional invoice templates
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Every newly created invoice uses pixel-perfect typography, GST breakdown, and clear payment channels.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
              <div>
                <span className="font-extrabold text-xl text-slate-900 dark:text-white">Studio Alpha Technologies</span>
                <p className="text-xs text-slate-500 mt-1">402 Tech Hub, Bangalore, Karnataka, India • GSTIN: 29AABCU9603R1ZM</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-block px-2.5 py-1 text-[11px] font-bold rounded uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Tax Invoice
                </span>
                <p className="text-lg font-mono font-bold mt-1">INV-2026-0001</p>
              </div>
            </div>

            <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Billed To</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">Apex Media Labs Pvt Ltd</p>
                <p className="text-slate-500">contact@apexmedialabs.com • Phone: +91 98765 43210</p>
              </div>
              <div className="sm:text-right space-y-1 text-slate-600 dark:text-slate-300">
                <p>Date: <span className="font-semibold text-slate-900 dark:text-white">06 Oct 2026</span></p>
                <p>Due Date: <span className="font-semibold text-slate-900 dark:text-white">20 Oct 2026</span></p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] text-slate-400">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center w-16">Qty</th>
                    <th className="py-2 text-right w-24">Rate</th>
                    <th className="py-2 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr>
                    <td className="py-3 font-medium">Full Stack Web Application Architecture</td>
                    <td className="py-3 text-center">40 hrs</td>
                    <td className="py-3 text-right font-mono">₹1,500.00</td>
                    <td className="py-3 text-right font-mono font-bold">₹60,000.00</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Database Schema & RLS Implementation</td>
                    <td className="py-3 text-center">15 hrs</td>
                    <td className="py-3 text-right font-mono">₹1,500.00</td>
                    <td className="py-3 text-right font-mono font-bold">₹22,500.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₹82,500.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (18%)</span>
                  <span className="font-mono">+₹14,850.00</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-sm text-slate-900 dark:text-white">
                  <span>Total</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">₹97,350.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Four quick steps to your first paid invoice
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Register Workspace',
                desc: 'Create your account securely with email & password backed by Supabase Auth.',
              },
              {
                step: '02',
                title: 'Business Setup',
                desc: 'Set your business name, currency, GST details, UPI ID, and starting invoice numbering.',
              },
              {
                step: '03',
                title: 'Draft & Send',
                desc: 'Add line items, pick from 5 templates, and send directly via WhatsApp or download A4 PDF.',
              },
              {
                step: '04',
                title: 'Track Payments',
                desc: 'Record partial or full payments. Your dashboard updates real cash collections automatically.',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {item.step}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1.5">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Pricing Plans
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
              Transparent, Affordable Pricing
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-xs sm:text-sm mt-3">
              Start with our Free tier to create up to 5 invoices per calendar month. Upgrade to Pro for unlimited volume and premium business customization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Free Plan</h3>
                    <p className="text-xs text-slate-500 mt-1">For freelancers & starters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">₹0</span>
                    <span className="text-xs text-slate-500 block">/month</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span><strong>Max 5 invoices</strong> per calendar month</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Basic invoice creation & templates</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Basic customer management</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Direct PDF download & print</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Invoice history within allowed usage</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                to={user ? '/dashboard' : '/register'}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs text-center transition block cursor-pointer"
              >
                {user ? 'Current Plan' : 'Get Started'}
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl border-2 border-indigo-600 dark:border-indigo-500 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 space-y-6 flex flex-col justify-between relative shadow-xl shadow-indigo-500/10">
              <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-indigo-600 text-[11px] font-bold text-white tracking-wide uppercase shadow-sm">
                Most Popular
              </span>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-950 dark:text-indigo-200">Pro Plan</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Unlimited scale for businesses</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-mono font-black text-indigo-700 dark:text-indigo-300">₹99</span>
                    <span className="text-xs text-slate-500 block">/month</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-100 dark:border-slate-800 text-xs">
                  <ul className="space-y-3 text-slate-700 dark:text-slate-200">
                    <li className="flex items-center gap-2.5 font-semibold text-indigo-950 dark:text-indigo-200">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span><strong>Unlimited invoices</strong> every month</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Unlimited customers & products</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Custom business logo & branding</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>GST invoice support & tax reporting</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Payment status tracking & history</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>No watermark & priority export</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                to={user ? '/dashboard' : '/register'}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center shadow-lg shadow-indigo-600/25 transition block cursor-pointer"
              >
                Upgrade to Pro — ₹99/mo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does the Free plan compare to Pro?',
                a: 'The Free plan allows you to create up to 5 invoices per calendar month with PDF downloads, customer management, and WhatsApp sharing. When your business needs more volume, upgrade to Pro for ₹99/month for unlimited invoices, custom logo, GST compliance, and full history.',
              },
              {
                q: 'Is my financial data secure?',
                a: 'All data is stored in Supabase PostgreSQL with strict Row Level Security (RLS) enabled. Only your authenticated user account has permission to read or modify your business data.',
              },
              {
                q: 'Can I send invoices directly via WhatsApp?',
                a: 'Yes! InvoiceForge generates formatted WhatsApp messages containing invoice breakdown, due date, UPI ID, and payment links with one tap.',
              },
              {
                q: 'Can I install InvoiceForge as an app on my phone or PC?',
                a: 'Yes. InvoiceForge is a Progressive Web App (PWA) with a production service worker, standalone window support, and offline capabilities.',
              },
              {
                q: 'Can I convert a quotation to an invoice?',
                a: 'Yes. With one click, your quotation is converted into a newly generated invoice preserving customer data and item price snapshots.',
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  {faq.q}
                </h4>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              IF
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">InvoiceForge</span>
            <span>— Professional invoicing. Simple business management.</span>
          </div>
          <div>
            <span>No ads • No tracking • Open business tools</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
