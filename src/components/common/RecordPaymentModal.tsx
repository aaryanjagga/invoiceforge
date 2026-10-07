import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Invoice, PaymentMethod } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { logActivity, createNotification } from '@/services/activityService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}) => {
  const { user, business } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>(String(invoice.amount_due > 0 ? invoice.amount_due : ''));
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (paymentAmount > invoice.amount_due + 0.01) {
      setError(
        `Payment amount cannot exceed the balance due of ${formatCurrency(
          invoice.amount_due,
          business?.currency
        )}.`
      );
      return;
    }

    if (!business?.id || !user?.id || !isSupabaseConfigured()) {
      setError('Database is not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Insert payment record
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .insert({
          business_id: business.id,
          invoice_id: invoice.id,
          amount: paymentAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (payError) throw payError;

      // 2. Recalculate invoice status and balances
      const newAmountPaid = Number((invoice.amount_paid + paymentAmount).toFixed(2));
      const newAmountDue = Math.max(0, Number((invoice.total - newAmountPaid).toFixed(2)));
      const newStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

      const { error: invUpdateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          status: newStatus,
        })
        .eq('id', invoice.id);

      if (invUpdateError) throw invUpdateError;

      // 3. Log activity
      await logActivity({
        businessId: business.id,
        userId: user.id,
        entityType: 'payment',
        entityId: payData.id,
        action: `Payment of ${formatCurrency(paymentAmount, business.currency)} recorded for ${invoice.invoice_number}`,
        metadata: {
          invoice_number: invoice.invoice_number,
          amount: paymentAmount,
          payment_method: paymentMethod,
        },
      });

      // 4. Create notification
      await createNotification({
        businessId: business.id,
        userId: user.id,
        type: 'payment',
        title: 'Payment Recorded',
        message: `Payment of ${formatCurrency(paymentAmount, business.currency)} was recorded for invoice ${invoice.invoice_number}.`,
      });

      onPaymentRecorded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Record Payment
            </h3>
            <p className="text-xs text-slate-500">
              For Invoice <span className="font-mono font-semibold">{invoice.invoice_number}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <span className="text-slate-500 block text-[11px]">Outstanding Due</span>
              <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(invoice.amount_due, business?.currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(String(invoice.amount_due))}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Pay in Full
            </button>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount ({business?.currency || 'INR'}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              max={invoice.amount_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-base font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="cash">Cash</option>
                <option value="card">Card (Debit/Credit)</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI Ref # or UTR #123456"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
