'use client';
import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useRouter } from 'next/navigation';

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
  { id: 'qa-add-product',   label: 'Add New Product',  description: 'Create a new SKU with barcode',    icon: 'PlusCircleIcon',    color: 'text-emerald-700', bgColor: 'bg-emerald-50 hover:bg-emerald-100', borderColor: 'border-emerald-100', href: '/shop-admin/products' },
  { id: 'qa-scan-barcode',  label: 'Scan Barcode',     description: 'Look up or update by scan',       icon: 'QrCodeIcon',        color: 'text-indigo-700',  bgColor: 'bg-indigo-50 hover:bg-indigo-100',   borderColor: 'border-indigo-100',  href: '' },
  { id: 'qa-restock',       label: 'Record Restock',   description: 'Log incoming stock delivery',     icon: 'TruckIcon',         color: 'text-sky-700',    bgColor: 'bg-sky-50 hover:bg-sky-100',         borderColor: 'border-sky-100',     href: '/shop-admin/restock' },
  { id: 'qa-export-report', label: 'Export Report',    description: 'Download my shop CSV report',     icon: 'ArrowDownTrayIcon', color: 'text-violet-700',  bgColor: 'bg-violet-50 hover:bg-violet-100',   borderColor: 'border-violet-100',  href: '/shop-admin/reports' },
];

export default function ShopAdminQuickActions({ alerts, loading }: Props) {
  const [activeSection, setActiveSection] = useState<'actions' | 'alerts'>('actions');
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden h-full flex flex-col">
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm sm:text-base font-semibold text-slate-800">Quick Actions</h3>
          {!loading && alerts.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5 font-medium">
              <Icon name="ExclamationCircleIcon" size={12} />{alerts.length} alerts
            </span>
          )}
        </div>
        <div className="flex gap-1 mt-3 p-0.5 bg-slate-100 rounded-lg">
          {([{ key: 'actions', label: 'Actions' }, { key: 'alerts', label: 'Stock Alerts' }] as { key: 'actions' | 'alerts'; label: string }[]).map(tab => (
            <button key={`panel-tab-${tab.key}`} onClick={() => setActiveSection(tab.key)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                activeSection === tab.key ? 'bg-white text-emerald-700 shadow-card' : 'text-slate-500 hover:text-slate-700'
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {activeSection === 'actions' ? (
          <div className="space-y-2">
            {quickActions.map(action => (
              <button key={action.id} onClick={() => action.href && router.push(action.href)}
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
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Icon name="CheckCircleIcon" size={32} className="text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">All stocked up!</p>
            <p className="text-xs text-slate-400 mt-1">No items need immediate attention.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-3 font-medium">Products requiring immediate attention</p>
            {alerts.map(alert => (
              <div key={alert._id}
                className={`p-3 rounded-xl border ${alert.status === 'out' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{alert.name}</p>
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    alert.status === 'out' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{alert.status === 'out' ? 'Out of Stock' : 'Low Stock'}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mb-1.5">{alert.sku}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-tabular">
                    <span className={`font-semibold ${alert.status === 'out' ? 'text-red-600' : 'text-amber-600'}`}>{alert.qty}</span>
                    <span className="text-slate-400"> / {alert.threshold} threshold</span>
                  </span>
                </div>
                <button className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
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


