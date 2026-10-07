import { Customer, Invoice, Payment } from '@/types/database.types';

const downloadBlob = (content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

export const exportCustomersToCsv = (customers: Customer[], filename = 'customers.csv') => {
  const headers = [
    'Name',
    'Company',
    'Email',
    'Phone',
    'Address',
    'City',
    'State',
    'Country',
    'Postal Code',
    'GSTIN',
    'PAN',
    'Notes',
    'Created At',
  ];

  const rows = customers.map((c) => [
    escapeCsv(c.name),
    escapeCsv(c.company || ''),
    escapeCsv(c.email || ''),
    escapeCsv(c.phone || ''),
    escapeCsv(c.address || ''),
    escapeCsv(c.city || ''),
    escapeCsv(c.state || ''),
    escapeCsv(c.country || ''),
    escapeCsv(c.postal_code || ''),
    escapeCsv(c.gstin || ''),
    escapeCsv(c.pan || ''),
    escapeCsv(c.notes || ''),
    escapeCsv(c.created_at),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename);
};

export const exportInvoicesToCsv = (invoices: Invoice[], filename = 'invoices.csv') => {
  const headers = [
    'Invoice Number',
    'Customer',
    'Invoice Date',
    'Due Date',
    'Status',
    'Subtotal',
    'Discount',
    'Tax Amount',
    'Total',
    'Amount Paid',
    'Amount Due',
    'Payment Terms',
    'Created At',
  ];

  const rows = invoices.map((inv) => [
    escapeCsv(inv.invoice_number),
    escapeCsv(inv.customer?.name || ''),
    escapeCsv(inv.invoice_date),
    escapeCsv(inv.due_date),
    escapeCsv(inv.status),
    escapeCsv(inv.subtotal),
    escapeCsv(inv.discount_amount),
    escapeCsv(inv.tax_amount),
    escapeCsv(inv.total),
    escapeCsv(inv.amount_paid),
    escapeCsv(inv.amount_due),
    escapeCsv(inv.payment_terms),
    escapeCsv(inv.created_at),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename);
};

export const exportPaymentsToCsv = (payments: Payment[], filename = 'payments.csv') => {
  const headers = [
    'Payment ID',
    'Invoice Number',
    'Customer',
    'Amount',
    'Payment Date',
    'Payment Method',
    'Reference Number',
    'Notes',
    'Created At',
  ];

  const rows = payments.map((p) => [
    escapeCsv(p.id),
    escapeCsv(p.invoice?.invoice_number || ''),
    escapeCsv(p.invoice?.customer?.name || ''),
    escapeCsv(p.amount),
    escapeCsv(p.payment_date),
    escapeCsv(p.payment_method),
    escapeCsv(p.reference_number || ''),
    escapeCsv(p.notes || ''),
    escapeCsv(p.created_at),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename);
};
