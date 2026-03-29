'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

// ─── Types ────────────────────────────────────────────────────────────────────
type ShopStatus  = 'Active' | 'Inactive' | 'Suspended';
type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
type SortKey     = 'name' | 'totalSKUs' | 'totalStock' | 'lowStockAlerts' | 'status';
type SortDir     = 'asc' | 'desc';

interface ShopItem {
  _id: string;
  name: string;
  location: string;
  manager: string;
  phone: string;
  status: ShopStatus;
  createdAt: string;
  updatedAt: string;
  totalSKUs: number;
  totalStock: number;
  availableStock: number;
  totalValue: number;
  lowStockAlerts: number;
  outOfStock: number;
  adminName: string | null;
  adminEmail: string | null;
}

interface KPI { total: number; active: number; inactive: number; suspended: number; }

interface InventoryProduct {
  _id: string;
  sku: string;
  name: string;
  price: number;
  totalQty: number;
  availableQty: number;
  stockStatus: StockStatus;
  lastMovedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusCfg: Record<ShopStatus, { badge: string; dot: string; row: string }> = {
  Active:    { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', row: '' },
  Inactive:  { badge: 'bg-amber-50 text-amber-700 border border-amber-200',       dot: 'bg-amber-400',   row: 'bg-amber-50/20' },
  Suspended: { badge: 'bg-red-50 text-red-700 border border-red-200',             dot: 'bg-red-500',     row: 'bg-red-50/20' },
};
const stockBadgeCls: Record<StockStatus, string> = {
  'in-stock':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'low-stock':   'bg-amber-50 text-amber-700 border-amber-200',
  'out-of-stock':'bg-red-50 text-red-700 border-red-200',
};
const stockLabel: Record<StockStatus, string> = {
  'in-stock': 'In Stock', 'low-stock': 'Low Stock', 'out-of-stock': 'Out of Stock',
};
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `\u20b9${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `\u20b9${(n / 1_000).toFixed(1)}k`;
  return `\u20b9${n.toFixed(0)}`;
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} day${d > 1 ? 's' : ''} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w > 1 ? 's' : ''} ago`;
}

// ─── Inventory Drawer ─────────────────────────────────────────────────────────
function InventoryDrawer({ shop, onClose }: { shop: ShopItem; onClose: () => void }) {
  const [products, setProducts]     = useState<InventoryProduct[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    fetch('/api/inventory?limit=200')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setProducts(data.items ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let data = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') data = data.filter(p => p.stockStatus === statusFilter);
    return data;
  }, [products, search, statusFilter]);

  const totalValue = products.reduce((s, p) => s + p.price * p.availableQty, 0);
  const lowCount   = products.filter(p => p.stockStatus === 'low-stock').length;
  const outCount   = products.filter(p => p.stockStatus === 'out-of-stock').length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[620px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Icon name="BuildingStorefrontIcon" size={18} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800 truncate">{shop.name} — Inventory</h2>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Icon name="MapPinIcon" size={10} />{shop.location} · {shop.manager}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 ml-2">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>

        {/* Pills */}
        {!loading && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full">{products.length} SKUs</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {products.reduce((s, p) => s + p.availableQty, 0).toLocaleString()} available
            </span>
            {lowCount > 0 && <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">\u26a0 {lowCount} low stock</span>}
            {outCount > 0 && <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">\u2717 {outCount} out of stock</span>}
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">{fmtMoney(totalValue)} value</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Icon name="MagnifyingGlassIcon" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search product or SKU\u2026" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StockStatus | 'all')}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none">
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Icon name="ArrowPathIcon" size={24} className="text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading inventory\u2026</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['SKU', 'Product', 'Price', 'Total Qty', 'Available', 'Status', 'Last Moved'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-14 text-center">
                    <Icon name="ClipboardDocumentListIcon" size={28} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No products match your filter.</p>
                  </td></tr>
                ) : filtered.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">\u20b9{p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">{p.totalQty.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-bold ${p.availableQty === 0 ? 'text-red-600' : p.stockStatus === 'low-stock' ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {p.availableQty.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stockBadgeCls[p.stockStatus]}`}>
                        {stockLabel[p.stockStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{timeAgo(p.lastMovedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">{filtered.length} of {products.length} products shown</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg[shop.status].badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg[shop.status].dot}`} />{shop.status}
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Shop Modal (Add / Edit) ──────────────────────────────────────────────────
interface ShopForm { name: string; location: string; manager: string; phone: string; status: ShopStatus; }

function ShopModal({ initial, onClose, onSaved }: {
  initial?: ShopItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<ShopForm>({
    name:     initial?.name     ?? '',
    location: initial?.location ?? '',
    manager:  initial?.manager  ?? '',
    phone:    initial?.phone    ?? '',
    status:   initial?.status   ?? 'Active',
  });
  const [errors, setErrors]   = useState<Partial<ShopForm>>({});
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (k: keyof ShopForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e: Partial<ShopForm> = {};
    if (!form.name.trim())     e.name     = 'Shop name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.manager.trim())  e.manager  = 'Manager name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      const url    = isEdit ? `/api/shops/${initial!._id}` : '/api/shops';
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? 'Something went wrong.'); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch {
      setApiError('Network error. Please try again.');
      setSaving(false);
    }
  };

  const ib = 'w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Icon name="BuildingStorefrontIcon" size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">{isEdit ? 'Edit Shop' : 'Add New Shop'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{isEdit ? 'Update branch details' : 'Register a new branch'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <Icon name="CheckCircleIcon" size={44} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">{isEdit ? 'Shop updated!' : 'Shop added successfully!'}</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              {apiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{apiError}</p>
                </div>
              )}
              {([
                { key: 'name',     label: 'Shop Name',        placeholder: 'e.g. Lekki Branch' },
                { key: 'location', label: 'Location / Address',placeholder: 'e.g. Lekki Phase 1, Lagos' },
                { key: 'manager',  label: 'Branch Manager',   placeholder: 'Full name' },
                { key: 'phone',    label: 'Phone (optional)', placeholder: '+91 xxx xxx xxxx' },
              ] as { key: keyof ShopForm; label: string; placeholder: string }[]).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                  <input type="text" placeholder={f.placeholder} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                    className={`${ib} ${errors[f.key] ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
                </div>
              ))}
              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}
                    className={`${ib} border-slate-200 bg-white`}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
                {saving && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add Shop'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ shop, onClose, onDeleted }: {
  shop: ShopItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/shops/${shop._id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setApiError(d.error ?? 'Failed to delete.'); setDeleting(false); return; }
      onDeleted();
      onClose();
    } catch {
      setApiError('Network error.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Icon name="TrashIcon" size={22} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Delete &ldquo;{shop.name}&rdquo;?</h3>
          <p className="text-sm text-slate-500">This action cannot be undone. The shop will be permanently removed.</p>
          {apiError && <p className="text-xs text-red-600 mt-3">{apiError}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {deleting && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
            Delete Shop
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShopsPage() {
  const [shops, setShops]           = useState<ShopItem[]>([]);
  const [kpi, setKpi]               = useState<KPI>({ total: 0, active: 0, inactive: 0, suspended: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<ShopStatus | 'All'>('All');
  const [sortKey, setSortKey]       = useState<SortKey>('name');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editShop, setEditShop]     = useState<ShopItem | null>(null);
  const [deleteShop, setDeleteShop] = useState<ShopItem | null>(null);
  const [drawerShop, setDrawerShop] = useState<ShopItem | null>(null);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim())         params.set('search', search.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res  = await fetch(`/api/shops?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setShops(data.items ?? []);
      setKpi(data.kpi ?? { total: 0, active: 0, inactive: 0, suspended: 0 });
    } catch {
      setError('Failed to load shops. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchShops, 300);
    return () => clearTimeout(t);
  }, [fetchShops]);

  const sorted = useMemo(() => {
    const data = [...shops];
    data.sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [shops, sortKey, sortDir]);

  const toggleSort  = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const toggleRow   = (id: string)   => { setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll   = ()             => { setSelectedRows(selectedRows.size === sorted.length ? new Set() : new Set(sorted.map(s => s._id))); };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0 shrink-0">
      <Icon name="ChevronUpIcon"   size={9} className={sortKey === col && sortDir === 'asc'  ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={9} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/shops">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-900">Shops</h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                {kpi.total} total
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Manage all branches &mdash; click <span className="inline-flex items-center gap-0.5 font-medium text-indigo-600"><Icon name="EyeIcon" size={12} className="inline" /> View</span> to browse live inventory
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchShops}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
              <Icon name="ArrowPathIcon" size={15} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 active:scale-95">
              <Icon name="PlusIcon" size={15} /> Add Shop
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Shops',   value: kpi.active,    icon: 'BuildingStorefrontIcon', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
            { label: 'Inactive Shops', value: kpi.inactive,  icon: 'BuildingOffice2Icon',    color: 'bg-amber-50 text-amber-600',     border: 'border-amber-100'   },
            { label: 'Suspended',      value: kpi.suspended, icon: 'NoSymbolIcon',           color: 'bg-red-50 text-red-600',         border: 'border-red-100'     },
            { label: 'Total Shops',    value: kpi.total,     icon: 'BuildingLibraryIcon',    color: 'bg-indigo-50 text-indigo-600',   border: 'border-indigo-100'  },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-lg font-bold text-slate-800">{loading ? '—' : card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <Icon name="ExclamationTriangleIcon" size={15} className="shrink-0" />{error}
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative max-w-xs w-full">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search shops\u2026" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ShopStatus | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500">{selectedRows.size} selected</span>
                  <button className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium">Delete</button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="pl-5 pr-3 py-3 text-left w-10">
                    <input type="checkbox" checked={selectedRows.size === sorted.length && sorted.length > 0} onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
                  </th>
                  {([
                    { key: 'name',           label: 'Shop' },
                    { key: 'totalSKUs',      label: 'SKUs' },
                    { key: 'totalStock',     label: 'Stock Units' },
                    { key: 'lowStockAlerts', label: 'Alerts' },
                    { key: 'status',         label: 'Status' },
                  ] as { key: SortKey; label: string }[]).map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5">{col.label}<SortIcon col={col.key} /></span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Stock Value</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Last Updated</th>
                  <th className="pr-5 pl-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-3 py-4">
                          <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: j === 1 ? '70%' : '50%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                    <Icon name="BuildingStorefrontIcon" size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">{search || statusFilter !== 'All' ? 'No shops match your filter' : 'No shops yet — add your first branch'}</p>
                    {!search && statusFilter === 'All' && (
                      <button onClick={() => setShowAddModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline">
                        <Icon name="PlusIcon" size={12} /> Add Shop
                      </button>
                    )}
                  </td></tr>
                ) : sorted.map(shop => {
                  const cfg     = statusCfg[shop.status];
                  const isActive = drawerShop?._id === shop._id;
                  return (
                    <tr key={shop._id}
                      className={`border-b border-slate-50 transition-colors ${cfg.row} ${selectedRows.has(shop._id) ? 'bg-indigo-50/40' : ''} ${isActive ? 'bg-indigo-50/50 border-l-2 border-l-indigo-400' : 'hover:bg-slate-50/60'}`}>
                      <td className="pl-5 pr-3 py-3.5">
                        <input type="checkbox" checked={selectedRows.has(shop._id)} onChange={() => toggleRow(shop._id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
                      </td>
                      {/* Shop */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <Icon name="BuildingStorefrontIcon" size={16} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{shop.name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Icon name="MapPinIcon" size={10} className="shrink-0" />{shop.location}</p>
                            <p className="text-xs text-slate-400">{shop.manager}</p>
                          </div>
                        </div>
                      </td>
                      {/* SKUs */}
                      <td className="px-3 py-3.5 font-semibold text-slate-800">{shop.totalSKUs.toLocaleString()}</td>
                      {/* Stock Units */}
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-slate-800">{shop.totalStock.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">{shop.availableStock.toLocaleString()} available</p>
                      </td>
                      {/* Alerts */}
                      <td className="px-3 py-3.5">
                        {shop.lowStockAlerts > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Icon name="ExclamationTriangleIcon" size={10} />{shop.lowStockAlerts}
                          </span>
                        ) : <span className="text-xs text-slate-400">\u2014</span>}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{shop.status}
                        </span>
                      </td>
                      {/* Value */}
                      <td className="px-3 py-3.5 font-semibold text-slate-800">{fmtMoney(shop.totalValue)}</td>
                      {/* Last Updated */}
                      <td className="px-3 py-3.5 text-xs text-slate-500">{timeAgo(shop.updatedAt)}</td>
                      {/* Actions */}
                      <td className="pr-5 pl-3 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDrawerShop(isActive ? null : shop)}
                            className={`p-1.5 rounded-lg transition-all ${isActive ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                            title="View Inventory">
                            <Icon name="EyeIcon" size={14} />
                          </button>
                          <button onClick={() => setEditShop(shop)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all"
                            title="Edit Shop">
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                          <button onClick={() => setDeleteShop(shop)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                            title="Delete Shop">
                            <Icon name="TrashIcon" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{sorted.length}</span> of <span className="font-semibold text-slate-700">{kpi.total}</span> shops
            </p>
          </div>
        </div>
      </div>

      {/* Modals & Drawer */}
      {drawerShop  && <InventoryDrawer   shop={drawerShop}  onClose={() => setDrawerShop(null)} />}
      {showAddModal && <ShopModal        onClose={() => setShowAddModal(false)} onSaved={fetchShops} />}
      {editShop    && <ShopModal         initial={editShop} onClose={() => setEditShop(null)}   onSaved={fetchShops} />}
      {deleteShop  && <DeleteConfirmModal shop={deleteShop} onClose={() => setDeleteShop(null)} onDeleted={fetchShops} />}
    </AppLayout>
  );
}
