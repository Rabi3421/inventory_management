'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type CategoryStatus = 'Active' | 'Inactive';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  totalStock: number;
  shops: number;
  status: CategoryStatus;
  createdDate: string;
}

const categoriesData: Category[] = [
  { id: 'cat-001', name: 'Electronics', slug: 'electronics', description: 'TVs, phones, laptops, and home appliances', productCount: 48, totalStock: 1240, shops: 6, status: 'Active', createdDate: '2024-01-15' },
  { id: 'cat-002', name: 'Apparel', slug: 'apparel', description: 'Clothing, footwear, and fashion accessories', productCount: 134, totalStock: 3870, shops: 5, status: 'Active', createdDate: '2024-01-15' },
  { id: 'cat-003', name: 'Food & Bev', slug: 'food-bev', description: 'Packaged foods, beverages, and grocery items', productCount: 92, totalStock: 8450, shops: 6, status: 'Active', createdDate: '2024-02-01' },
  { id: 'cat-004', name: 'Health & Beauty', slug: 'health-beauty', description: 'Personal care, cosmetics, and wellness products', productCount: 67, totalStock: 2190, shops: 6, status: 'Active', createdDate: '2024-02-10' },
  { id: 'cat-005', name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, tools, and home improvement items', productCount: 41, totalStock: 620, shops: 4, status: 'Active', createdDate: '2024-03-05' },
  { id: 'cat-006', name: 'Sporting Goods', slug: 'sporting-goods', description: 'Sports equipment, fitness gear, and outdoor items', productCount: 29, totalStock: 480, shops: 3, status: 'Active', createdDate: '2024-03-20' },
  { id: 'cat-007', name: 'Toys & Games', slug: 'toys-games', description: 'Children toys, board games, and educational items', productCount: 55, totalStock: 1100, shops: 4, status: 'Active', createdDate: '2024-04-01' },
  { id: 'cat-008', name: 'Automotive', slug: 'automotive', description: 'Car accessories, parts, and maintenance products', productCount: 18, totalStock: 340, shops: 2, status: 'Inactive', createdDate: '2024-05-12' },
  { id: 'cat-009', name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, office supplies, and educational materials', productCount: 73, totalStock: 2600, shops: 5, status: 'Active', createdDate: '2024-04-18' },
  { id: 'cat-010', name: 'Baby & Kids', slug: 'baby-kids', description: 'Baby care, kids clothing, and nursery essentials', productCount: 38, totalStock: 890, shops: 4, status: 'Active', createdDate: '2024-06-01' },
  { id: 'cat-011', name: 'Pet Supplies', slug: 'pet-supplies', description: 'Pet food, accessories, and grooming products', productCount: 22, totalStock: 560, shops: 3, status: 'Active', createdDate: '2024-07-10' },
  { id: 'cat-012', name: 'Office Equipment', slug: 'office-equipment', description: 'Printers, scanners, and office furniture', productCount: 14, totalStock: 120, shops: 2, status: 'Inactive', createdDate: '2024-08-05' },
];

const statusConfig: Record<CategoryStatus, { className: string }> = {
  'Active': { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  'Inactive': { className: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

type SortKey = 'name' | 'productCount' | 'totalStock' | 'shops' | 'status';
type SortDir = 'asc' | 'desc';

const categoryIcons: Record<string, string> = {
  'Electronics': 'ComputerDesktopIcon',
  'Apparel': 'ShoppingBagIcon',
  'Food & Bev': 'ShoppingCartIcon',
  'Health & Beauty': 'HeartIcon',
  'Home & Garden': 'HomeIcon',
  'Sporting Goods': 'TrophyIcon',
  'Toys & Games': 'PuzzlePieceIcon',
  'Automotive': 'TruckIcon',
  'Books & Stationery': 'BookOpenIcon',
  'Baby & Kids': 'HeartIcon',
  'Pet Supplies': 'HeartIcon',
  'Office Equipment': 'ComputerDesktopIcon',
};

const categoryColors = [
  'bg-indigo-50 text-indigo-600',
  'bg-violet-50 text-violet-600',
  'bg-sky-50 text-sky-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-600',
  'bg-teal-50 text-teal-600',
  'bg-orange-50 text-orange-600',
  'bg-cyan-50 text-cyan-600',
  'bg-pink-50 text-pink-600',
  'bg-lime-50 text-lime-600',
  'bg-purple-50 text-purple-600',
];

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filtered = useMemo(() => {
    let data = [...categoriesData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') data = data.filter(c => c.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, statusFilter, sortKey, sortDir]);

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
    else setSelectedRows(new Set(filtered.map(c => c.id)));
  };

  const totalActive = categoriesData.filter(c => c.status === 'Active').length;
  const totalInactive = categoriesData.filter(c => c.status === 'Inactive').length;
  const totalProducts = categoriesData.reduce((sum, c) => sum + c.productCount, 0);
  const totalStock = categoriesData.reduce((sum, c) => sum + c.totalStock, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/dashboard/categories">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Categories</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage product categories across all shops</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150">
            <Icon name="PlusIcon" size={16} className="text-white" />
            Add Category
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Categories</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="TagIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{categoriesData.length}</p>
            <p className="text-xs text-slate-400 mt-1">Across all shops</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon name="CheckCircleIcon" size={16} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalActive}</p>
            <p className="text-xs text-slate-400 mt-1">{totalInactive} inactive</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Products</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="CubeIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalProducts}</p>
            <p className="text-xs text-slate-400 mt-1">Across categories</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Stock Units</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon name="ClipboardDocumentListIcon" size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{(totalStock / 1000).toFixed(1)}k</p>
            <p className="text-xs text-slate-400 mt-1">Units in inventory</p>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Category List</h3>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} categories found</p>
            </div>
            <div className="relative w-56">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as CategoryStatus | 'All')}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon name="Bars3Icon" size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon name="Squares2X2Icon" size={14} />
              </button>
            </div>
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

          {viewMode === 'table' ? (
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
                      { key: 'name', label: 'Category', sortable: true },
                      { key: 'slug', label: 'Slug', sortable: false },
                      { key: 'productCount', label: 'Products', sortable: true },
                      { key: 'totalStock', label: 'Total Stock', sortable: true },
                      { key: 'shops', label: 'Shops', sortable: true },
                      { key: 'status', label: 'Status', sortable: true },
                      { key: 'actions', label: '', sortable: false },
                    ] as { key: string; label: string; sortable: boolean }[]).map(col => (
                      <th
                        key={`th-${col.key}`}
                        onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                        className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''} ${col.key === 'name' ? 'min-w-[200px]' : ''}`}
                      >
                        {col.label}
                        {col.sortable && <SortIcon col={col.key as SortKey} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((cat, idx) => {
                    const colorClass = categoryColors[idx % categoryColors.length];
                    const iconName = categoryIcons[cat.name] || 'TagIcon';
                    return (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/60 transition-colors ${selectedRows.has(cat.id) ? 'bg-indigo-50/40' : ''}`}
                      >
                        <td className="pl-5 pr-3 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(cat.id)}
                            onChange={() => toggleRow(cat.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                          />
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                              <Icon name={iconName as Parameters<typeof Icon>[0]['name']} size={15} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{cat.name}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{cat.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{cat.slug}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-sm font-semibold text-slate-700">{cat.productCount}</span>
                          <span className="text-xs text-slate-400 ml-1">SKUs</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-sm font-semibold text-slate-700">{cat.totalStock.toLocaleString()}</span>
                          <span className="text-xs text-slate-400 ml-1">units</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Icon name="BuildingStorefrontIcon" size={13} className="text-slate-400" />
                            <span className="text-sm text-slate-600">{cat.shops}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusConfig[cat.status].className}`}>
                            {cat.status}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 pr-5">
                          <div className="flex items-center gap-1 justify-end">
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                              <Icon name="PencilSquareIcon" size={14} />
                            </button>
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
                              <Icon name="TrashIcon" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Icon name="TagIcon" size={32} className="mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No categories found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((cat, idx) => {
                const colorClass = categoryColors[idx % categoryColors.length];
                const iconName = categoryIcons[cat.name] || 'TagIcon';
                return (
                  <div key={cat.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon name={iconName as Parameters<typeof Icon>[0]['name']} size={18} />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[cat.status].className}`}>
                        {cat.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">{cat.name}</h4>
                    <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">{cat.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span><strong className="text-slate-700">{cat.productCount}</strong> products</span>
                      <span><strong className="text-slate-700">{cat.shops}</strong> shops</span>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-200 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="flex-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                        <Icon name="PencilSquareIcon" size={12} />
                        Edit
                      </button>
                      <button className="flex-1 text-[11px] font-medium text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                        <Icon name="TrashIcon" size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                  <Icon name="TagIcon" size={32} className="mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No categories found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
