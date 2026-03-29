'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export interface StockAlert {
  _id:       string;
  sku:       string;
  name:      string;
  qty:       number;
  threshold: number;
  status:    'low' | 'out';
}

interface Props {
  alerts:  StockAlert[];
  loading: boolean;
}

const quickActions = [
  { id: 'qa-add-product',   label: 'Add New Product',  description: 'Create a new SKU with barcode', icon: 'PlusCircleIcon',      color: 'text-indigo-700', bgColor: 'bg-indigo-50 hover:bg-indigo-100', borderColor: 'border-indigo-100', href: '/dashboard/products' },
  { id: 'qa-scan-barcode',  label: 'Scan Barcode',     description: 'Look up or update by scan',    icon: 'QrCodeIcon',           color: 'text-emerald-700',bgColor: 'bg-emerald-50 hover:bg-emerald-100', borderColor: 'border-emerald-100', href: '/dashboard/inventory' },
  { id: 'qa-add-category',  label: 'Add Category',     description: 'Create a new product category',icon: 'TagIcon',              color: 'text-amber-700',  bgColor: 'bg-amber-50 hover:bg-amber-100',   borderColor: 'border-amber-100',  href: '/dashboard/categories' },
  { id: 'qa-stock-transfer',label: 'Transfer Stock',   description: 'Move items between shops',     icon: 'ArrowsRightLeftIcon',  color: 'text-sky-700',    bgColor: 'bg-sky-50 hover:bg-sky-100',       borderColor: 'border-sky-100',    href: '/dashboard/inventory' },
  { id: 'qa-export-report', label: 'Export Report',    description: 'Download CSV inventory report',icon: 'ArrowDownTrayIcon',    color: 'text-violet-700', bgColor: 'bg-violet-50 hover:bg-violet-100', borderColor: 'border-violet-100', href: '/reports' },
];

function AlertSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-slate-100 h-[72px]" />
      ))}
    </div>
  );
}

export default function QuickActionsPanel({ alerts, loading }: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'actions' | 'alerts'>('actions');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden h-full flex flex-col">
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm sm:text-base font-semibold text-slate-800">Quick Actions</h3>
          {loading ? (
            <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
          ) : (
            <span className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 border
              ${alerts.length > 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
              <Icon name={alerts.length > 0 ? 'ExclamationCircleIcon' : 'CheckCircleIcon'} size={12} />
              {alerts.length > 0 ? `${alerts.length} alerts` : 'All clear'}
            </span>
          )}
        </div>
        <div className="flex gap-1 mt-3 p-0.5 bg-slate-100 rounded-lg">
          {([{ key: 'actions', label: 'Actions' }, { key: 'alerts', label: 'Stock Alerts' }] as { key: 'actions' | 'alerts'; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                ${activeSection === tab.key ? 'bg-white text-indigo-700 shadow-card' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {activeSection === 'actions' ? (
          <div className="space-y-2">
            {quickActions.map(action => (
              <button key={action.id} onClick={() => router.push(action.href)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] ${action.bgColor} ${action.borderColor}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/60">
                  <Icon name={action.icon as Parameters<typeof Icon>[0]['name']} size={18} className={action.color} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${action.color}`}>{action.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                </div>
                <Icon name="ChevronRightIcon" size={14} className="text-slate-300 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-3 font-medium">Products requiring immediate attention</p>
            {loading ? <AlertSkeleton /> : alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Icon name="CheckCircleIcon" size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600">All stock levels healthy</p>
                <p className="text-xs text-slate-400">No products need attention right now.</p>
              </div>
            ) : alerts.map(alert => (
              <div key={alert._id}
                className={`p-3 rounded-xl border ${alert.status === 'out' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-slate-700 leading-tight truncate max-w-[160px]" title={alert.name}>{alert.name}</p>
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                    ${alert.status === 'out' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {alert.status === 'out' ? 'Out of Stock' : 'Low Stock'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-slate-400">{alert.sku}</span>
                  <span className="font-tabular">
                    <span className={`font-semibold ${alert.status === 'out' ? 'text-red-600' : 'text-amber-600'}`}>{alert.qty}</span>
                    <span className="text-slate-400"> / {alert.threshold} threshold</span>
                  </span>
                </div>
                <button onClick={() => router.push('/dashboard/inventory')}
                  className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <Icon name="ArrowPathIcon" size={11} />Reorder now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
