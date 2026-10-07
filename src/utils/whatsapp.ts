import { formatCurrency, formatDate } from './formatters';
import { Invoice, Quotation } from '@/types/database.types';

export const cleanPhoneForWhatsApp = (phone?: string | null): string => {
  if (!phone) return '';
  // Strip spaces, dashes, parentheses
  const cleaned = phone.replace(/[^\d+]/g, '');
  // If no + and 10 digits (India standard), prefix 91
  if (/^\d{10}$/.test(cleaned)) {
    return `91${cleaned}`;
  }
  return cleaned.replace(/^\+/, '');
};

export const generateInvoiceWhatsAppUrl = (
  invoice: Invoice,
  businessName: string,
  currency = 'INR'
): string => {
  const customerName = invoice.customer?.name || 'Customer';
  const phone = cleanPhoneForWhatsApp(invoice.customer?.phone);
  const formattedTotal = formatCurrency(invoice.total, currency);
  const formattedDue = formatCurrency(invoice.amount_due, currency);
  const formattedDueDate = formatDate(invoice.due_date);

  const lines = [
    `Hello ${customerName},`,
    ``,
    `Here is invoice *${invoice.invoice_number}* from *${businessName}*.`,
    `Total: *${formattedTotal}*`,
    `Amount Due: *${formattedDue}*`,
    `Due Date: ${formattedDueDate}`,
  ];

  if (invoice.upi_id) {
    lines.push(`Pay via UPI: ${invoice.upi_id}`);
  }

  if (invoice.bank_details?.account_number) {
    lines.push(
      `Bank: ${invoice.bank_details.bank_name || ''} (A/C: ${invoice.bank_details.account_number}, IFSC: ${invoice.bank_details.ifsc_code || ''})`
    );
  }

  lines.push(``, `Please let us know once the payment is completed. Thank you!`);

  const message = encodeURIComponent(lines.join('\n'));
  return phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
};

export const generatePaymentReminderWhatsAppUrl = (
  invoice: Invoice,
  businessName: string,
  currency = 'INR'
): string => {
  const customerName = invoice.customer?.name || 'Customer';
  const phone = cleanPhoneForWhatsApp(invoice.customer?.phone);
  const formattedDue = formatCurrency(invoice.amount_due, currency);
  const formattedDueDate = formatDate(invoice.due_date);

  const lines = [
    `Hello ${customerName},`,
    ``,
    `This is a friendly reminder that invoice *${invoice.invoice_number}* for *${formattedDue}* is currently outstanding.`,
    `Due Date: ${formattedDueDate}`,
  ];

  if (invoice.upi_id) {
    lines.push(`Pay via UPI: ${invoice.upi_id}`);
  }

  lines.push(``, `Please let us know if you need any information.`, `Thank you! - ${businessName}`);

  const message = encodeURIComponent(lines.join('\n'));
  return phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
};

export const generateQuotationWhatsAppUrl = (
  quotation: Quotation,
  businessName: string,
  currency = 'INR'
): string => {
  const customerName = quotation.customer?.name || 'Customer';
  const phone = cleanPhoneForWhatsApp(quotation.customer?.phone);
  const formattedTotal = formatCurrency(quotation.total, currency);
  const formattedExpiry = formatDate(quotation.expiry_date);

  const lines = [
    `Hello ${customerName},`,
    ``,
    `Here is quotation *${quotation.quote_number}* from *${businessName}* for *${formattedTotal}*.`,
    `Valid until: ${formattedExpiry}`,
    ``,
    `Please review and let us know if you would like to proceed or have any questions.`,
    ``,
    `Thank you! - ${businessName}`,
  ];

  const message = encodeURIComponent(lines.join('\n'));
  return phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
};
