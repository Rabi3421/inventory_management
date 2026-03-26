'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type ProductStatus = 'Active' | 'Inactive' | 'Discontinued';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unitPrice: number;
  totalStock: number;
  shops: number;
  status: ProductStatus;
  addedDate: string;
}

const productsData: Product[] = [
  { id: 'p-001', sku: 'SKU-7829341', name: 'Samsung 55" QLED TV (QN55Q80C)', category: 'Electronics', brand: 'Samsung', unitPrice: 850, totalStock: 24, shops: 4, status: 'Active', addedDate: '2025-11-10' },
  { id: 'p-002', sku: 'SKU-4412087', name: 'Nike Air Max 270 — Men\'s Sz 42', category: 'Apparel', brand: 'Nike', unitPrice: 120, totalStock: 0, shops: 3, status: 'Active', addedDate: '2025-10-05' },
  { id: 'p-003', sku: 'SKU-9934512', name: 'Indomie Noodles 70g Chicken (Carton)', category: 'Food & Bev', brand: 'Indomie', unitPrice: 18, totalStock: 312, shops: 6, status: 'Active', addedDate: '2025-09-14' },
  { id: 'p-004', sku: 'SKU-2281934', name: 'Hisense 1.5HP Split AC R410A', category: 'Electronics', brand: 'Hisense', unitPrice: 620, totalStock: 47, shops: 5, status: 'Active', addedDate: '2025-12-01' },
  { id: 'p-005', sku: 'SKU-6671209', name: 'Nestlé Milo 900g Tin', category: 'Food & Bev', brand: 'Nestlé', unitPrice: 9, totalStock: 183, shops: 6, status: 'Active', addedDate: '2025-08-20' },
  { id: 'p-006', sku: 'SKU-3341827', name: 'iPhone 15 Pro Silicone Case', category: 'Electronics', brand: 'Apple', unitPrice: 35, totalStock: 0, shops: 2, status: 'Inactive', addedDate: '2025-11-28' },
  { id: 'p-007', sku: 'SKU-8812944', name: 'Adidas Tiro 23 Training Shorts', category: 'Apparel', brand: 'Adidas', unitPrice: 45, totalStock: 64, shops: 4, status: 'Active', addedDate: '2025-07-15' },
  { id: 'p-008', sku: 'SKU-1120438', name: 'Dettol Antiseptic Liquid 1L', category: 'Health & Beauty', brand: 'Dettol', unitPrice: 7, totalStock: 6, shops: 5, status: 'Active', addedDate: '2025-10-30' },
  { id: 'p-009', sku: 'SKU-5569201', name: 'Bosch Cordless Drill GSB 18V-55', category: 'Home & Garden', brand: 'Bosch', unitPrice: 210, totalStock: 18, shops: 3, status: 'Active', addedDate: '2025-06-22' },
  { id: 'p-010', sku: 'SKU-7734189', name: 'Wilson Ultra 100 Tennis Racket', category: 'Sporting Goods', brand: 'Wilson', unitPrice: 95, totalStock: 3, shops: 2, status: 'Active', addedDate: '2025-09-08' },
  { id: 'p-011', sku: 'SKU-4489023', name: 'LG 32" Full HD Monitor 32MN500M', category: 'Electronics', brand: 'LG', unitPrice: 280, totalStock: 29, shops: 4, status: 'Active', addedDate: '2025-12-15' },
  { id: 'p-012', sku: 'SKU-9901234', name: 'Nivea Men Deep Impact Deodorant 150ml', category: 'Health & Beauty', brand: 'Nivea', unitPrice: 4, totalStock: 88, shops: 6, status: 'Active', addedDate: '2025-08-05' },
  { id: 'p-013', sku: 'SKU-3312098', name: 'Panasonic Microwave NN-ST34HM', category: 'Electronics', brand: 'Panasonic', unitPrice: 145, totalStock: 11, shops: 3, status: 'Active', addedDate: '2026-01-10' },
  { id: 'p-014', sku: 'SKU-6678234', name: 'Puma RS-X Sneakers White/Blue', category: 'Apparel', brand: 'Puma', unitPrice: 90, totalStock: 0, shops: 2, status: 'Discontinued', addedDate: '2025-05-18' },
  { id: 'p-015', sku: 'SKU-2234567', name: 'Oral-B Pro 2000 Electric Toothbrush', category: 'Health & Beauty', brand: 'Oral-B', unitPrice: 55, totalStock: 42, shops: 5, status: 'Active', addedDate: '2026-02-01' },
];

