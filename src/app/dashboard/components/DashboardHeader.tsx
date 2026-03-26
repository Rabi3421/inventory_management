import React from 'react';
import Icon from '@/components/ui/AppIcon';

export default function DashboardHeader() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Thursday, March 26, 2026 · All 6 shops synced
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
          <Icon name="CalendarDaysIcon" size={15} className="text-slate-400" />
          Last 30 days
          <Icon name="ChevronDownIcon" size={13} className="text-slate-400" />
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
          <Icon name="ArrowPathIcon" size={15} className="text-slate-400" />
          Refresh
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-150 shadow-md shadow-indigo-600/20 active:scale-95">
          <Icon name="PlusIcon" size={15} />
          Add Product
        </button>
      </div>
    </div>
  );
}