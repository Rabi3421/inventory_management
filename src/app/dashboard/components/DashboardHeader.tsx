'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface DashboardHeaderProps {
  range: string;
  onRangeChange: (r: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  shopCount: number;
  activeShops: number;
  lastRefreshed: Date | null;
}

const RANGES = [
  { value: '7d',  label: 'Last 7 days'  },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

function formatLastRefreshed(date: Date | null) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardHeader({
  range, onRangeChange, onRefresh, refreshing, shopCount, activeShops, lastRefreshed,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [today, setToday] = useState('');
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [lastRefreshedStr, setLastRefreshedStr] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }));
  }, []);

  useEffect(() => {
    setLastRefreshedStr(formatLastRefreshed(lastRefreshed));
    const id = setInterval(() => setLastRefreshedStr(formatLastRefreshed(lastRefreshed)), 30_000);
    return () => clearInterval(id);
  }, [lastRefreshed]);

  const selectedRange = RANGES.find(r => r.value === range) ?? RANGES[1];

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {today}
          {shopCount > 0 && (
            <span className={`ml-2 ${activeShops === shopCount ? 'text-emerald-600' : 'text-amber-600'}`}>
              · {activeShops} / {shopCount} shops synced
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Range picker */}
        <div className="relative">
          <button
            onClick={() => setShowRangePicker(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-card"
          >
            <Icon name="CalendarDaysIcon" size={15} className="text-slate-400" />
            {selectedRange.label}
            <Icon name="ChevronDownIcon" size={13} className="text-slate-400" />
          </button>
          {showRangePicker && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {RANGES.map(r => (
                <button key={r.value} onClick={() => { onRangeChange(r.value); setShowRangePicker(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                    ${range === r.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          title={lastRefreshedStr ? `Last refreshed: ${lastRefreshedStr}` : ''}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-card disabled:opacity-60"
        >
          <Icon name="ArrowPathIcon" size={15} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>

        {/* Add Product */}
        <button
          onClick={() => router.push('/dashboard/products')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Icon name="PlusIcon" size={15} />
          Add Product
        </button>
      </div>
    </div>
  );
}
