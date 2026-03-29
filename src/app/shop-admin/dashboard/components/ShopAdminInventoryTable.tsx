'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';

interface InventoryItem {
  _id:          string;
  sku:          string;
  name:         string;
  availableQty: number;
  totalQty:     number;
  price:        number;
  shopName:     string;
}

interface Props {
  shopId:   string;
  shopName: string;
}

type FilterStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

function statusOf(qty: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (qty === 0) return 'out_of_stock';
  if (qty <= 20) return 'low_stock';
  return 'in_stock';
}

const statusConfig = {
  in_stock:     { label: 'In Stock',     bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  low_stock:    { label: 'Low Stock',    bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  out_of_stock: { label: 'Out of Stock', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
};

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ShopAdminInventoryTable({ shopId, shopName }: Props) {
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    fetch(`/api/inventory?shopId=${shopId}&limit=200`)
      .then(r => r.json())
      .then(data => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [shopId]);

  const filtered = useMemo(() => items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const st = statusOf(item.availableQty);
    const matchStatus = filterStatus === 'all' || st === filterStatus;
    return matchSearch && matchStatus;
  }), [items, search, filterStatus]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">My Shop Inventory</h3>
            <p className="text-xs text-slate-400 mt-0.5">{shopName || 'My Shop'} · {loading ? '…' : `${items.length} products`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600 px-2 sm:px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all shrink-0">
            <option value="all">All</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 sm:px-5 py-3">Product</th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 sm:px-4 py-3">Qty</th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 sm:px-4 py-3 hidden md:table-cell">Price</th>
              <th className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 sm:px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-4 sm:px-5 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse w-32 sm:w-40" /></td>
                  <td className="px-3 sm:px-4 py-3 text-right"><div className="h-3 bg-slate-100 rounded animate-pulse w-8 ml-auto" /></td>
                  <td className="px-3 sm:px-4 py-3 text-right hidden md:table-cell"><div className="h-3 bg-slate-100 rounded animate-pulse w-12 ml-auto" /></td>
                  <td className="px-3 sm:px-4 py-3 text-center"><div className="h-4 bg-slate-100 rounded-full animate-pulse w-16 sm:w-20 mx-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                  {items.length === 0 ? 'No products in this shop yet.' : 'No products match your search.'}
                </td>
              </tr>
            ) : filtered.map(item => {
              const st = statusOf(item.availableQty);
              const sc = statusConfig[st];
              return (
                <tr key={item._id} className="hover:bg-slate-50/60 transition-colors duration-100">
                  <td className="px-4 sm:px-5 py-3">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">{item.sku}</p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <span className={`text-xs sm:text-sm font-tabular font-semibold ${st === 'out_of_stock' ? 'text-red-600' : st === 'low_stock' ? 'text-amber-600' : 'text-slate-700'}`}>
                      {item.availableQty}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 ml-1">/ {item.totalQty}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-xs sm:text-sm font-tabular text-slate-700">{fmtCurrency(item.price)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40">
          <p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of <span className="font-semibold text-slate-700">{items.length}</span> products</p>
        </div>
      )}
    </div>
  );
}


