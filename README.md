# InvoiceForge

> **Professional invoicing. Simple business management. Free forever.**

InvoiceForge is a free-forever invoice, quotation, customer, product/service, payment, and business management Progressive Web App built with React, TypeScript, Tailwind CSS, and a real Supabase PostgreSQL database with Row Level Security.



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


## 🔒 Security

- Authenticated sessions are securely persisted and managed through Supabase Auth.
- Every business table enforces PostgreSQL Row Level Security (`check_user_owns_business(business_id)`).
- Permanent account deletion safely deletes business data upon explicit confirmation.
