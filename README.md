# InvoiceForge

> **Professional invoicing. Simple business management. Free forever.**

InvoiceForge is a free-forever invoice, quotation, customer, product/service, payment, and business management Progressive Web App built with React, TypeScript, Tailwind CSS, and a real Supabase PostgreSQL database with Row Level Security.

Zero subscriptions. Zero demo/fake data. Zero artificial limits.

---

## ⚡ Core Features

- **Tax Invoices & Quotations**: Compliant invoice generator with customizable numbering (`INV-2026-0001`), payment terms, discount models, and 5 professional printable templates (Classic, Modern, Minimal, Professional, Compact).
- **Quote-to-Invoice Conversion**: Convert accepted estimates into invoices with one click while preserving original quotations and pricing snapshots.
- **Strict Cash Revenue Tracking**: Financial metrics reflect **actual recorded payments**, not unpaid invoice totals. Full support for partial payments, UPI transaction IDs, and bank wire reconciliation.
- **Client & Catalog Management**: Complete customer directory with GSTIN/PAN records, outstanding balance history, and reusable product/service catalog.
- **One-Click WhatsApp Dispatch**: Ready-to-send formatted WhatsApp reminders and invoice dispatches via deep links with zero third-party billing requirements.
- **Progressive Web App (PWA)**: Installable on Windows, macOS, Android, and iOS Safari. Standalone app shell with offline capabilities and subtle network status badges.
- **Row Level Security (RLS)**: Enforced directly at the PostgreSQL layer. User workspaces and financial records are cryptographically isolated.
- **Zero Demo Data**: Brand-new workspaces initialize with clean, calculated zero states (`₹0 Revenue`, `0 Invoices`, `0 Customers`).

---

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Routing**: React Router
- **Icons**: Lucide React
- **Analytics & Charts**: Recharts
- **PWA**: `vite-plugin-pwa`, Workbox, Web App Manifest
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)

---

## 📋 Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
```

> **Security Note**: Never commit `.env` to version control. Only safe public client variables (`VITE_SUPABASE_*`) are exposed to the browser. The database connection string `DATABASE_URL` is for server-side migrations only.

---

## 🗄 Database Migrations (Supabase)

To set up the required schema, tables, indexes, and Row Level Security policies:

1. Open your [Supabase Dashboard](https://supabase.com).
2. Navigate to the **SQL Editor**.
3. Open `supabase/migrations/20260101000000_initial_schema.sql` from this repository.
4. Run the SQL script.

This will automatically create:
- `profiles`
- `businesses`
- `customers`
- `products`
- `invoices` & `invoice_items`
- `quotations` & `quotation_items`
- `payments`
- `notifications` & `activities`
- Performance indexes & strict RLS policies on all tables.

---

## 🚀 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build

```bash
npm run build
```

The production assets and service worker will be generated in the `dist` folder, ready for deployment to Vercel, Netlify, Cloudflare Pages, or Docker.

---

## 📱 PWA Installation

- **Desktop (Chrome/Edge)**: Click the **Install App** button in the header or the address bar install icon.
- **Android**: Tap the **Install App** button to add to your home screen.
- **iOS Safari**: Tap the **Share** button (box with upward arrow) and select **Add to Home Screen**.

---

## 🔒 Security

- Authenticated sessions are securely persisted and managed through Supabase Auth.
- Every business table enforces PostgreSQL Row Level Security (`check_user_owns_business(business_id)`).
- Permanent account deletion safely deletes business data upon explicit confirmation.
