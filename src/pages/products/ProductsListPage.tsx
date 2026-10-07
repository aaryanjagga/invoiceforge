import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Product, ProductType } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { EmptyState } from '@/components/common/EmptyState';
import { logActivity } from '@/services/activityService';

export const ProductsListPage: React.FC = () => {
  const { user, business } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    type: 'service' as ProductType,
    price: 0,
    tax_rate: business?.default_tax_rate || 18,
    unit: 'hrs',
  });

  const fetchProducts = async () => {
    if (!business?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true });

      if (!error && data) {
        setProducts(data as Product[]);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [business?.id]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      sku: '',
      type: 'service',
      price: 0,
      tax_rate: business?.default_tax_rate || 18,
      unit: 'hrs',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      description: prod.description || '',
      sku: prod.sku || '',
      type: prod.type,
      price: Number(prod.price),
      tax_rate: Number(prod.tax_rate),
      unit: prod.unit,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !user?.id || !isSupabaseConfigured()) return;
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const payload = {
        business_id: business.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        type: formData.type,
        price: Number(formData.price) || 0,
        tax_rate: Number(formData.tax_rate) || 0,
        unit: formData.unit.trim() || 'unit',
      };

      if (editingProduct) {
        const { error: updErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);

        if (updErr) throw updErr;
      } else {
        const { data: insData, error: insErr } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

        if (insErr) throw insErr;

        await logActivity({
          businessId: business.id,
          userId: user.id,
          entityType: 'product',
          entityId: insData.id,
          action: `Added ${formData.type} "${formData.name}"`,
        });
      }

      await fetchProducts();
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unable to save product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete "${prod.name}"?`)) return;
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from('products').delete().eq('id', prod.id);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    } catch (err) {
      alert('Unable to delete item');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, typeFilter]);

  const currency = business?.currency || 'INR';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading product catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Products & Services
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Preconfigure item rates, units, and tax rates for fast invoicing
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Product / Service
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products or services yet"
          description="Add items you sell or services you provide to auto-populate invoice rows."
          actionText="Add First Item"
          onActionClick={openCreateModal}
        />
      ) : (
        <>
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, description, SKU..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              {(['all', 'service', 'product'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-right">Tax Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">{p.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            p.type === 'service'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{p.sku || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.price, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">{p.unit}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {p.tax_rate > 0 ? `${p.tax_rate}%` : '0%'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Item' : 'New Product / Service'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Item Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="service">Service</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">SKU / Code (Optional)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. SRV-01"
                    className="w-full font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Web Development Consulting"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed breakdown of the deliverable or specifications"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Price ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="hrs / unit"
                    className="w-full text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                    className="w-full font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-1.5 rounded bg-indigo-600 text-white font-bold cursor-pointer"
                >
                  {formLoading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
