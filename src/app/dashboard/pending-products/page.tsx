'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

interface ProductItem {
  _id: string;
  shopId?: string;
  shopName?: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  gauge?: string;
  weight?: string;
  purchasePrice?: number;
  purchaseDate?: string | null;
  tax?: number;
  transportationCost?: number;
  purchaseDetailsStatus?: 'complete' | 'pending';
  purchaseDetailsMissingFields?: string[];
  mfgDate?: string | null;
  expiryDate?: string | null;
  createdAt: string;
}

interface ProductsResponse {
  products: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface EditState {
  name: string;
  sku: string;
  description: string;
  price: string;
  gauge: string;
  weight: string;
  purchasePrice: string;
  purchaseDate: string;
  tax: string;
  transportationCost: string;
  mfgDate: string;
  expiryDate: string;
}

const EMPTY_EDIT: EditState = {
  name: '',
  sku: '',
  description: '',
  price: '',
  gauge: '',
  weight: '',
  purchasePrice: '',
  purchaseDate: '',
  tax: '',
  transportationCost: '',
  mfgDate: '',
  expiryDate: '',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().split('T')[0] : '';
}

export default function PendingProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editTarget, setEditTarget] = useState<ProductItem | null>(null);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        sort: 'createdAt',
        dir: 'desc',
        purchaseDetailsStatus: 'pending',
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });

      const res = await fetch(`/api/products?${params.toString()}`, { credentials: 'include' });
      const data = (await res.json()) as ProductsResponse;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load pending products.');

      setProducts(data.products ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalCount(data.pagination?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const summary = useMemo(() => {
    const fieldCounts = {
      purchasePrice: 0,
      purchaseDate: 0,
      tax: 0,
      transportationCost: 0,
    };

    products.forEach(product => {
      (product.purchaseDetailsMissingFields ?? []).forEach(field => {
        if (field in fieldCounts) {
          fieldCounts[field as keyof typeof fieldCounts] += 1;
        }
      });
    });

    return fieldCounts;
  }, [products]);

  const openEdit = (product: ProductItem) => {
    setEditTarget(product);
    setEditState({
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      price: String(product.price ?? ''),
      gauge: product.gauge ?? '',
      weight: product.weight ?? '',
      purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : '',
      purchaseDate: toDateInput(product.purchaseDate),
      tax: product.tax != null ? String(product.tax) : '',
      transportationCost: product.transportationCost != null ? String(product.transportationCost) : '',
      mfgDate: toDateInput(product.mfgDate),
      expiryDate: toDateInput(product.expiryDate),
    });
    setEditErrors({});
    setSaveError('');
  };

  const validateEdit = () => {
    const errors: Partial<Record<keyof EditState, string>> = {};

    if (!editState.name.trim()) errors.name = 'Name is required.';
    if (!editState.sku.trim()) errors.sku = 'SKU is required.';
    if (!editState.gauge.trim()) errors.gauge = 'Gauge is required.';
    if (!editState.weight.trim()) errors.weight = 'Weight is required.';

    const price = Number(editState.price);
    if (!editState.price.trim() || Number.isNaN(price) || price < 0) errors.price = 'Enter a valid price.';

    const purchasePrice = Number(editState.purchasePrice);
    if (!editState.purchasePrice.trim() || Number.isNaN(purchasePrice) || purchasePrice < 0) errors.purchasePrice = 'Purchase price is required.';
    if (!editState.purchaseDate) errors.purchaseDate = 'Purchase date is required.';

    const tax = Number(editState.tax);
    if (!editState.tax.trim() || Number.isNaN(tax) || tax < 0) errors.tax = 'Tax amount is required.';

    const transportationCost = Number(editState.transportationCost);
    if (!editState.transportationCost.trim() || Number.isNaN(transportationCost) || transportationCost < 0) {
      errors.transportationCost = 'Transportation cost is required.';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!editTarget || !validateEdit()) return;

    setSaving(true);
    setSaveError('');

    try {
      const res = await fetch(`/api/products/${editTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editState.name.trim(),
          sku: editState.sku.trim(),
          description: editState.description.trim(),
          price: Number(editState.price),
          gauge: editState.gauge.trim(),
          weight: editState.weight.trim(),
          purchasePrice: Number(editState.purchasePrice),
          purchaseDate: editState.purchaseDate,
          tax: Number(editState.tax),
          transportationCost: Number(editState.transportationCost),
          mfgDate: editState.mfgDate || null,
          expiryDate: editState.expiryDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to update product.');
      }

      setEditTarget(null);
      setEditState(EMPTY_EDIT);
      await fetchProducts();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout activeRoute="/dashboard/pending-products">
      <div className="space-y-6 animate-fade-in">
        <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Superadmin Follow-up</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Pending Product Details</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">Shop admins can add products even when purchase details are not available. Use this page to complete missing cost and GST information later.</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchProducts()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Icon name="ArrowPathIcon" size={18} />
              Refresh List
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Pending Products', value: totalCount, icon: 'CubeIcon' },
            { label: 'Missing Price', value: summary.purchasePrice, icon: 'BanknotesIcon' },
            { label: 'Missing GST', value: summary.tax, icon: 'ReceiptPercentIcon' },
            { label: 'Missing Transport', value: summary.transportationCost, icon: 'TruckIcon' },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{loading ? '—' : card.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={20} />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900">Products waiting for costing details</h2>
              <p className="text-sm text-slate-500">Complete purchase price, purchase date, tax, and transportation cost.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by product, SKU, or notes…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {error && (
            <div className="mx-5 my-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 shrink-0" />
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Shop</th>
                  <th className="px-5 py-3">Missing Fields</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Added</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      {Array.from({ length: 6 }).map((__, cell) => (
                        <td key={cell} className="px-5 py-4"><div className="h-3 w-full max-w-[140px] rounded bg-slate-100" /></td>
                      ))}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-slate-500">
                      No pending products found.
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Pending
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-400">{product.sku}</p>
                          {product.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{product.shopName || product.shopId || 'Unknown shop'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(product.purchaseDetailsMissingFields ?? []).map(field => (
                            <span key={field} className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              {field}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{product.availableQty.toLocaleString()} available</p>
                        <p className="text-xs text-slate-400">{product.totalQty.toLocaleString()} total</p>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(product.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          <Icon name="PencilSquareIcon" size={15} />
                          Complete Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <p className="text-xs text-slate-500">
              Showing {totalCount === 0 ? 0 : (page - 1) * 25 + 1}–{Math.min(page * 25, totalCount)} of {totalCount} pending products
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page === 1 || loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                disabled={page === totalPages || loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Complete Product Details</h3>
                <p className="text-sm text-slate-500">{editTarget.name} · {editTarget.shopName || editTarget.shopId || 'Unknown shop'}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              {saveError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <Icon name="ExclamationCircleIcon" size={15} className="text-red-500 shrink-0" />
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { key: 'name', label: 'Product Name', required: true },
                  { key: 'sku', label: 'SKU', required: true },
                  { key: 'price', label: 'Selling Price (₹)', required: true, type: 'number' },
                  { key: 'gauge', label: 'Gauge', required: true },
                  { key: 'weight', label: 'Weight', required: true },
                  { key: 'purchasePrice', label: 'Purchase Price (₹)', required: true, type: 'number' },
                  { key: 'purchaseDate', label: 'Purchase Date', required: true, type: 'date' },
                  { key: 'tax', label: 'Tax (₹)', required: true, type: 'number' },
                  { key: 'transportationCost', label: 'Transportation Cost (₹)', required: true, type: 'number' },
                  { key: 'mfgDate', label: 'MFG Date', type: 'date' },
                  { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type ?? 'text'}
                      value={editState[field.key as keyof EditState]}
                      onChange={e => setEditState(current => ({ ...current, [field.key]: e.target.value }))}
                      className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${editErrors[field.key as keyof EditState] ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    {editErrors[field.key as keyof EditState] && (
                      <p className="mt-1 text-xs text-red-500">{editErrors[field.key as keyof EditState]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  rows={3}
                  value={editState.description}
                  onChange={e => setEditState(current => ({ ...current, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
