'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  shop: string;
  stockUnits: number;
  reorderPoint: number;
  unitCost: number;
  status: StockStatus;
  lastUpdated: string;
}

const inventoryData: InventoryItem[] = [
  { id: 'inv-001', sku: 'ELC-001', name: 'Samsung 55" QLED TV', category: 'Electronics', shop: 'Lekki Branch', stockUnits: 24, reorderPoint: 10, unitCost: 850, status: 'In Stock', lastUpdated: '2026-03-25' },
  { id: 'inv-002', sku: 'ELC-002', name: 'iPhone 15 Pro 256GB', category: 'Electronics', shop: 'Victoria Island', stockUnits: 6, reorderPoint: 10, unitCost: 1200, status: 'Low Stock', lastUpdated: '2026-03-24' },
  { id: 'inv-003', sku: 'APP-001', name: 'Nike Air Max 270', category: 'Apparel', shop: 'Ikeja Branch', stockUnits: 0, reorderPoint: 15, unitCost: 120, status: 'Out of Stock', lastUpdated: '2026-03-23' },
  { id: 'inv-004', sku: 'FDB-001', name: 'Indomie Noodles (Carton)', category: 'Food & Bev', shop: 'Lekki Branch', stockUnits: 320, reorderPoint: 50, unitCost: 18, status: 'Overstocked', lastUpdated: '2026-03-25' },
  { id: 'inv-005', sku: 'HLB-001', name: 'Dove Body Lotion 400ml', category: 'Health & Beauty', shop: 'Surulere Branch', stockUnits: 45, reorderPoint: 20, unitCost: 12, status: 'In Stock', lastUpdated: '2026-03-22' },
  { id: 'inv-006', sku: 'APP-002', name: 'Levi\'s 501 Jeans', category: 'Apparel', shop: 'Victoria Island', stockUnits: 8, reorderPoint: 12, unitCost: 95, status: 'Low Stock', lastUpdated: '2026-03-21' },
  { id: 'inv-007', sku: 'HMG-001', name: 'Philips Air Fryer 4.5L', category: 'Home & Garden', shop: 'Ikeja Branch', stockUnits: 18, reorderPoint: 8, unitCost: 145, status: 'In Stock', lastUpdated: '2026-03-20' },
  { id: 'inv-008', sku: 'ELC-003', name: 'JBL Bluetooth Speaker', category: 'Electronics', shop: 'Lekki Branch', stockUnits: 0, reorderPoint: 10, unitCost: 75, status: 'Out of Stock', lastUpdated: '2026-03-19' },
  { id: 'inv-009', sku: 'FDB-002', name: 'Coca-Cola 50cl (Crate)', category: 'Food & Bev', shop: 'Surulere Branch', stockUnits: 180, reorderPoint: 40, unitCost: 22, status: 'Overstocked', lastUpdated: '2026-03-25' },
  { id: 'inv-010', sku: 'HLB-002', name: 'Oral-B Electric Toothbrush', category: 'Health & Beauty', shop: 'Victoria Island', stockUnits: 14, reorderPoint: 8, unitCost: 55, status: 'In Stock', lastUpdated: '2026-03-18' },
  { id: 'inv-011', sku: 'SPG-001', name: 'Adidas Football Size 5', category: 'Sporting Goods', shop: 'Ikeja Branch', stockUnits: 3, reorderPoint: 10, unitCost: 35, status: 'Low Stock', lastUpdated: '2026-03-17' },
  { id: 'inv-012', sku: 'APP-003', name: 'Zara Summer Dress', category: 'Apparel', shop: 'Lekki Branch', stockUnits: 22, reorderPoint: 10, unitCost: 68, status: 'In Stock', lastUpdated: '2026-03-16' },
  { id: 'inv-013', sku: 'ELC-004', name: 'HP Laptop 15" i5', category: 'Electronics', shop: 'Victoria Island', stockUnits: 9, reorderPoint: 5, unitCost: 720, status: 'In Stock', lastUpdated: '2026-03-15' },
  { id: 'inv-014', sku: 'FDB-003', name: 'Golden Morn Cereal 1kg', category: 'Food & Bev', shop: 'Surulere Branch', stockUnits: 0, reorderPoint: 30, unitCost: 8, status: 'Out of Stock', lastUpdated: '2026-03-14' },
  { id: 'inv-015', sku: 'HMG-002', name: 'Thermocool Chest Freezer', category: 'Home & Garden', shop: 'Lekki Branch', stockUnits: 7, reorderPoint: 5, unitCost: 380, status: 'In Stock', lastUpdated: '2026-03-13' },
];

