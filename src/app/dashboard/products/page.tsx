'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  _id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  createdAt: string;
}

interface Stats {
  totalProducts: number;
  totalUnits: number;
  availableUnits: number;
  catalogValue: number;
}

interface FormState {
  name: string;
  quantity: string;
  price: string;
  description: string;
  sku: string;
  skuMode: 'auto' | 'manual';
}

interface EditState {
  name: string;
  price: string;
  totalQty: string;
  availableQty: string;
  description: string;
  sku: string;
}

type SortKey = 'name' | 'price' | 'totalQty' | 'availableQty' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface ShopOption {
  _id: string;
  name: string;
  location: string;
}

interface PrintTarget {
  productId: string;
  productName: string;
  sku: string;
  qty: number;          // units added this time (for barcodes to print)
  totalQty: number;     // new running total
  price: number;
  barcodePrintUrl: string;
  restocked: boolean;   // true = added to existing product
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  name: '',
  quantity: '',
  price: '',
  description: '',
  sku: '',
  skuMode: 'auto',
};

const PAGE_SIZE = 50;

const inputBase =
  'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all';

const labelBase = 'block text-xs font-semibold text-slate-600 mb-1';

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelBase}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function ProductsPage() {
  // ── Shop state ────────────────────────────────────────────────────────────
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');

  // ── Data state ────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalUnits: 0, availableUnits: 0, catalogValue: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ── Table state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [apiError, setApiError] = useState('');

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', price: '', totalQty: '', availableQty: '', description: '', sku: '' });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditState, string>>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editApiError, setEditApiError] = useState('');

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Print barcodes modal ───────────────────────────────────────────────────
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);

  // ── Name autocomplete ─────────────────────────────────────────────────────
  const [nameSuggestions, setNameSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const firstFieldRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Name suggestions fetch (debounced 250ms) ──────────────────────────────
  const fetchNameSuggestions = useCallback((query: string) => {
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    if (!query.trim()) { setNameSuggestions([]); setShowSuggestions(false); return; }
    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(query)}&limit=8&sort=name&dir=asc`,
          { credentials: 'include' },
        );
        if (!res.ok) return;
        const data = await res.json();
        setNameSuggestions(data.products ?? []);
        setShowSuggestions((data.products ?? []).length > 0);
      } catch { /* silent */ }
    }, 250);
  }, []);
  // ── Fetch available shops ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/shops', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const list: ShopOption[] = (data.items ?? []).map((s: ShopOption) => ({
          _id: s._id,
          name: s.name,
          location: s.location,
        }));
        setShops(list);
        if (list.length > 0 && !selectedShopId) setSelectedShopId(list[0]._id);
      })
      .catch(() => setShops([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // ── Fetch products from API ───────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: sortKey,
        dir: sortDir,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/products?${params}`, { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to load products.');
      }
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalCount(data.pagination?.total ?? 0);
      setStats(data.stats ?? { totalProducts: 0, totalUnits: 0, availableUnits: 0, catalogValue: 0 });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setIsLoading(false);
    }
  }, [page, sortKey, sortDir, debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) setSortDir((d: SortDir) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined }));
    setApiError('');
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!selectedShopId) { setApiError('Please select a shop before adding a product.'); return false; }
    if (!form.name.trim()) errors.name = 'Product name is required.';
    const qty = Number(form.quantity);
    if (!form.quantity || isNaN(qty) || qty < 1) errors.quantity = 'Enter a valid quantity (≥ 1).';
    const price = Number(form.price);
    if (!form.price || isNaN(price) || price < 0) errors.price = 'Enter a valid price.';
    if (form.skuMode === 'manual' && !form.sku.trim()) errors.sku = 'Enter a SKU or switch to Auto.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Add product ───────────────────────────────────────────────────────────
  const handleAddProduct = useCallback(async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setApiError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shopId: selectedShopId,
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          quantity: Number(form.quantity),
          sku: form.skuMode === 'manual' ? form.sku.trim() : '',
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setApiError(body.error ?? 'Failed to create product.');
        return;
      }
      setForm(EMPTY_FORM);
      setFormErrors({});
      // Show the print-barcodes modal immediately
      const addedQty = Number(form.quantity);
      setPrintTarget({
        productId: body.product._id,
        productName: body.product.name,
        sku: body.product.sku,
        qty: addedQty,
        totalQty: body.product.totalQty,
        price: body.product.price,
        barcodePrintUrl: body.barcodePrintUrl,
        restocked: body.restocked ?? false,
      });
      // Refresh list in the background
      setPage(1);
      setSortKey('createdAt');
      setSortDir('desc');
      fetchProducts();
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, fetchProducts, selectedShopId]);

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (p: Product) => {
    setEditTarget(p);
    setEditState({
      name: p.name,
      price: String(p.price),
      totalQty: String(p.totalQty),
      availableQty: String(p.availableQty),
      description: p.description,
      sku: p.sku,
    });
    setEditErrors({});
    setEditApiError('');
  };

  const openReprint = (p: Product) => {
    setPrintTarget({
      productId: p._id,
      productName: p.name,
      sku: p.sku,
      qty: p.totalQty,
      totalQty: p.totalQty,
      price: p.price,
      barcodePrintUrl: `/api/products/${p._id}/barcodes`,
      restocked: false,
    });
  };

  const validateEdit = (): boolean => {
    const errors: Partial<Record<keyof EditState, string>> = {};
    if (!editState.name.trim()) errors.name = 'Required.';
    const p = Number(editState.price);
    if (isNaN(p) || p < 0) errors.price = 'Invalid price.';
    const tq = Number(editState.totalQty);
    if (isNaN(tq) || tq < 0) errors.totalQty = 'Invalid.';
    const aq = Number(editState.availableQty);
    if (isNaN(aq) || aq < 0 || aq > tq) errors.availableQty = 'Must be ≤ total qty.';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !validateEdit()) return;
    setIsSavingEdit(true);
    setEditApiError('');
    try {
      const res = await fetch(`/api/products/${editTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editState.name.trim(),
          description: editState.description.trim(),
          price: Number(editState.price),
          totalQty: Number(editState.totalQty),
          availableQty: Number(editState.availableQty),
          sku: editState.sku.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setEditApiError(body.error ?? 'Failed to update product.');
        return;
      }
      // Optimistically patch local list so UI feels instant
      setProducts(prev =>
        prev.map(p => (p._id === editTarget._id ? { ...p, ...body.product } : p)),
      );
      // Also refresh stats
      fetchProducts();
      setEditTarget(null);
    } catch {
      setEditApiError('Network error. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? 'Failed to delete product.');
        return;
      }
      setDeleteTarget(null);
      // Go back a page if we deleted the last item on a non-first page
      const newCount = totalCount - 1;
      const newPages = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      if (page > newPages) setPage(newPages);
      else await fetchProducts();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const safePage = Math.min(page, Math.max(1, totalPages));

  // ── Sort icon ─────────────────────────────────────────────────────────────
  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout activeRoute="/products">
      <div className="space-y-6 animate-fade-in">

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">Add and manage your full product inventory</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Products', value: stats.totalProducts, icon: 'CubeIcon', color: 'indigo', sub: 'Unique SKUs' },
            { label: 'Total Units', value: stats.totalUnits.toLocaleString(), icon: 'ArchiveBoxIcon', color: 'violet', sub: 'All stock' },
            { label: 'Available Units', value: stats.availableUnits.toLocaleString(), icon: 'CheckCircleIcon', color: 'emerald', sub: 'Ready to sell' },
            {
              label: 'Catalog Value',
              value: stats.catalogValue >= 1000
                ? `₹${(stats.catalogValue / 1000).toFixed(1)}k`
                : `₹${stats.catalogValue.toFixed(2)}`,
              icon: 'CurrencyRupeeIcon',
              color: 'indigo',
              sub: 'Available stock value',
            },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 flex items-center justify-center`}>
                  <Icon name={card.icon} size={16} className={`text-${card.color}-600`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Add Product Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Icon name="PlusCircleIcon" size={17} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Add New Product</h2>
              <p className="text-xs text-slate-400">Fill in the details below and click Add Product</p>
            </div>
          </div>

          <div className="px-6 py-5">
            {successMsg && (
              <div className="mb-4 flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700">
                <Icon name="CheckCircleIcon" size={16} className="text-emerald-500 shrink-0" />
                {successMsg}
              </div>
            )}
            {apiError && (
              <div className="mb-4 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 shrink-0" />
                {apiError}
              </div>
            )}

            {/* Shop selector */}
            <div className="mb-4">
              <FormField label="Assign to Shop" required>
                {shops.length === 0 ? (
                  <div className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-400 select-none">
                    Loading shops…
                  </div>
                ) : (
                  <select
                    value={selectedShopId}
                    onChange={e => setSelectedShopId(e.target.value)}
                    className={inputBase}
                  >
                    {shops.map(s => (
                      <option key={s._id} value={s._id}>{s.name} — {s.location}</option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <FormField label="Product Name" required>
                <div className="relative">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="e.g. Samsung 55″ QLED TV"
                    value={form.name}
                    autoComplete="off"
                    onChange={e => {
                      setField('name', e.target.value);
                      fetchNameSuggestions(e.target.value);
                    }}
                    onFocus={() => { if (nameSuggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className={`${inputBase} ${formErrors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                  />
                  {showSuggestions && nameSuggestions.length > 0 && (
                    <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                      {nameSuggestions.map(s => (
                        <li
                          key={s._id}
                          onMouseDown={() => {
                            setField('name', s.name);
                            if (s.description) setField('description', s.description);
                            setField('price', String(s.price));
                            setShowSuggestions(false);
                            setNameSuggestions([]);
                            setTimeout(() => quantityInputRef.current?.focus(), 50);
                          }}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 cursor-pointer group transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 truncate">{s.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{s.sku}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xs font-semibold text-slate-600">₹{s.price.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">{s.totalQty} in stock</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {formErrors.name && <p className="mt-1 text-[11px] text-red-500">{formErrors.name}</p>}
              </FormField>

              <FormField label="Product Price (₹)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  className={`${inputBase} ${formErrors.price ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                />
                {formErrors.price && <p className="mt-1 text-[11px] text-red-500">{formErrors.price}</p>}
              </FormField>

              <FormField label="Quantity (units)" required>
                <input
                  ref={quantityInputRef}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 100"
                  value={form.quantity}
                  onChange={e => setField('quantity', e.target.value)}
                  className={`${inputBase} ${formErrors.quantity ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                />
                {formErrors.quantity && <p className="mt-1 text-[11px] text-red-500">{formErrors.quantity}</p>}
              </FormField>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="sm:col-span-2">
                <FormField label="Product Description">
                  <textarea
                    rows={2}
                    placeholder="Optional — size, colour, variant details…"
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    className={`${inputBase} resize-none`}
                  />
                </FormField>
              </div>

              <div>
                <label className={labelBase}>
                  SKU Code
                  <span className="ml-2 inline-flex rounded-lg overflow-hidden border border-slate-200 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setField('skuMode', 'auto')}
                      className={`px-2 py-0.5 transition-colors ${form.skuMode === 'auto' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('skuMode', 'manual')}
                      className={`px-2 py-0.5 transition-colors ${form.skuMode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      Manual
                    </button>
                  </span>
                </label>
                {form.skuMode === 'auto' ? (
                  <div className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono select-none">
                    Auto-generated on save
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="e.g. MY-SKU-0042"
                      value={form.sku}
                      onChange={e => setField('sku', e.target.value.toUpperCase())}
                      className={`${inputBase} font-mono ${formErrors.sku ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                    />
                    {formErrors.sku && <p className="mt-1 text-[11px] text-red-500">{formErrors.sku}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Submit row */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddProduct}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="PlusIcon" size={16} className="text-white" />
                )}
                Add Product
              </button>
              <button
                type="button"
                onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setApiError(''); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Clear
              </button>
              <p className="text-xs text-slate-400 ml-1">
                Unique barcodes are generated internally for each unit.
              </p>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* List header */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Product Inventory</h3>
              <p className="text-xs text-slate-400 mt-0.5">{totalCount.toLocaleString()} product{totalCount !== 1 ? 's' : ''} total</p>
            </div>
            <div className="relative w-60">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or SKU…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Icon name="XMarkIcon" size={13} />
                </button>
              )}
            </div>
            <button
              onClick={() => fetchProducts()}
              disabled={isLoading}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-40"
              title="Refresh"
            >
              <Icon name="ArrowPathIcon" size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Error */}
          {loadError && (
            <div className="flex items-center gap-2.5 px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
              <Icon name="ExclamationCircleIcon" size={15} className="text-red-500 shrink-0" />
              {loadError}
              <button onClick={fetchProducts} className="ml-auto text-xs font-semibold underline">Retry</button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {([
                    { key: 'sku',          label: 'SKU',           sortable: false },
                    { key: 'name',         label: 'Product Name',  sortable: true  },
                    { key: 'price',        label: 'Price',         sortable: true  },
                    { key: 'totalQty',     label: 'Total Qty',     sortable: true  },
                    { key: 'availableQty', label: 'Available Qty', sortable: true  },
                    { key: 'createdAt',    label: 'Added',         sortable: true  },
                    { key: 'actions',      label: '',              sortable: false },
                  ] as { key: string; label: string; sortable: boolean }[]).map(col => (
                    <th
                      key={`th-${col.key}`}
                      onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap
                        ${col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''}
                        ${col.key === 'name' ? 'min-w-[200px]' : ''}
                        ${col.key === 'sku' ? 'pl-5' : ''}
                      `}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && <SortIcon col={col.key as SortKey} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="pl-5 pr-4 py-3"><div className="h-3 w-20 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-40 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-14 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-10 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-10 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-20 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-12 bg-slate-100 rounded" /></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Icon name="CubeIcon" size={22} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No products found</p>
                        <p className="text-xs text-slate-400">
                          {search ? 'Try a different search term.' : 'Add your first product using the form above.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map(product => {
                    const stockPct = product.totalQty > 0 ? product.availableQty / product.totalQty : 0;
                    const stockColor =
                      product.availableQty === 0 ? 'text-red-600'
                      : stockPct < 0.2 ? 'text-amber-600'
                      : 'text-emerald-600';

                    return (
                      <tr key={product._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="pl-5 pr-4 py-3">
                          <span className="text-[11px] font-mono text-slate-400">{product.sku}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                              <Icon name="CubeIcon" size={14} className="text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate max-w-[240px]">{product.name}</p>
                              {product.description && (
                                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{product.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                          ₹{product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 tabular-nums">
                          {product.totalQty.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold tabular-nums ${stockColor}`}>
                              {product.availableQty.toLocaleString()}
                            </span>
                            {product.availableQty === 0 && (
                              <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Out</span>
                            )}
                            {product.availableQty > 0 && stockPct < 0.2 && (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">Low</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(product.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEdit(product)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                              title="Edit product"
                            >
                              <Icon name="PencilSquareIcon" size={15} />
                            </button>
                            <button
                              onClick={() => openReprint(product)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all"
                              title="Print barcodes"
                            >
                              <Icon name="PrinterIcon" size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                              title="Delete product"
                            >
                              <Icon name="TrashIcon" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Showing{' '}
              <span className="font-medium text-slate-600">
                {totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, totalCount)}
              </span>{' '}
              of <span className="font-medium text-slate-600">{totalCount.toLocaleString()}</span> products
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1 || isLoading}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pg: number;
                if (totalPages <= 7) pg = i + 1;
                else if (safePage <= 4) pg = i + 1;
                else if (safePage >= totalPages - 3) pg = totalPages - 6 + i;
                else pg = safePage - 3 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                      ${safePage === pg
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'text-slate-500 border-slate-200 hover:bg-white disabled:opacity-40'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages || isLoading}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Barcodes Modal */}
      {printTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Icon name="PrinterIcon" size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {printTarget.restocked ? 'Stock Updated — Print New Barcodes' : 'Product Added — Print Barcodes'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {printTarget.restocked
                      ? `Total stock is now ${printTarget.totalQty} units`
                      : 'Ready to print barcode labels'}
                  </p>
                </div>
              </div>
              <button onClick={() => setPrintTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Product summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-slate-800">{printTarget.productName}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="font-mono">{printTarget.sku}</span>
                  <span>₹{printTarget.price.toFixed(2)}</span>
                </div>
              </div>
              {/* Label count info */}
              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <Icon name="TagIcon" size={16} className="text-indigo-600 shrink-0" />
                <p className="text-sm text-indigo-700">
                  {printTarget.restocked ? (
                    <><span className="font-bold">{printTarget.qty}</span> new barcode label{printTarget.qty !== 1 ? 's' : ''} for the units just added.<br /><span className="text-indigo-500 text-xs">({printTarget.totalQty} total units in stock)</span></>
                  ) : (
                    <><span className="font-bold">{printTarget.qty}</span> barcode label{printTarget.qty !== 1 ? 's' : ''} will be generated — one per unit.</>
                  )}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Each label contains a unique Code 128 barcode. Stick one label on each physical product unit. Labels are sized for 2″×1″ thermal paper.
              </p>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setPrintTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white transition-all"
              >
                Print Later
              </button>
              <button
                onClick={() => { window.open(printTarget.barcodePrintUrl, '_blank'); }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <Icon name="PrinterIcon" size={15} className="text-white" />
                Print {printTarget.qty} New Label{printTarget.qty !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Edit Product</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{editTarget.sku}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {editApiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <Icon name="ExclamationCircleIcon" size={14} className="text-red-500 shrink-0" />
                  {editApiError}
                </div>
              )}
              <FormField label="Product Name" required>
                <input
                  type="text"
                  value={editState.name}
                  onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                  className={`${inputBase} ${editErrors.name ? 'border-red-300' : ''}`}
                />
                {editErrors.name && <p className="mt-1 text-[11px] text-red-500">{editErrors.name}</p>}
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Price ($)" required>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editState.price}
                    onChange={e => setEditState(s => ({ ...s, price: e.target.value }))}
                    className={`${inputBase} ${editErrors.price ? 'border-red-300' : ''}`}
                  />
                  {editErrors.price && <p className="mt-1 text-[11px] text-red-500">{editErrors.price}</p>}
                </FormField>
                <FormField label="SKU Code">
                  <input
                    type="text"
                    value={editState.sku}
                    onChange={e => setEditState(s => ({ ...s, sku: e.target.value.toUpperCase() }))}
                    className={`${inputBase} font-mono`}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Total Quantity" required>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editState.totalQty}
                    onChange={e => setEditState(s => ({ ...s, totalQty: e.target.value }))}
                    className={`${inputBase} ${editErrors.totalQty ? 'border-red-300' : ''}`}
                  />
                  {editErrors.totalQty && <p className="mt-1 text-[11px] text-red-500">{editErrors.totalQty}</p>}
                </FormField>
                <FormField label="Available Quantity" required>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editState.availableQty}
                    onChange={e => setEditState(s => ({ ...s, availableQty: e.target.value }))}
                    className={`${inputBase} ${editErrors.availableQty ? 'border-red-300' : ''}`}
                  />
                  {editErrors.availableQty && <p className="mt-1 text-[11px] text-red-500">{editErrors.availableQty}</p>}
                </FormField>
              </div>

              <FormField label="Description">
                <textarea
                  rows={2}
                  value={editState.description}
                  onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                  className={`${inputBase} resize-none`}
                />
              </FormField>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setEditTarget(null)}
                disabled={isSavingEdit}
                className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {isSavingEdit ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="CheckIcon" size={15} className="text-white" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="ExclamationTriangleIcon" size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Delete Product</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-slate-700">"{deleteTarget.name}"</span>?
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="TrashIcon" size={15} className="text-white" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
