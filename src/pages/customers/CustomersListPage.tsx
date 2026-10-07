import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Download,
  Mail,
  Phone,
  Building,
  ArrowRight,
  Eye,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Customer, Invoice } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { exportCustomersToCsv } from '@/utils/exportCsv';
import { EmptyState } from '@/components/common/EmptyState';
import { CreateCustomerModal } from '@/components/common/CreateCustomerModal';

export const CustomersListPage: React.FC = () => {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCustomersData = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [custRes, invRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('business_id', business.id)
          .order('name', { ascending: true }),
        supabase
          .from('invoices')
          .select('id, customer_id, total, amount_due, status')
          .eq('business_id', business.id),
      ]);

      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (invRes.data) setInvoices(invRes.data as Invoice[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersData();
  }, [business?.id]);

  // Compute customer outstanding and overdue stats
  const customerStatsMap = useMemo(() => {
    const map: Record<string, { totalBilled: number; outstanding: number; invoiceCount: number }> =
      {};

    invoices.forEach((inv) => {
      if (!inv.customer_id) return;
      if (!map[inv.customer_id]) {
        map[inv.customer_id] = { totalBilled: 0, outstanding: 0, invoiceCount: 0 };
      }
      map[inv.customer_id].totalBilled += Number(inv.total) || 0;
      map[inv.customer_id].outstanding += Number(inv.amount_due) || 0;
      map[inv.customer_id].invoiceCount += 1;
    });

    return map;
  }, [invoices]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const currency = business?.currency || 'INR';

  const handleExportCsv = () => {
    exportCustomersToCsv(
      filteredCustomers,
      `customers_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleDelete = async (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete customer "${cust.name}"? Historical invoices will safely retain their records.`
      )
    ) {
      return;
    }
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from('customers').delete().eq('id', cust.id);
      setCustomers((prev) => prev.filter((c) => c.id !== cust.id));
    } catch (err) {
      alert('Unable to delete customer');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading customer directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Customers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Client contacts, billing addresses, GSTIN credentials, and payment history
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {customers.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Customer
          </button>
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your clients to bill them, send reminders, and track financial history."
          actionText="Add First Customer"
          onActionClick={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <>
          {/* Search */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, company, email, phone..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400 pr-2">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'client' : 'clients'}
            </span>
          </div>

          {/* Customer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((cust) => {
              const stats = customerStatsMap[cust.id] || {
                totalBilled: 0,
                outstanding: 0,
                invoiceCount: 0,
              };

              return (
                <div
                  key={cust.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="truncate">
                        <Link
                          to={`/customers/${cust.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 transition truncate block"
                        >
                          {cust.name}
                        </Link>
                        {cust.company && (
                          <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            {cust.company}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleDelete(cust, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                      {cust.email && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.email}</span>
                        </p>
                      )}
                      {cust.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cust.phone}</span>
                        </p>
                      )}
                      {cust.city && (
                        <p className="text-slate-400 truncate">
                          {[cust.city, cust.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {cust.gstin && (
                        <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                          GSTIN: {cust.gstin}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Outstanding</span>
                      <span
                        className={`font-mono font-bold ${
                          stats.outstanding > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {formatCurrency(stats.outstanding, currency)}
                      </span>
                    </div>

                    <Link
                      to={`/customers/${cust.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                    >
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCustomerCreated={() => {
          fetchCustomersData();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};
