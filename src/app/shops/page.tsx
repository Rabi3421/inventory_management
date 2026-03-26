'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type ShopStatus = 'Active' | 'Inactive' | 'Suspended';

interface Shop {
  id: string;
  name: string;
  location: string;
  manager: string;
  phone: string;
  totalSKUs: number;
  totalStock: number;
  lowStockAlerts: number;
  status: ShopStatus;
  lastSynced: string;
  revenue: number;
}

const shopsData: Shop[] = [
  { id: 'sh-001', name: 'Lekki Branch', location: 'Lekki Phase 1, Lagos', manager: 'Tunde Okafor', phone: '+234 803 123 4567', totalSKUs: 248, totalStock: 14300, lowStockAlerts: 5, status: 'Active', lastSynced: '2 min ago', revenue: 128400 },
  { id: 'sh-002', name: 'Ikeja Branch', location: 'Allen Ave, Ikeja, Lagos', manager: 'Ngozi Adeyemi', phone: '+234 806 234 5678', totalSKUs: 312, totalStock: 18420, lowStockAlerts: 3, status: 'Active', lastSynced: '5 min ago', revenue: 195200 },
  { id: 'sh-003', name: 'Surulere Branch', location: 'Bode Thomas St, Surulere', manager: 'Emeka Nwosu', phone: '+234 809 345 6789', totalSKUs: 189, totalStock: 11800, lowStockAlerts: 7, status: 'Active', lastSynced: '1 min ago', revenue: 98600 },
  { id: 'sh-004', name: 'Yaba Branch', location: 'Herbert Macaulay Way, Yaba', manager: 'Amaka Obi', phone: '+234 812 456 7890', totalSKUs: 221, totalStock: 16540, lowStockAlerts: 2, status: 'Active', lastSynced: '3 min ago', revenue: 142800 },
  { id: 'sh-005', name: 'Ajah Branch', location: 'Lekki-Epe Expressway, Ajah', manager: 'Damilola Eze', phone: '+234 815 567 8901', totalSKUs: 167, totalStock: 9200, lowStockAlerts: 11, status: 'Active', lastSynced: '8 min ago', revenue: 76300 },
  { id: 'sh-006', name: 'Victoria Island', location: 'Adeola Odeku St, VI, Lagos', manager: 'Chioma Agu', phone: '+234 818 678 9012', totalSKUs: 276, totalStock: 15600, lowStockAlerts: 4, status: 'Active', lastSynced: '4 min ago', revenue: 218900 },
  { id: 'sh-007', name: 'Maryland Branch', location: 'Ikorodu Rd, Maryland, Lagos', manager: 'Seun Badmus', phone: '+234 821 789 0123', totalSKUs: 143, totalStock: 7200, lowStockAlerts: 0, status: 'Inactive', lastSynced: '2 days ago', revenue: 0 },
  { id: 'sh-008', name: 'Apapa Branch', location: 'Creek Rd, Apapa, Lagos', manager: 'Kunle Martins', phone: '+234 824 890 1234', totalSKUs: 98, totalStock: 3400, lowStockAlerts: 0, status: 'Suspended', lastSynced: '1 week ago', revenue: 0 },
];

const statusConfig: Record<ShopStatus, { className: string; dot: string }> = {
  'Active': { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  'Inactive': { className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  'Suspended': { className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
};

type SortKey = 'name' | 'location' | 'totalSKUs' | 'totalStock' | 'lowStockAlerts' | 'status' | 'revenue';
type SortDir = 'asc' | 'desc';

export default function ShopsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShopStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let data = [...shopsData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.manager.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') data = data.filter(s => s.status === statusFilter);
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
    else setSelectedRows(new Set(filtered.map(s => s.id)));
  };

  const totalActive = shopsData.filter(s => s.status === 'Active').length;
  const totalInactive = shopsData.filter(s => s.status === 'Inactive').length;
  const totalSuspended = shopsData.filter(s => s.status === 'Suspended').length;
  const totalRevenue = shopsData.reduce((sum, s) => sum + s.revenue, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/shops">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-900">Shops</h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                {shopsData.length} total
              </span>
            </div>
            <p className="text-slate-500 text-sm">Manage and monitor all shop branches</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
              <Icon name="ArrowDownTrayIcon" size={15} className="text-slate-400" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-150 shadow-md shadow-indigo-600/20 active:scale-95">
              <Icon name="PlusIcon" size={15} />
              Add Shop
            </button>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Shops', value: totalActive, icon: 'BuildingStorefrontIcon', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
            { label: 'Inactive Shops', value: totalInactive, icon: 'BuildingOffice2Icon', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
            { label: 'Suspended', value: totalSuspended, icon: 'NoSymbolIcon', color: 'bg-red-50 text-red-600', border: 'border-red-100' },
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: 'BanknotesIcon', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-card p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-lg font-bold text-slate-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative max-w-xs w-full">
              <Icon name="MagnifyingGlassIcon" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shops..."
                value={search}
                onChange={e => { setSearch(e.target.value); }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ShopStatus | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500">{selectedRows.size} selected</span>
                  <button className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium">
                    Delete
                  </button>
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
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    Shop <SortIcon col="name" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('totalSKUs')}>
                    SKUs <SortIcon col="totalSKUs" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('totalStock')}>
                    Stock Units <SortIcon col="totalStock" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('lowStockAlerts')}>
                    Alerts <SortIcon col="lowStockAlerts" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('revenue')}>
                    Revenue <SortIcon col="revenue" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Last Synced</th>
                  <th className="pr-5 pl-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400">
                      <Icon name="BuildingStorefrontIcon" size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No shops found</p>
                    </td>
                  </tr>
                ) : filtered.map((shop, idx) => (
                  <tr
                    key={shop.id}
                    className={`
                      border-b border-slate-50 transition-colors duration-100 group
                      ${selectedRows.has(shop.id) ? 'bg-indigo-50/40' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}
                      hover:bg-indigo-50/30
                    `}
                  >
                    <td className="pl-5 pr-3 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(shop.id)}
                        onChange={() => toggleRow(shop.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <Icon name="BuildingStorefrontIcon" size={16} className="text-indigo-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{shop.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Icon name="MapPinIcon" size={11} className="shrink-0" />
                            {shop.location}
                          </p>
                          <p className="text-xs text-slate-400">{shop.manager}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-slate-800">{shop.totalSKUs.toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-slate-800">{shop.totalStock.toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      {shop.lowStockAlerts > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Icon name="ExclamationTriangleIcon" size={11} />
                          {shop.lowStockAlerts}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {shop.revenue > 0 ? (
                        <span className="font-semibold text-slate-800">${shop.revenue.toLocaleString()}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig[shop.status].className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[shop.status].dot}`} />
                        {shop.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-500">{shop.lastSynced}</td>
                    <td className="pr-5 pl-3 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all duration-150" title="View Shop">
                          <Icon name="EyeIcon" size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all duration-150" title="Edit Shop">
                          <Icon name="PencilSquareIcon" size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-150" title="Delete Shop">
                          <Icon name="TrashIcon" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of <span className="font-semibold text-slate-700">{shopsData.length}</span> shops
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