const statusConfig: Record<ProductStatus, { className: string }> = {
  'Active': { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  'Inactive': { className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'Discontinued': { className: 'bg-red-50 text-red-700 border border-red-200' },
};

const categories = ['All', 'Electronics', 'Apparel', 'Food & Bev', 'Health & Beauty', 'Home & Garden', 'Sporting Goods'];

type SortKey = 'name' | 'category' | 'unitPrice' | 'totalStock' | 'shops' | 'status';
type SortDir = 'asc' | 'desc';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let data = [...productsData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All') data = data.filter(p => p.category === categoryFilter);
    if (statusFilter !== 'All') data = data.filter(p => p.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, categoryFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(p => p.id)));
  };

  const totalActive = productsData.filter(p => p.status === 'Active').length;
  const totalInactive = productsData.filter(p => p.status === 'Inactive').length;
  const totalDiscontinued = productsData.filter(p => p.status === 'Discontinued').length;
  const totalValue = productsData.reduce((sum, p) => sum + p.unitPrice * p.totalStock, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/products">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Products</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your full product catalog across all shops</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150">
            <Icon name="PlusIcon" size={16} className="text-white" />
            Add Product
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Products</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="CubeIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{productsData.length}</p>
            <p className="text-xs text-slate-400 mt-1">Across all categories</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon name="CheckCircleIcon" size={16} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalActive}</p>
            <p className="text-xs text-slate-400 mt-1">Currently listed</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Inactive</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Icon name="PauseCircleIcon" size={16} className="text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalInactive}</p>
            <p className="text-xs text-slate-400 mt-1">Temporarily paused</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Catalog Value</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="CurrencyDollarIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">${(totalValue / 1000).toFixed(1)}k</p>
            <p className="text-xs text-slate-400 mt-1">Total stock value</p>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Product Catalog</h3>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} products found</p>
            </div>
            <div className="relative w-56">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, SKU, brand…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ProductStatus | 'All')}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discontinued">Discontinued</option>
            </select>
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all">
              <Icon name="ArrowDownTrayIcon" size={13} className="text-slate-400" />
              Export
            </button>
          </div>

          {/* Bulk action bar */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-50 border-b border-indigo-100">
              <span className="text-xs font-semibold text-indigo-700">{selectedRows.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5">
                  <Icon name="PencilSquareIcon" size={12} />
                  Bulk Edit
                </button>
                <button className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1.5">
                  <Icon name="TrashIcon" size={12} />
                  Delete
                </button>
                <button onClick={() => setSelectedRows(new Set())} className="text-xs text-slate-400 hover:text-slate-600 ml-2">
                  <Icon name="XMarkIcon" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-10 pl-5 pr-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                    />
                  </th>
                  {([
                    { key: 'sku', label: 'SKU', sortable: false },
                    { key: 'name', label: 'Product Name', sortable: true },
                    { key: 'category', label: 'Category', sortable: true },
                    { key: 'brand', label: 'Brand', sortable: false },
                    { key: 'unitPrice', label: 'Unit Price', sortable: true },
                    { key: 'totalStock', label: 'Total Stock', sortable: true },
                    { key: 'shops', label: 'Shops', sortable: true },
                    { key: 'status', label: 'Status', sortable: true },
                    { key: 'actions', label: '', sortable: false },
                  ] as { key: string; label: string; sortable: boolean }[]).map(col => (
                    <th
                      key={`th-${col.key}`}
                      onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                      className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''} ${col.key === 'name' ? 'min-w-[220px]' : ''}`}
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Icon name="CubeIcon" size={22} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No products found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(product => (
                    <tr key={product.id} className={`hover:bg-slate-50/60 transition-colors ${selectedRows.has(product.id) ? 'bg-indigo-50/40' : ''}`}>
                      <td className="pl-5 pr-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(product.id)}
                          onChange={() => toggleRow(product.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-mono text-slate-400">{product.sku}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Icon name="CubeIcon" size={14} className="text-indigo-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{product.category}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{product.brand}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700">${product.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <span className={`text-sm font-semibold ${product.totalStock === 0 ? 'text-red-600' : product.totalStock < 10 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {product.totalStock}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Icon name="BuildingStorefrontIcon" size={12} className="text-slate-400" />
                          <span className="text-xs text-slate-500">{product.shops}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[product.status].className}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all" title="Edit product">
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Delete product">
                            <Icon name="TrashIcon" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {productsData.length} products</p>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-all disabled:opacity-40" disabled>
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg">1</span>
              <button className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-all disabled:opacity-40" disabled>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
