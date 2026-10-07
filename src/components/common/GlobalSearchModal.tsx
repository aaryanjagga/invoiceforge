import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Users, Package, FileCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    invoices: Array<{ id: string; invoice_number: string; total: number; status: string; customer?: { name: string } }>;
    quotations: Array<{ id: string; quote_number: string; total: number; status: string }>;
    customers: Array<{ id: string; name: string; company: string | null; email: string | null }>;
    products: Array<{ id: string; name: string; price: number; type: string }>;
  }>({
    invoices: [],
    quotations: [],
    customers: [],
    products: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ invoices: [], quotations: [], customers: [], products: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !business?.id || !isSupabaseConfigured()) {
      setResults({ invoices: [], quotations: [], customers: [], products: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const ilikeQuery = `%${trimmed}%`;

        const [invRes, quoteRes, custRes, prodRes] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, total, status, customer:customers(name)')
            .eq('business_id', business.id)
            .ilike('invoice_number', ilikeQuery)
            .limit(5),
          supabase
            .from('quotations')
            .select('id, quote_number, total, status')
            .eq('business_id', business.id)
            .ilike('quote_number', ilikeQuery)
            .limit(5),
          supabase
            .from('customers')
            .select('id, name, company, email')
            .eq('business_id', business.id)
            .or(`name.ilike.${ilikeQuery},company.ilike.${ilikeQuery},email.ilike.${ilikeQuery}`)
            .limit(5),
          supabase
            .from('products')
            .select('id, name, price, type')
            .eq('business_id', business.id)
            .ilike('name', ilikeQuery)
            .limit(5),
        ]);

        setResults({
          invoices: (invRes.data as unknown as typeof results.invoices) || [],
          quotations: (quoteRes.data as unknown as typeof results.quotations) || [],
          customers: custRes.data || [],
          products: prodRes.data || [],
        });
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, business?.id]);

  if (!isOpen) return null;

  const totalHits =
    results.invoices.length +
    results.quotations.length +
    results.customers.length +
    results.products.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoices, quotations, customers, or products..."
            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mr-2 shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="p-4 overflow-y-auto space-y-6 text-xs">
          {query.trim().length > 0 && !loading && totalHits === 0 && (
            <div className="py-8 text-center text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.trim().length === 0 && (
            <div className="py-8 text-center text-slate-400">
              Type a customer name, invoice number, or product to search instantly.
            </div>
          )}

          {/* Customers */}
          {results.customers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-2">
                <Users className="w-3.5 h-3.5" />
                <span>Customers</span>
              </div>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onClose();
                      navigate(`/customers/${c.id}`);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-slate-500 text-[11px]">
                        {[c.company, c.email].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </div>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      onClose();
                      navigate(`/invoices/${inv.id}`);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition cursor-pointer"
                  >
                    <div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoice_number}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {inv.customer?.name || 'Customer'} • {formatCurrency(inv.total, business?.currency)}
                      </p>
                    </div>
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {inv.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quotations */}
          {results.quotations.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-2">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Quotations</span>
              </div>
              <div className="space-y-1">
                {results.quotations.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      onClose();
                      navigate(`/quotations/${q.id}`);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition cursor-pointer"
                  >
                    <p className="font-mono font-bold text-slate-900 dark:text-white">
                      {q.quote_number}
                    </p>
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {q.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-2">
                <Package className="w-3.5 h-3.5" />
                <span>Products & Services</span>
              </div>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onClose();
                      navigate(`/products`);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition cursor-pointer"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(p.price, business?.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
