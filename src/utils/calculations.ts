import { InvoiceItem, InvoiceStatus, QuotationItem } from '@/types/database.types';

export interface CalculationTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export const calculateItemTotal = (
  quantity: number,
  unitPrice: number,
  discount = 0,
  taxRate = 0
): { taxAmount: number; lineTotal: number } => {
  const q = Number(quantity) || 0;
  const p = Number(unitPrice) || 0;
  const d = Number(discount) || 0;
  const tr = Number(taxRate) || 0;

  const baseAmount = q * p;
  const taxableAmount = Math.max(0, baseAmount - d);
  const taxAmount = Number(((taxableAmount * tr) / 100).toFixed(2));
  const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

  return { taxAmount, lineTotal };
};

export const calculateInvoiceTotals = (
  items: Array<Partial<InvoiceItem | QuotationItem>>,
  discountType: 'percentage' | 'fixed' = 'percentage',
  discountValue = 0
): CalculationTotals => {
  let subtotal = 0;
  let taxAmount = 0;

  items.forEach((item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unit_price) || 0;
    const d = Number(item.discount) || 0;
    const tr = Number(item.tax_rate) || 0;

    const baseAmount = q * p;
    const taxable = Math.max(0, baseAmount - d);
    const itemTax = (taxable * tr) / 100;

    subtotal += baseAmount;
    taxAmount += itemTax;
  });

  subtotal = Number(subtotal.toFixed(2));
  taxAmount = Number(taxAmount.toFixed(2));

  let discountAmount = 0;
  const dVal = Number(discountValue) || 0;

  if (discountType === 'percentage') {
    discountAmount = Number(((subtotal * dVal) / 100).toFixed(2));
  } else {
    discountAmount = Number(Math.min(subtotal, dVal).toFixed(2));
  }

  const total = Number(Math.max(0, subtotal - discountAmount + taxAmount).toFixed(2));

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
  };
};

export const determineInvoiceStatus = (
  currentStatus: InvoiceStatus,
  dueDateStr: string,
  amountPaid: number,
  total: number
): InvoiceStatus => {
  if (currentStatus === 'cancelled') return 'cancelled';

  const paid = Number(amountPaid) || 0;
  const tot = Number(total) || 0;
  const due = Number((tot - paid).toFixed(2));

  if (tot > 0 && due <= 0) {
    return 'paid';
  }

  if (paid > 0 && due > 0) {
    // Check if partially paid is overdue
    if (isDatePast(dueDateStr)) {
      return 'overdue';
    }
    return 'partially_paid';
  }

  // If due date has passed and there is an outstanding amount
  if (due > 0 && isDatePast(dueDateStr)) {
    return 'overdue';
  }

  return currentStatus === 'paid' ? 'draft' : currentStatus;
};

export const isDatePast = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() < today.getTime();
};
