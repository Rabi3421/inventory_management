'use client';
import React from 'react';
import Icon from '@/components/ui/AppIcon';

export interface ShopKPIData {
  totalSKUs:      number;
  availableUnits: number;
  totalValue:     number;
  lowStock:       number;
  outOfStock:     number;
  thisMonth:      number;
}

interface Props {
  data:     ShopKPIData | null;
  loading:  boolean;
  shopName: string;
}

function fmt(n: number) { return n.toLocaleString('en-IN'); }
function fmtCurrency(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

export default function ShopAdminKPIGrid({ data, loading, shopName }: Props) {
  const cards = [
    {
      id: 'skus', label: 'My Shop SKUs', variant: 'hero' as const, colSpan: 2,
      value: loading || !data ? null : fmt(data.totalSKUs),
      sub: `active products in ${shopName || 'my shop'}`,
      trend: data && data.thisMonth > 0 ? { dir: 'up', val: `+${data.thisMonth}`, label: 'added this month' } : null,
      icon: 'CubeIcon',
    },
    {
      id: 'units', label: 'Stock Units', variant: 'default' as const, colSpan: 1,
      value: loading || !data ? null : fmt(data.availableUnits),
      sub: 'units on hand', trend: null, icon: 'ArchiveBoxIcon',
    },
    {
      id: 'low', label: 'Low Stock', variant: 'warning' as const, colSpan: 1,
      value: loading || !data ? null : fmt(data.lowStock),
      sub: 'products need reorder',
      trend: data && data.lowStock > 0 ? { dir: 'up', val: `${data.lowStock}`, label: 'need attention' } : null,
      icon: 'ExclamationTriangleIcon',
    },
    {
      id: 'out', label: 'Out of Stock', variant: 'danger' as const, colSpan: 1,
      value: loading || !data ? null : fmt(data.outOfStock),
      sub: 'products at zero qty',
      trend: data && data.outOfStock > 0 ? { dir: 'up', val: `${data.outOfStock}`, label: 'at zero' } : null,
      icon: 'XCircleIcon',
    },
    {
      id: 'value', label: 'Shop Stock Value', variant: 'info' as const, colSpan: 2,
      value: loading || !data ? null : fmtCurrency(data.totalValue),
      sub: 'estimated at cost', trend: null, icon: 'BanknotesIcon',
    },
  ];

  const variants = {
    hero:    { card: 'bg-emerald-600 border-emerald-500', icon: 'text-emerald-200', iconBg: 'bg-emerald-700/60', label: 'text-emerald-200', value: 'text-white', sub: 'text-emerald-200', trendUp: 'text-emerald-200', trendDown: 'text-emerald-200', trendSub: 'text-emerald-300' },
    default: { card: 'bg-white border-slate-100', icon: 'text-slate-500', iconBg: 'bg-slate-100', label: 'text-slate-400', value: 'text-slate-900', sub: 'text-slate-400', trendUp: 'text-emerald-600', trendDown: 'text-red-500', trendSub: 'text-slate-400' },
    warning: { card: 'bg-amber-50 border-amber-100', icon: 'text-amber-600', iconBg: 'bg-amber-100', label: 'text-amber-600/80', value: 'text-slate-900', sub: 'text-amber-700/60', trendUp: 'text-amber-700', trendDown: 'text-emerald-600', trendSub: 'text-amber-600/60' },
    danger:  { card: 'bg-red-50 border-red-100', icon: 'text-red-600', iconBg: 'bg-red-100', label: 'text-red-500/80', value: 'text-slate-900', sub: 'text-red-700/60', trendUp: 'text-red-600', trendDown: 'text-emerald-600', trendSub: 'text-red-500/60' },
    info:    { card: 'bg-white border-slate-100', icon: 'text-emerald-600', iconBg: 'bg-emerald-50', label: 'text-slate-400', value: 'text-slate-900', sub: 'text-slate-400', trendUp: 'text-emerald-600', trendDown: 'text-red-500', trendSub: 'text-slate-400' },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(card => {
        const s = variants[card.variant];
        const isHero = card.variant === 'hero';
        const trendColor = card.trend ? (card.trend.dir === 'up' ? s.trendUp : s.trendDown) : '';
        return (
          <div key={card.id}
            className={`${card.colSpan === 2 ? 'col-span-2' : 'col-span-1'} rounded-2xl border p-5 shadow-card transition-all duration-200 hover:shadow-card-md hover:-translate-y-0.5 ${s.card}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${s.label}`}>{card.label}</p>
                {loading || !data ? (
                  <div className="space-y-2 mt-1">
                    <div className={`h-8 rounded animate-pulse w-24 ${isHero ? 'bg-emerald-500/30' : 'bg-slate-200'}`} />
                    <div className={`h-2.5 rounded animate-pulse w-32 ${isHero ? 'bg-emerald-500/20' : 'bg-slate-150'}`} />
                  </div>
                ) : (
                  <>
                    <p className={`font-tabular font-bold leading-none mb-1 ${isHero ? 'text-4xl' : 'text-3xl'} ${s.value}`}>{card.value}</p>
                    <p className={`text-xs mt-1.5 ${s.sub}`}>{card.sub}</p>
                    {card.trend && (
                      <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
                        <Icon name={card.trend.dir === 'up' ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} size={13} />
                        <span>{card.trend.val}</span>
                        <span className={`font-normal ${s.trendSub}`}>{card.trend.label}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={22} className={s.icon} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

