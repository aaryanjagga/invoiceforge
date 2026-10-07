import React from 'react';
import { Invoice, Business, Quotation } from '@/types/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface Props {
  document: Invoice | Quotation;
  business: Business;
  isQuotation?: boolean;
}

export const InvoiceTemplateRenderer: React.FC<Props> = ({
  document: doc,
  business,
  isQuotation = false,
}) => {
  const template = doc.template || 'classic';
  const currency = business.currency || 'INR';

  const docNumber = isQuotation
    ? (doc as Quotation).quote_number
    : (doc as Invoice).invoice_number;
  const docDate = isQuotation
    ? (doc as Quotation).quote_date
    : (doc as Invoice).invoice_date;
  const secondaryDateLabel = isQuotation ? 'Expiry Date' : 'Due Date';
  const secondaryDate = isQuotation
    ? (doc as Quotation).expiry_date
    : (doc as Invoice).due_date;

  const items = doc.items || [];
  const customer = doc.customer;
  const discountAmount = isQuotation
    ? Number((doc as Quotation).discount) || 0
    : Number((doc as Invoice).discount_amount) || 0;

  // Render specific template layouts
  if (template === 'minimal') {
    return (
      <div
        id="printable-invoice-document"
        className="bg-white text-slate-900 p-8 sm:p-12 max-w-4xl mx-auto rounded-lg shadow-sm font-sans printable-document"
      >
        <div className="flex justify-between items-start border-b border-slate-200 pb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {business.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">
              {[business.address, business.city, business.state, business.country, business.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
            {business.email && <p className="text-xs text-slate-500">{business.email}</p>}
            {business.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
            {business.gstin && (
              <p className="text-xs font-mono text-slate-600 mt-1">GSTIN: {business.gstin}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isQuotation ? 'Quotation' : 'Invoice'}
            </span>
            <p className="text-xl font-mono font-bold text-slate-900 mt-0.5">{docNumber}</p>
            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              <p>Date: {formatDate(docDate)}</p>
              <p>
                {secondaryDateLabel}: {formatDate(secondaryDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="py-6 border-b border-slate-100 flex justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Billed To
            </span>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {customer?.name || 'Walk-in Customer'}
            </p>
            {customer?.company && (
              <p className="text-xs text-slate-600">{customer.company}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">
              {[customer?.address, customer?.city, customer?.state, customer?.country]
                .filter(Boolean)
                .join(', ')}
            </p>
            {customer?.email && <p className="text-xs text-slate-500">{customer.email}</p>}
            {customer?.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
            {customer?.gstin && (
              <p className="text-xs font-mono text-slate-600">GSTIN: {customer.gstin}</p>
            )}
          </div>
          {!isQuotation && (doc as Invoice).status && (
            <div className="text-right">
              <span
                className={`inline-block px-2.5 py-1 text-xs font-medium rounded capitalize ${
                  (doc as Invoice).status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700'
                    : (doc as Invoice).status === 'overdue'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {(doc as Invoice).status.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mt-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 font-semibold">Description</th>
                <th className="py-2.5 font-semibold text-center w-16">Qty</th>
                <th className="py-2.5 font-semibold text-right w-24">Rate</th>
                <th className="py-2.5 font-semibold text-right w-20">Tax</th>
                <th className="py-2.5 font-semibold text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3">
                    <p className="font-medium text-slate-900">{item.description}</p>
                  </td>
                  <td className="py-3 text-center">
                    {item.quantity} {item.unit || ''}
                  </td>
                  <td className="py-3 text-right">{formatCurrency(item.unit_price, currency)}</td>
                  <td className="py-3 text-right">
                    {item.tax_rate > 0 ? `${item.tax_rate}%` : '—'}
                  </td>
                  <td className="py-3 text-right font-medium text-slate-900">
                    {formatCurrency(item.line_total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-slate-200 pt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(doc.subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}
            {doc.tax_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>+{formatCurrency(doc.tax_amount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(doc.total, currency)}</span>
            </div>
            {!isQuotation && (
              <>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Paid</span>
                  <span>{formatCurrency((doc as Invoice).amount_paid, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Balance Due</span>
                  <span>{formatCurrency((doc as Invoice).amount_due, currency)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes & Bank Details */}
        {(doc.notes || business.upi_id || business.account_number) && (
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
            {doc.notes && (
              <div>
                <span className="font-semibold text-slate-900 block mb-1">Notes:</span>
                <p className="whitespace-pre-line text-slate-500">{doc.notes}</p>
              </div>
            )}
            {(business.upi_id || business.account_number) && (
              <div>
                <span className="font-semibold text-slate-900 block mb-1">
                  Payment Instructions:
                </span>
                {business.upi_id && <p>UPI ID: <span className="font-mono text-slate-800">{business.upi_id}</span></p>}
                {business.bank_name && <p>Bank: {business.bank_name}</p>}
                {business.account_number && <p>A/C: <span className="font-mono text-slate-800">{business.account_number}</span></p>}
                {business.ifsc_code && <p>IFSC: <span className="font-mono text-slate-800">{business.ifsc_code}</span></p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Modern / Classic / Professional Default
  const isModern = template === 'modern';
  const isCompact = template === 'compact';
  const isProfessional = template === 'professional';

  return (
    <div
      id="printable-invoice-document"
      className={`bg-white text-slate-900 max-w-4xl mx-auto rounded-xl shadow-md border border-slate-200 printable-document overflow-hidden ${
        isCompact ? 'p-6' : 'p-8 sm:p-12'
      }`}
    >
      {/* Top Banner / Header */}
      <div
        className={`flex flex-col sm:flex-row justify-between items-start pb-8 ${
          isModern ? 'border-b-2 border-indigo-500' : 'border-b border-slate-200'
        }`}
      >
        <div className="space-y-1">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="h-12 w-auto object-contain mb-3"
            />
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                {business.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {business.name}
              </h1>
            </div>
          )}
          <p className="text-xs text-slate-500 max-w-sm whitespace-pre-line leading-relaxed">
            {[business.address, business.city, business.state, business.country, business.postal_code]
              .filter(Boolean)
              .join(', ')}
          </p>
          <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {business.email && <span>✉ {business.email}</span>}
            {business.phone && <span>☎ {business.phone}</span>}
            {business.website && <span>🌐 {business.website}</span>}
          </div>
          {business.gstin && (
            <p className="text-xs font-mono font-medium text-slate-700 pt-0.5">
              GSTIN: {business.gstin} {business.pan ? `| PAN: ${business.pan}` : ''}
            </p>
          )}
        </div>

        <div className="mt-6 sm:mt-0 text-left sm:text-right">
          <div className="inline-block sm:text-right">
            <span
              className={`text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                isModern
                  ? 'bg-indigo-50 text-indigo-700'
                  : isProfessional
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {isQuotation ? 'Quotation' : 'Tax Invoice'}
            </span>
            <p className="text-2xl font-mono font-extrabold text-slate-950 mt-1">
              {docNumber}
            </p>
          </div>

          <div className="mt-4 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-slate-400 font-medium">Issue Date:</span>
              <span className="font-semibold text-slate-800">{formatDate(docDate)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-slate-400 font-medium">{secondaryDateLabel}:</span>
              <span className="font-semibold text-slate-800">{formatDate(secondaryDate)}</span>
            </div>
            {!isQuotation && (doc as Invoice).payment_terms && (
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-400 font-medium">Terms:</span>
                <span className="text-slate-800">{(doc as Invoice).payment_terms}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill To & Status */}
      <div className="py-6 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Bill To
          </span>
          <p className="text-sm font-bold text-slate-900">{customer?.name || 'Walk-in Client'}</p>
          {customer?.company && (
            <p className="text-xs font-medium text-slate-700">{customer.company}</p>
          )}
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {[customer?.address, customer?.city, customer?.state, customer?.country, customer?.postal_code]
              .filter(Boolean)
              .join(', ')}
          </p>
          <div className="text-xs text-slate-500 mt-2 space-y-0.5">
            {customer?.email && <p>Email: {customer.email}</p>}
            {customer?.phone && <p>Phone: {customer.phone}</p>}
            {customer?.gstin && (
              <p className="font-mono text-slate-700 font-medium">GSTIN: {customer.gstin}</p>
            )}
          </div>
        </div>

        {!isQuotation && (
          <div className="sm:text-right flex flex-col justify-between h-full py-1">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Payment Status
              </span>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  (doc as Invoice).status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : (doc as Invoice).status === 'overdue'
                    ? 'bg-rose-100 text-rose-800'
                    : (doc as Invoice).status === 'partially_paid'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {(doc as Invoice).status.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">Amount Due:</span>
              <p className="text-2xl font-bold font-mono text-indigo-700">
                {formatCurrency((doc as Invoice).amount_due, currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isModern
                  ? 'bg-indigo-50 text-indigo-900'
                  : isProfessional
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <th className="py-3 px-3 rounded-l">Item & Description</th>
              <th className="py-3 px-2 text-center w-16">Qty</th>
              <th className="py-3 px-3 text-right w-24">Rate</th>
              <th className="py-3 px-2 text-right w-20">Discount</th>
              <th className="py-3 px-2 text-right w-20">Tax</th>
              <th className="py-3 px-3 text-right w-28 rounded-r">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50/50">
                <td className="py-3 px-3">
                  <p className="font-semibold text-slate-900">{item.description}</p>
                </td>
                <td className="py-3 px-2 text-center text-slate-700 font-medium">
                  {item.quantity} {item.unit || ''}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-700">
                  {formatCurrency(item.unit_price, currency)}
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-500">
                  {item.discount > 0 ? formatCurrency(item.discount, currency) : '—'}
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-600">
                  {item.tax_rate > 0 ? `${item.tax_rate}%` : '0%'}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(item.line_total, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary / Totals */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="w-full sm:w-1/2 space-y-4">
          {(business.upi_id || business.account_number) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block mb-1">Bank & UPI Details</span>
              {business.upi_id && (
                <p>
                  UPI ID: <span className="font-mono font-semibold text-indigo-700">{business.upi_id}</span>
                </p>
              )}
              {business.bank_name && <p>Bank Name: {business.bank_name}</p>}
              {business.account_holder && <p>A/C Holder: {business.account_holder}</p>}
              {business.account_number && (
                <p>
                  A/C No: <span className="font-mono font-semibold text-slate-900">{business.account_number}</span>
                </p>
              )}
              {business.ifsc_code && (
                <p>
                  IFSC: <span className="font-mono font-semibold text-slate-900">{business.ifsc_code}</span>
                </p>
              )}
            </div>
          )}

          {doc.notes && (
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-900 block mb-0.5">Notes:</span>
              <p className="whitespace-pre-line text-slate-500">{doc.notes}</p>
            </div>
          )}

          {doc.terms && (
            <div className="text-[11px] text-slate-500">
              <span className="font-bold text-slate-700 block mb-0.5">Terms & Conditions:</span>
              <p className="whitespace-pre-line">{doc.terms}</p>
            </div>
          )}
        </div>

        <div className="w-full sm:w-64 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 py-1">
            <span>Subtotal</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatCurrency(doc.subtotal, currency)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 py-1">
              <span>Discount</span>
              <span className="font-mono font-semibold">
                -{formatCurrency(discountAmount, currency)}
              </span>
            </div>
          )}
          {doc.tax_amount > 0 && (
            <div className="flex justify-between text-slate-600 py-1">
              <span>Tax Amount</span>
              <span className="font-mono font-semibold text-slate-900">
                +{formatCurrency(doc.tax_amount, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 font-bold text-sm text-slate-950">
            <span>Total</span>
            <span className="font-mono text-base text-indigo-700">
              {formatCurrency(doc.total, currency)}
            </span>
          </div>
          {!isQuotation && (
            <>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Amount Paid</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatCurrency((doc as Invoice).amount_paid, currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Balance Due</span>
                <span className="font-mono text-base text-rose-600">
                  {formatCurrency((doc as Invoice).amount_due, currency)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400">
        <p>Generated with InvoiceForge • Professional invoicing & business management</p>
        <p className="mt-1 sm:mt-0 font-medium text-slate-500">Thank you for your business!</p>
      </div>
    </div>
  );
};