const statusConfig: Record<StockStatus, { className: string; dot: string }> = {
  'In Stock': { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  'Low Stock': { className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  'Out of Stock': { className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
  'Overstocked': { className: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
};

type SortKey = 'name' | 'category' | 'shop' | 'stockUnits' | 'reorderPoint' | 'unitCost' | 'status';
type SortDir = 'asc' | 'desc';

const shops = ['All Shops', 'Lekki Branch', 'Victoria Island', 'Ikeja Branch', 'Surulere Branch'];
const categories = ['All Categories', 'Electronics', 'Apparel', 'Food & Bev', 'Health & Beauty', 'Home & Garden', 'Sporting Goods'];

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'All'>('All');
  const [shopFilter, setShopFilter] = useState('All Shops');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let data = [...inventoryData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') data = data.filter(i => i.status === statusFilter);
    if (shopFilter !== 'All Shops') data = data.filter(i => i.shop === shopFilter);
    if (categoryFilter !== 'All Categories') data = data.filter(i => i.category === categoryFilter);
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, statusFilter, shopFilter, categoryFilter, sortKey, sortDir]);

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
    else setSelectedRows(new Set(filtered.map(i => i.id)));
  };

  const totalSKUs = inventoryData.length;
  const totalUnits = inventoryData.reduce((sum, i) => sum + i.stockUnits, 0);
  const lowStockCount = inventoryData.filter(i => i.status === 'Low Stock').length;
  const outOfStockCount = inventoryData.filter(i => i.status === 'Out of Stock').length;
  const totalValue = inventoryData.reduce((sum, i) => sum + i.stockUnits * i.unitCost, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/dashboard/inventory">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory</h1>
            <p className="text-sm text-slate-500 mt-0.5">Monitor and manage stock levels across all shops</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all">
              <Icon name="ArrowDownTrayIcon" size={15} className="text-slate-400" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150">
              <Icon name="PlusIcon" size={16} className="text-white" />
              Add Item
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total SKUs</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="ClipboardDocumentListIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalSKUs}</p>
            <p className="text-xs text-slate-400 mt-1">Across all shops</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Units</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="CubeIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalUnits.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">In stock</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Low Stock</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Icon name="ExclamationTriangleIcon" size={16} className="text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600">{lowStockCount}</p>
            <p className="text-xs text-slate-400 mt-1">Needs reorder</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Out of Stock</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Icon name="XCircleIcon" size={16} className="text-red-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-600">{outOfStockCount}</p>
            <p className="text-xs text-slate-400 mt-1">Urgent attention</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Inventory Value</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="BanknotesIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">${(totalValue / 1000).toFixed(1)}k</p>
            <p className="text-xs text-slate-400 mt-1">Total stock value</p>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Inventory List</h3>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} items found</p>
            </div>
            <div className="relative w-52">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search items, SKU…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StockStatus | 'All')}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Overstocked">Overstocked</option>
            </select>
            <select
              value={shopFilter}
              onChange={e => setShopFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              {shops.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="pl-5 pr-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedRows.size === filtered.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                    />
                  </th>
                  {([
                    { key: 'name', label: 'Item' },
                    { key: 'category', label: 'Category' },
                    { key: 'shop', label: 'Shop' },
                    { key: 'stockUnits', label: 'Stock Units' },
                    { key: 'reorderPoint', label: 'Reorder Point' },
                    { key: 'unitCost', label: 'Unit Cost' },
                    { key: 'status', label: 'Status' },
                    { key: 'actions', label: '' },
                  ] as { key: string; label: string }[]).map(col => (
                    <th
                      key={`th-${col.key}`}
                      onClick={col.key !== 'actions' ? () => toggleSort(col.key as SortKey) : undefined}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap ${col.key !== 'actions' ? 'cursor-pointer hover:text-slate-600 select-none' : ''} ${col.key === 'name' ? 'min-w-[220px]' : ''}`}
                    >
                      {col.label}
                      {col.key !== 'actions' && <SortIcon col={col.key as SortKey} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(item => {
                  const cfg = statusConfig[item.status];
                  const isSelected = selectedRows.has(item.id);
                  const isLow = item.stockUnits > 0 && item.stockUnits <= item.reorderPoint;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                      <td className="pl-5 pr-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(item.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{item.category}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <Icon name="BuildingStorefrontIcon" size={11} className="text-slate-400" />
                          {item.shop}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold ${item.stockUnits === 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {item.stockUnits.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">units</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-slate-600">{item.reorderPoint}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-slate-700">${item.unitCost.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Icon name="TrashIcon" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Icon name="ClipboardDocumentListIcon" size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-400">No inventory items found</p>
                      <p className="text-xs text-slate-300 mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {inventoryData.length} items</p>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-all disabled:opacity-40">
                Previous
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-700 transition-all">
                1
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-all">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
