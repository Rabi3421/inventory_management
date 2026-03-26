'use client';
import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  qty: number;
  threshold: number;
  price: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

const inventoryData: InventoryItem[] = [
  { id: 'inv-001', sku: 'EL-TV-001', name: 'Samsung 55" QLED TV', category: 'Electronics', qty: 2, threshold: 10, price: '$1,299', status: 'low_stock', lastUpdated: '2h ago' },
  { id: 'inv-002', sku: 'CL-NK-002', name: 'Nike Air Max 270', category: 'Clothing', qty: 0, threshold: 15, price: '$149', status: 'out_of_stock', lastUpdated: '5h ago' },
  { id: 'inv-003', sku: 'FD-ND-003', name: 'Indomie Noodles 70g (Carton)', category: 'Food & Bev', qty: 4, threshold: 20, price: '$18', status: 'low_stock', lastUpdated: '1h ago' },
  { id: 'inv-004', sku: 'EL-IP-004', name: 'iPhone 15 Pro Case', category: 'Electronics', qty: 0, threshold: 8, price: '$29', status: 'out_of_stock', lastUpdated: '3h ago' },
  { id: 'inv-005', sku: 'HM-CH-005', name: 'Wooden Dining Chair', category: 'Home & Living', qty: 18, threshold: 5, price: '$89', status: 'in_stock', lastUpdated: '1d ago' },
  { id: 'inv-006', sku: 'EL-HP-006', name: 'HP LaserJet Printer', category: 'Electronics', qty: 7, threshold: 3, price: '$349', status: 'in_stock', lastUpdated: '6h ago' },
  { id: 'inv-007', sku: 'CL-AD-007', name: 'Adidas Track Jacket', category: 'Clothing', qty: 24, threshold: 10, price: '$75', status: 'in_stock', lastUpdated: '2d ago' },
  { id: 'inv-008', sku: 'FD-WA-008', name: 'Bottled Water 1.5L (Crate)', category: 'Food & Bev', qty: 60, threshold: 30, price: '$12', status: 'in_stock', lastUpdated: '4h ago' },
];

const statusConfig = {
  in_stock: { label: 'In Stock', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  low_stock: { label: 'Low Stock', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  out_of_stock: { label: 'Out of Stock', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

type FilterStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function ShopAdminInventoryTable() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const filtered = inventoryData.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">My Shop Inventory</h3>
          <p className="text-xs text-slate-400 mt-0.5">Lekki Branch · {inventoryData.length} products</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 w-44 transition-all"
            />
          </div>
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
          >
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Category</th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Qty</th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Price</th>
              <th className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(item => {
              const sc = statusConfig[item.status];
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors duration-100 group">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-slate-500">{item.category}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm font-tabular font-semibold ${item.status === 'out_of_stock' ? 'text-red-600' : item.status === 'low_stock' ? 'text-amber-600' : 'text-slate-700'}`}>
                      {item.qty}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">/ {item.threshold}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <span className="text-sm font-tabular text-slate-700">{item.price}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                    <span className="text-xs text-slate-400">{item.lastUpdated}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
