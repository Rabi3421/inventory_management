'use client';
import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface Props {
  shopName:     string;
  range:        string;
  onRangeChange:(r: string) => void;
  onRefresh:    () => void;
  refreshing:   boolean;
  lastRefreshed:Date | null;
}

const RANGES = [
  { value: '7d',  label: 'Last 7 days'  },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

function timeAgo(d: Date | null) {
  if (!d) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ShopAdminDashboardHeader({
  shopName, range, onRangeChange, onRefresh, refreshing, lastRefreshed,
}: Props) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const synced = timeAgo(lastRefreshed);

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {shopName || 'My Shop'} — Live
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">My Shop Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {today} · {shopName || 'My Shop'}{synced ? ` · Last synced ${synced}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <select
            value={range}
            onChange={e => onRangeChange(e.target.value)}
            className="appearance-none flex items-center gap-2 pl-8 pr-8 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            {RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Icon name="CalendarDaysIcon" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Icon name="ChevronDownIcon" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-sm disabled:opacity-60">
          <Icon name="ArrowPathIcon" size={15} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-150 shadow-md shadow-emerald-600/20 active:scale-95">
          <Icon name="PlusIcon" size={15} />
          Add Product
        </button>
      </div>
    </div>
  );
}
