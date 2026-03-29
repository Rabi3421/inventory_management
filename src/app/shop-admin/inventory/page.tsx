'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
type LogType = 'purchase' | 'restock' | 'sale' | 'adjustment' | 'return';
type SortKey = 'name' | 'price' | 'totalQty' | 'availableQty' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  stockValue: number;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
  lastMovedAt: string;
  lastType: LogType;
  lastQty: number;
  lastNote: string;
  totalIn: number;
  totalOut: number;
  movementCount: number;
}

interface Stats {
  totalProducts: number;
  totalUnits: number;
  availableUnits: number;
  catalogValue: number;
  outOfStock: number;
  lowStock: number;
}

interface LogEntry {
  _id: string;
  type: LogType;
  qty: number;
  balanceAfter: number;
  note: string;
  performedBy: string;
  createdAt: string;
}

interface AdjustState {
  type: LogType;
  qty: string;
  note: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StockStatus, { label: string; badge: string; dot: string; row: string }> = {
  'in-stock':     { label: 'In Stock',     badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', row: '' },
  'low-stock':    { label: 'Low Stock',    badge: 'bg-amber-50 text-amber-700 border border-amber-200',       dot: 'bg-amber-500',   row: 'bg-amber-50/30' },
  'out-of-stock': { label: 'Out of Stock', badge: 'bg-red-50 text-red-700 border border-red-200',             dot: 'bg-red-500',     row: 'bg-red-50/20' },
};

const LOG_CONFIG: Record<LogType, { label: string; icon: string; color: string; bg: string }> = {
  purchase:   { label: 'Purchase',   icon: 'ShoppingBagIcon',           color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  restock:    { label: 'Restock',    icon: 'ArrowPathIcon',             color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200'   },
  sale:       { label: 'Sale',       icon: 'ArrowUpRightIcon',          color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200'       },
  adjustment: { label: 'Adjustment', icon: 'AdjustmentsHorizontalIcon', color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200'     },
  return:     { label: 'Return',     icon: 'ArrowUturnLeftIcon',        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'       },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toFixed(2)}`;
}
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

// ── Add Product Modal ─────────────────────────────────────────────────────────

interface AddProductModalProps {
  shopId: string;
  shopName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddProductModal({ shopId, shopName, onClose, onSuccess }: AddProductModalProps) {
  const [form, setForm] = useState({ name: '', description: '', price: '', quantity: '', sku: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<{ _id: string; name: string; price: number; sku: string; description: string }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);

  useEffect(() => { nameRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(f => ({ ...f, name: val }));
    if (suggestRef.current) clearTimeout(suggestRef.current);
    if (!val.trim()) { setSuggestions([]); setShowSug(false); return; }
    setSugLoading(true);
    suggestRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(val)}&limit=8&sort=name&dir=asc`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.products ?? []);
        setShowSug((data.products ?? []).length > 0);
      } catch { /* silent */ } finally { setSugLoading(false); }
    }, 250);
  };

  const pickSuggestion = (p: { name: string; price: number; sku: string; description: string }) => {
    setForm(f => ({ ...f, name: p.name, price: f.price || String(p.price), sku: f.sku || p.sku, description: f.description || p.description }));
    setSuggestions([]); setShowSug(false);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) { setError('Enter a valid price.'); return; }
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 1) { setError('Quantity must be at least 1.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, name: form.name.trim(), description: form.description.trim(), price: Number(form.price), quantity: Math.floor(Number(form.quantity)), sku: form.sku.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to add product.'); return; }
      onSuccess(); onClose();
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Add Product</h2>
            <p className="text-xs text-slate-400 mt-0.5">Adding to <span className="font-semibold text-emerald-600">{shopName}</span> only</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              <Icon name="ExclamationCircleIcon" size={14} />{error}
            </div>
          )}
          <div ref={wrapRef} className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <input ref={nameRef} type="text" value={form.name} onChange={handleNameChange} onFocus={() => suggestions.length > 0 && setShowSug(true)}
                placeholder="e.g. Coca-Cola 50cl Crate" autoComplete="off"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all pr-8" />
              {sugLoading && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
            </div>
            {showSug && suggestions.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {suggestions.map(s => (
                  <li key={s._id} onMouseDown={() => pickSuggestion(s)} className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-emerald-50 cursor-pointer group">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate group-hover:text-emerald-700">{s.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{s.sku}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 shrink-0">₹{s.price}</span>
                  </li>
                ))}
                <li className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-400 italic">Select to pre-fill · or keep typing for a new product</li>
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unit Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} placeholder="1"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">SKU <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" value={form.sku} onChange={set('sku')} placeholder="e.g. FDB-001"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Short product description…"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all resize-none" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? (<><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Adding…</>) : (<><Icon name="PlusIcon" size={15} />Add Product</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShopAdminInventoryPage() {
  const { user } = useAuth();
  const shopId   = user?.shopId   ?? '';
  const shopName = user?.shopName ?? 'My Shop';

  const [items, setItems]               = useState<InventoryItem[]>([]);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [sortKey, setSortKey]           = useState<SortKey>('createdAt');
  const [sortDir, setSortDir]           = useState<SortDir>('desc');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // Drawer state
  const [drawerItem, setDrawerItem]             = useState<InventoryItem | null>(null);
  const [logs, setLogs]                         = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading]           = useState(false);
  const [logsPage, setLogsPage]                 = useState(1);
  const [logsTotalPages, setLogsTotalPages]     = useState(1);
  const [logsTotalCount, setLogsTotalCount]     = useState(0);

  // Record movement state
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustState, setAdjustState]   = useState<AdjustState>({ type: 'sale', qty: '', note: '' });
  const [adjustError, setAdjustError]   = useState('');
  const [isSavingAdj, setIsSavingAdj]   = useState(false);
  const [adjSuccess, setAdjSuccess]     = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchInventory = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const p = new URLSearchParams({ shopId, page: String(page), limit: '50', sort: sortKey, dir: sortDir, search: debouncedSearch, status: statusFilter });
      const res = await fetch(`/api/inventory?${p}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = await res.json();
      setItems(data.items ?? []);
      setStats(data.stats ?? null);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalCount(data.pagination?.total ?? 0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, page, sortKey, sortDir, debouncedSearch, statusFilter]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const fetchLogs = useCallback(async (id: string, pg = 1) => {
    setLogsLoading(true);
    if (pg === 1) setLogs([]);
    try {
      const res = await fetch(`/api/inventory/${id}/logs?limit=20&page=${pg}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs ?? []);
      setLogsTotalPages(data.pagination?.totalPages ?? 1);
      setLogsTotalCount(data.pagination?.total ?? 0);
      setLogsPage(pg);
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  }, []);

  const openDrawer  = (item: InventoryItem) => { setDrawerItem(item); fetchLogs(item._id, 1); };
  const closeDrawer = () => { setDrawerItem(null); setLogs([]); setLogsPage(1); };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustTarget) return;
    const qty = Number(adjustState.qty);
    if (!adjustState.qty || isNaN(qty) || qty === 0) { setAdjustError('Enter a valid non-zero quantity.'); return; }
    setIsSavingAdj(true); setAdjustError('');
    try {
      const res = await fetch(`/api/inventory/${adjustTarget._id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: adjustState.type, qty, note: adjustState.note }),
      });
      const body = await res.json();
      if (!res.ok) { setAdjustError(body.error ?? 'Failed.'); return; }
      setAdjSuccess(`Recorded: ${LOG_CONFIG[adjustState.type].label} of ${Math.abs(qty)} units.`);
      setTimeout(() => { setAdjustTarget(null); setAdjSuccess(''); }, 1800);
      fetchInventory();
      if (drawerItem?._id === adjustTarget._id) fetchLogs(adjustTarget._id, 1);
    } catch { setAdjustError('Network error.'); }
    finally { setIsSavingAdj(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0 shrink-0">
      <Icon name="ChevronUpIcon"   size={9} className={sortKey === col && sortDir === 'asc'  ? 'text-emerald-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={9} className={sortKey === col && sortDir === 'desc' ? 'text-emerald-600' : 'text-slate-300'} />
    </span>
  );

  const sortableCols = ['name', 'price', 'totalQty', 'availableQty', 'createdAt'];

  return (
    <ShopAdminLayout activeRoute="/shop-admin/inventory">
      {showAddModal && (
        <AddProductModal shopId={shopId} shopName={shopName}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { fetchInventory(); }} />
      )}

      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Inventory</h1>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{shopName}</span>
            </div>
            <p className="text-sm text-slate-500">Live stock ledger — every movement recorded like a bank statement</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchInventory}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all">
              <Icon name="ArrowPathIcon" size={15} className="text-slate-400" />
              Refresh
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              <Icon name="PlusIcon" size={16} className="text-white" />
              Add Product
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {([
            { label: 'Total SKUs',   value: stats?.totalProducts,  sub: 'Unique products',   icon: 'ClipboardDocumentListIcon', cls: 'text-slate-800'   },
            { label: 'Total Units',  value: stats?.totalUnits,     sub: 'All stock added',   icon: 'CubeIcon',                  cls: 'text-slate-800'   },
            { label: 'Available',    value: stats?.availableUnits, sub: 'Ready to sell',     icon: 'CheckCircleIcon',           cls: 'text-emerald-700' },
            { label: 'Low Stock',    value: stats?.lowStock,       sub: '≤ 20 units left',   icon: 'ExclamationTriangleIcon',   cls: 'text-amber-600'   },
            { label: 'Out of Stock', value: stats?.outOfStock,     sub: 'Urgent attention',  icon: 'XCircleIcon',               cls: 'text-red-600'     },
            { label: 'Stock Value',  value: stats ? fmtMoney(stats.catalogValue) : undefined, sub: 'Available × price', icon: 'BanknotesIcon', cls: 'text-slate-800' },
          ] as { label: string; value: number | string | undefined; sub: string; icon: string; cls: string }[]).map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{c.label}</span>
                <Icon name={c.icon} size={14} className="text-slate-300" />
              </div>
              {isLoading
                ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mb-1" />
                : <p className={`text-2xl font-bold ${c.cls}`}>{c.value ?? '—'}</p>
              }
              <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Stock Ledger</h3>
              <p className="text-xs text-slate-400 mt-0.5">{isLoading ? '…' : `${totalCount} product${totalCount !== 1 ? 's' : ''} · click the clock icon to view movement history`}</p>
            </div>
            <div className="relative w-52">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search name or SKU…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Icon name="XMarkIcon" size={13} />
                </button>
              )}
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as StockStatus | 'all'); setPage(1); }}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="all">All Statuses</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          {loadError && (
            <div className="mx-5 my-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 shrink-0" />{loadError}
              <button onClick={fetchInventory} className="ml-auto text-xs font-semibold underline">Retry</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {([
                    { key: 'name',         label: 'Product',       w: 'min-w-[220px]' },
                    { key: 'price',        label: 'Price',         w: '' },
                    { key: 'totalQty',     label: 'Total Stock',   w: '' },
                    { key: 'availableQty', label: 'Available',     w: '' },
                    { key: 'stockValue',   label: 'Stock Value',   w: '' },
                    { key: 'createdAt',    label: 'Added On',      w: '' },
                    { key: 'lastMovedAt',  label: 'Last Movement', w: 'min-w-[160px]' },
                    { key: 'status',       label: 'Status',        w: '' },
                    { key: 'actions',      label: '',              w: 'w-16' },
                  ] as { key: string; label: string; w: string }[]).map(col => (
                    <th key={`th-${col.key}`}
                      onClick={sortableCols.includes(col.key) ? () => toggleSort(col.key as SortKey) : undefined}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap ${col.w} ${sortableCols.includes(col.key) ? 'cursor-pointer hover:text-slate-600 select-none' : ''}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {col.label}
                        {sortableCols.includes(col.key) && <SortIcon col={col.key as SortKey} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 9 }).map((__, j) => (
                          <td key={j} className="px-4 py-4"><div className="h-3 bg-slate-100 rounded w-full max-w-[110px]" /></td>
                        ))}
                      </tr>
                    ))
                  : items.length === 0
                  ? (
                    <tr><td colSpan={9} className="px-5 py-14 text-center">
                      <Icon name="ClipboardDocumentListIcon" size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-400">No inventory items found</p>
                      <p className="text-xs text-slate-300 mt-1 mb-3">
                        {search ? 'Try a different search term.' : 'Add products to see them here'}
                      </p>
                      {!search && (
                        <button onClick={() => setShowAddModal(true)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
                          + Add your first product
                        </button>
                      )}
                    </td></tr>
                  )
                  : items.map(item => {
                      const cfg = STATUS_CONFIG[item.stockStatus] ?? STATUS_CONFIG['in-stock'];
                      const lc  = LOG_CONFIG[item.lastType] ?? LOG_CONFIG['adjustment'];
                      const isActive = drawerItem?._id === item._id;
                      return (
                        <tr key={item._id} className={`transition-colors hover:bg-slate-50/70 ${cfg.row} ${isActive ? 'bg-emerald-50/40 border-l-2 border-l-emerald-400' : ''}`}>
                          {/* Product */}
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                              {item.description && <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{item.description}</p>}
                            </div>
                          </td>
                          {/* Price */}
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-semibold text-slate-700">₹{item.price.toFixed(2)}</span>
                          </td>
                          {/* Total stock */}
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-bold text-slate-800">{item.totalQty.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400">{item.movementCount} movement{item.movementCount !== 1 ? 's' : ''}</p>
                          </td>
                          {/* Available */}
                          <td className="px-4 py-3.5">
                            <p className={`text-sm font-bold ${item.availableQty === 0 ? 'text-red-600' : item.stockStatus === 'low-stock' ? 'text-amber-600' : 'text-emerald-700'}`}>
                              {item.availableQty.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400">{item.totalOut > 0 ? `${item.totalOut} used/sold` : '—'}</p>
                          </td>
                          {/* Stock value */}
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-semibold text-slate-600">{fmtMoney(item.stockValue)}</span>
                          </td>
                          {/* Added on */}
                          <td className="px-4 py-3.5">
                            <p className="text-xs text-slate-600">{fmtDate(item.createdAt)}</p>
                            <p className="text-[10px] text-slate-400">{relativeTime(item.createdAt)}</p>
                          </td>
                          {/* Last movement */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${lc.bg}`}>
                                <Icon name={lc.icon} size={10} className={lc.color} />
                              </div>
                              <div>
                                <p className="text-xs text-slate-600">{relativeTime(item.lastMovedAt)}</p>
                                <p className="text-[10px] text-slate-400">{lc.label} · {item.lastQty > 0 ? '+' : ''}{item.lastQty}</p>
                              </div>
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openDrawer(item)}
                                className={`p-1.5 rounded-lg transition-all ${isActive ? 'text-emerald-600 bg-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title="View movement history">
                                <Icon name="ClockIcon" size={15} />
                              </button>
                              <button onClick={() => { setAdjustTarget(item); setAdjustState({ type: 'sale', qty: '', note: '' }); setAdjustError(''); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                title="Record movement">
                                <Icon name="PlusCircleIcon" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">Page {page} of {totalPages} · {totalCount} total</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40">Previous</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${page === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Movement History Drawer ──────────────────────────────────────────── */}
      {drawerItem && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
      )}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerItem ? 'translate-x-0' : 'translate-x-full'}`}>
        {drawerItem && (
          <>
            {/* Drawer header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Icon name="ClockIcon" size={18} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-800 truncate">{drawerItem.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{drawerItem.sku} · {logsTotalCount} movement{logsTotalCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 ml-2">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>

            {/* Summary pills */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0 flex-wrap">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">↑ {drawerItem.totalIn} in</span>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">↓ {drawerItem.totalOut} out</span>
              <span className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full">= {drawerItem.availableQty} balance</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">{fmtMoney(drawerItem.stockValue)} value</span>
              <button
                onClick={() => { setAdjustTarget(drawerItem); setAdjustState({ type: 'sale', qty: '', note: '' }); setAdjustError(''); }}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-full transition-all">
                <Icon name="PlusIcon" size={10} /> Record Movement
              </button>
            </div>

            {/* Ledger entries — scrollable */}
            <div className="flex-1 overflow-y-auto">
              {logsLoading ? (
                <div className="space-y-3 p-6">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                        <div className="h-2.5 bg-slate-100 rounded w-2/3" />
                      </div>
                      <div className="h-4 w-10 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Icon name="ClipboardDocumentListIcon" size={36} className="text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No movements recorded yet.</p>
                  <button onClick={() => { setAdjustTarget(drawerItem); setAdjustState({ type: 'sale', qty: '', note: '' }); setAdjustError(''); }}
                    className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
                    Record first movement
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {logs.map((log, idx) => {
                    const lCfg = LOG_CONFIG[log.type] ?? LOG_CONFIG['adjustment'];
                    const isIn = log.qty > 0;
                    return (
                      <div key={log._id} className={`px-6 py-4 hover:bg-slate-50/60 transition-colors ${idx === 0 && logsPage === 1 ? 'border-t-0' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${lCfg.bg}`}>
                            <Icon name={lCfg.icon} size={14} className={lCfg.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className={`text-sm font-semibold ${lCfg.color}`}>{lCfg.label}</p>
                              <p className={`text-base font-bold tabular-nums shrink-0 ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isIn ? '+' : ''}{log.qty.toLocaleString()}
                              </p>
                            </div>
                            {log.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{log.note}</p>}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-400">{fmtDateTime(log.createdAt)}</span>
                              <span className="text-[11px] text-slate-400">·</span>
                              <span className="text-[11px] text-slate-400">Balance: <span className="font-semibold text-slate-600">{log.balanceAfter.toLocaleString()}</span></span>
                              <span className="text-[11px] text-slate-400">·</span>
                              <span className="text-[11px] text-slate-400">Value: <span className="font-semibold text-slate-600">{fmtMoney(Math.abs(log.qty) * drawerItem.price)}</span></span>
                              {log.performedBy && (
                                <>
                                  <span className="text-[11px] text-slate-400">·</span>
                                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">By: <span className="font-semibold text-slate-600">{log.performedBy}</span></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer footer — pagination */}
            {logsTotalPages > 1 && (
              <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Page {logsPage} of {logsTotalPages} · {logsTotalCount} entries</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { if (drawerItem) fetchLogs(drawerItem._id, logsPage - 1); }} disabled={logsPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40">Previous</button>
                  <button onClick={() => { if (drawerItem) fetchLogs(drawerItem._id, logsPage + 1); }} disabled={logsPage === logsTotalPages}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Record Movement Modal ─────────────────────────────────────────────── */}
      {adjustTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Icon name="PlusCircleIcon" size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Record Movement</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{adjustTarget.sku} · {adjustTarget.availableQty} available</p>
                </div>
              </div>
              <button onClick={() => setAdjustTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>

            {adjSuccess ? (
              <div className="px-6 py-10 text-center">
                <Icon name="CheckCircleIcon" size={40} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800">{adjSuccess}</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Movement Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sale', 'adjustment', 'return'] as LogType[]).map(t => {
                      const lc = LOG_CONFIG[t];
                      return (
                        <button key={t} onClick={() => setAdjustState(s => ({ ...s, type: t }))}
                          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-semibold transition-all ${adjustState.type === t ? `border-emerald-400 bg-emerald-50 ${lc.color}` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <Icon name={lc.icon} size={16} />
                          {lc.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {adjustState.type === 'sale' ? 'Deducts units from available stock.' : adjustState.type === 'return' ? 'Adds returned units back to stock.' : 'Positive = add stock, negative = remove stock.'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantity {adjustState.type === 'adjustment' ? '(+/−)' : ''}</label>
                  <input type="number" placeholder={adjustState.type === 'adjustment' ? 'e.g. −5 or +10' : 'e.g. 10'}
                    value={adjustState.qty} onChange={e => setAdjustState(s => ({ ...s, qty: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note (optional)</label>
                  <input type="text" placeholder="e.g. Sold to customer, Damaged units removed…"
                    value={adjustState.note} onChange={e => setAdjustState(s => ({ ...s, note: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                {adjustError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    <Icon name="ExclamationCircleIcon" size={14} className="text-red-500 shrink-0" />{adjustError}
                  </div>
                )}
              </div>
            )}

            {!adjSuccess && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => setAdjustTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white">Cancel</button>
                <button onClick={handleAdjustSubmit} disabled={isSavingAdj}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
                  {isSavingAdj && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                  Record Movement
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ShopAdminLayout>
  );
}
