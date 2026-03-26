'use client';
import React, { useState, useMemo } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
type Priority = 'High' | 'Medium' | 'Low';

interface RestockRequest {
  id: string;
  sku: string;
  productName: string;
  category: string;
  currentQty: number;
  requestedQty: number;
  unitCost: number;
  priority: Priority;
  status: RequestStatus;
  requestedBy: string;
  requestedDate: string;
  notes: string;
}

const restockData: RestockRequest[] = [
  { id: 'rr-001', sku: 'APP-001', productName: 'Nike Air Max 270 — Men\'s Sz 42', category: 'Apparel', currentQty: 0, requestedQty: 30, unitCost: 120, priority: 'High', status: 'Pending', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-26', notes: 'Completely out of stock, high demand item' },
  { id: 'rr-002', sku: 'ELC-002', productName: 'JBL Bluetooth Speaker Charge 5', category: 'Electronics', currentQty: 0, requestedQty: 15, unitCost: 75, priority: 'High', status: 'Approved', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-25', notes: 'Urgent — 3 customer pre-orders waiting' },
  { id: 'rr-003', sku: 'FDB-003', productName: 'Golden Morn Cereal 1kg', category: 'Food & Bev', currentQty: 4, requestedQty: 50, unitCost: 8, priority: 'Medium', status: 'Pending', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-25', notes: 'Below reorder point, weekly top-seller' },
  { id: 'rr-004', sku: 'HLB-002', productName: 'Nivea Face Cream 50ml', category: 'Health & Beauty', currentQty: 6, requestedQty: 40, unitCost: 9, priority: 'Medium', status: 'Fulfilled', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-22', notes: '' },
  { id: 'rr-005', sku: 'HLB-001', productName: 'Dettol Antiseptic Liquid 1L', category: 'Health & Beauty', currentQty: 6, requestedQty: 60, unitCost: 7, priority: 'Medium', status: 'Approved', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-24', notes: 'Regular replenishment' },
  { id: 'rr-006', sku: 'ELC-003', productName: 'Philips LED Bulb Pack (10pcs)', category: 'Electronics', currentQty: 3, requestedQty: 25, unitCost: 14, priority: 'Low', status: 'Rejected', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-20', notes: 'Supplier out of stock — budget reallocation needed' },
  { id: 'rr-007', sku: 'FDB-001', productName: 'Indomie Noodles (Carton)', category: 'Food & Bev', currentQty: 320, requestedQty: 100, unitCost: 18, priority: 'Low', status: 'Pending', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-26', notes: 'Proactive restock before festive season' },
  { id: 'rr-008', sku: 'APP-002', productName: 'Zara Summer Dress', category: 'Apparel', currentQty: 22, requestedQty: 20, unitCost: 68, priority: 'Low', status: 'Fulfilled', requestedBy: 'Tunde Okafor', requestedDate: '2026-03-18', notes: '' },
];

const statusConfig: Record<RequestStatus, { className: string; dot: string }> = {
  'Pending': { className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  'Approved': { className: 'bg-sky-50 text-sky-700 border border-sky-200', dot: 'bg-sky-500' },
  'Fulfilled': { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  'Rejected': { className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
};

const priorityConfig: Record<Priority, { className: string }> = {
  'High': { className: 'bg-red-50 text-red-700 border border-red-200' },
  'Medium': { className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'Low': { className: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

type SortKey = 'productName' | 'category' | 'currentQty' | 'requestedQty' | 'priority' | 'status' | 'requestedDate';
type SortDir = 'asc' | 'desc';

export default function ShopAdminRestockPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('requestedDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showNewRequest, setShowNewRequest] = useState(false);

  const filtered = useMemo(() => {
    let data = [...restockData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') data = data.filter(r => r.status === statusFilter);
    if (priorityFilter !== 'All') data = data.filter(r => r.priority === priorityFilter);
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, statusFilter, priorityFilter, sortKey, sortDir]);

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
    else setSelectedRows(new Set(filtered.map(r => r.id)));
  };

  const pending = restockData.filter(r => r.status === 'Pending').length;
  const approved = restockData.filter(r => r.status === 'Approved').length;
  const fulfilled = restockData.filter(r => r.status === 'Fulfilled').length;
  const totalValue = restockData.reduce((s, r) => s + r.requestedQty * r.unitCost, 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-emerald-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-emerald-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <ShopAdminLayout activeRoute="/shop-admin/restock">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-900">Restock Requests</h1>
              {pending > 0 && (
                <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  {pending} pending
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">Track and manage inventory restock requests for Lekki Branch</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
              <Icon name="ArrowDownTrayIcon" size={15} className="text-slate-400" />
              Export
            </button>
            <button
              onClick={() => setShowNewRequest(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-150 shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Icon name="PlusIcon" size={15} />
              New Request
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: pending, icon: 'ClockIcon', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
            { label: 'Approved', value: approved, icon: 'CheckCircleIcon', color: 'bg-sky-50 text-sky-600', border: 'border-sky-100' },
            { label: 'Fulfilled', value: fulfilled, icon: 'TruckIcon', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
            { label: 'Est. Value', value: `$${totalValue.toLocaleString()}`, icon: 'BanknotesIcon', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
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
                placeholder="Search requests..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as RequestStatus | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as Priority | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="All">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500">{selectedRows.size} selected</span>
                  <button className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium">
                    Cancel
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
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('productName')}>
                    Product <SortIcon col="productName" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('currentQty')}>
                    Current Qty <SortIcon col="currentQty" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('requestedQty')}>
                    Requested Qty <SortIcon col="requestedQty" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Est. Cost</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                    Priority <SortIcon col="priority" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('requestedDate')}>
                    Date <SortIcon col="requestedDate" />
                  </th>
                  <th className="pr-5 pl-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400">
                      <Icon name="TruckIcon" size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No restock requests found</p>
                    </td>
                  </tr>
                ) : filtered.map((req, idx) => (
                  <tr
                    key={req.id}
                    className={`
                      border-b border-slate-50 transition-colors duration-100
                      ${selectedRows.has(req.id) ? 'bg-emerald-50/40' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}
                      hover:bg-emerald-50/20
                    `}
                  >
                    <td className="pl-5 pr-3 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(req.id)}
                        onChange={() => toggleRow(req.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{req.productName}</p>
                        <p className="text-xs text-slate-400">{req.sku} · {req.category}</p>
                        {req.notes && (
                          <p className="text-xs text-slate-400 mt-0.5 italic truncate max-w-xs">{req.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`font-semibold ${req.currentQty === 0 ? 'text-red-600' : req.currentQty < 10 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {req.currentQty}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-slate-800">{req.requestedQty}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-slate-700">${(req.requestedQty * req.unitCost).toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${priorityConfig[req.priority].className}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig[req.status].className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[req.status].dot}`} />
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-500">{req.requestedDate}</td>
                    <td className="pr-5 pl-3 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-all duration-150" title="View">
                          <Icon name="EyeIcon" size={14} />
                        </button>
                        {req.status === 'Pending' && (
                          <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-all duration-150" title="Edit">
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                        )}
                        {req.status === 'Pending' && (
                          <button className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-150" title="Cancel">
                            <Icon name="TrashIcon" size={14} />
                          </button>
                        )}
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
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of <span className="font-semibold text-slate-700">{restockData.length}</span> requests
            </p>
          </div>
        </div>

        {/* New Request Modal (inline slide-in) */}
        {showNewRequest && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowNewRequest(false)}>
            <div
              className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-800">New Restock Request</h3>
                <button onClick={() => setShowNewRequest(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                  <Icon name="XMarkIcon" size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Product SKU / Name</label>
                  <input
                    type="text"
                    placeholder="Search product..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Requested Qty</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Priority</label>
                    <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notes (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Reason for restock request..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowNewRequest(false)}
                    className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowNewRequest(false)}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md shadow-emerald-600/20"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShopAdminLayout>
  );
}
