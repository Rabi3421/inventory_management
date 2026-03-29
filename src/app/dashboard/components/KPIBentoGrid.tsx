'use client';
import React from 'react';
import Icon from '@/components/ui/AppIcon';

export interface KPIData {
  totalSKUs:      number;
  totalUnits:     number;
  availableUnits: number;
  totalValue:     number;
  lowStock:       number;
  outOfStock:     number;
  thisMonth:      number;
  activeShops:    number;
  totalShops:     number;
}

interface Props {
  data: KPIData | null;
  loading: boolean;
}

function fmt(n: number) { return n.toLocaleString('en-IN'); }
function fmtCurrency(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/20 rounded animate-pulse ${className}`} />;
}

function SkeletonCard({ hero = false }: { hero?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-card ${hero ? 'bg-indigo-500/30 border-indigo-400/30 col-span-2' : 'bg-slate-100 border-slate-200 col-span-1'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className={`h-2.5 rounded w-20 animate-pulse ${hero ? 'bg-indigo-300/40' : 'bg-slate-200'}`} />
          <div className={`h-9 rounded w-28 animate-pulse ${hero ? 'bg-indigo-300/50' : 'bg-slate-200'}`} />
          <div className={`h-2.5 rounded w-32 animate-pulse ${hero ? 'bg-indigo-300/30' : 'bg-slate-150'}`} />
        </div>
        <div className={`w-11 h-11 rounded-xl animate-pulse ${hero ? 'bg-indigo-400/30' : 'bg-slate-200'}`} />
      </div>
    </div>
  );
}

export default function KPIBentoGrid({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonCard hero />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard hero />
      </div>
    );
  }

  const cards = [
    {
      id: 'hero',
      label: 'TOTAL SKUs',
      value: fmt(data.totalSKUs),
      sub: 'across all shops',
      trend: data.thisMonth > 0 ? { dir: 'up', val: `+${data.thisMonth}`, label: 'added this month' } : null,
      icon: 'CubeIcon',
      variant: 'hero' as const,
      colSpan: 2,
    },
    {
      id: 'units',
      label: 'TOTAL STOCK UNITS',
      value: fmt(data.availableUnits),
      sub: 'units on hand',
      trend: null,
      icon: 'ArchiveBoxIcon',
      variant: 'default' as const,
      colSpan: 1,
    },
    {
      id: 'low',
      label: 'LOW STOCK ALERTS',
      value: fmt(data.lowStock),
      sub: 'products need reorder',
      trend: data.lowStock > 0 ? { dir: 'up', val: `${data.lowStock}`, label: 'need attention' } : null,
      icon: 'ExclamationTriangleIcon',
      variant: 'warning' as const,
      colSpan: 1,
    },
    {
      id: 'out',
      label: 'OUT OF STOCK',
      value: fmt(data.outOfStock),
      sub: 'products at zero qty',
      trend: data.outOfStock > 0 ? { dir: 'up', val: `${data.outOfStock}`, label: 'at zero' } : null,
      icon: 'XCircleIcon',
      variant: 'danger' as const,
      colSpan: 1,
    },
    {
      id: 'shops',
      label: 'ACTIVE SHOPS',
      value: `${data.activeShops} / ${data.totalShops}`,
      sub: data.activeShops === data.totalShops ? 'all locations synced' : 'some offline',
      trend: { dir: 'neutral', val: data.totalShops > 0 ? `${Math.round((data.activeShops / data.totalShops) * 100)}%` : '0%', label: 'sync rate' },
      icon: 'BuildingStorefrontIcon',
      variant: 'positive' as const,
      colSpan: 1,
    },
    {
      id: 'value',
      label: 'TOTAL STOCK VALUE',
      value: fmtCurrency(data.totalValue),
      sub: 'estimated at cost',
      trend: null,
      icon: 'BanknotesIcon',
      variant: 'info' as const,
      colSpan: 2,
    },
  ];

  const variants = {
    hero:    { card: 'bg-indigo-600 border-indigo-500', icon: 'text-indigo-200', iconBg: 'bg-indigo-700/60', label: 'text-indigo-200', value: 'text-white', sub: 'text-indigo-200', trendUp: 'text-indigo-200', trendDown: 'text-indigo-300', trendNeutral: 'text-indigo-200', trendSub: 'text-indigo-300' },
    default: { card: 'bg-white border-slate-100', icon: 'text-slate-500', iconBg: 'bg-slate-100', label: 'text-slate-400', value: 'text-slate-900', sub: 'text-slate-400', trendUp: 'text-emerald-600', trendDown: 'text-red-500', trendNeutral: 'text-slate-500', trendSub: 'text-slate-400' },
    positive:{ card: 'bg-white border-slate-100', icon: 'text-emerald-600', iconBg: 'bg-emerald-50', label: 'text-slate-400', value: 'text-slate-900', sub: 'text-slate-400', trendUp: 'text-emerald-600', trendDown: 'text-red-500', trendNeutral: 'text-emerald-600', trendSub: 'text-slate-400' },
    warning: { card: 'bg-amber-50 border-amber-100', icon: 'text-amber-600', iconBg: 'bg-amber-100', label: 'text-amber-600/80', value: 'text-slate-900', sub: 'text-amber-700/60', trendUp: 'text-amber-700', trendDown: 'text-emerald-600', trendNeutral: 'text-amber-600', trendSub: 'text-amber-600/60' },
    danger:  { card: 'bg-red-50 border-red-100', icon: 'text-red-600', iconBg: 'bg-red-100', label: 'text-red-500/80', value: 'text-slate-900', sub: 'text-red-700/60', trendUp: 'text-red-600', trendDown: 'text-emerald-600', trendNeutral: 'text-red-600', trendSub: 'text-red-500/60' },
    info:    { card: 'bg-white border-slate-100', icon: 'text-indigo-600', iconBg: 'bg-indigo-50', label: 'text-slate-400', value: 'text-slate-900', sub: 'text-slate-400', trendUp: 'text-emerald-600', trendDown: 'text-red-500', trendNeutral: 'text-indigo-600', trendSub: 'text-slate-400' },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(card => {
        const s = variants[card.variant];
        const isHero = card.variant === 'hero';
        const trendColor = !card.trend ? '' : card.trend.dir === 'up' ? s.trendUp : card.trend.dir === 'down' ? s.trendDown : s.trendNeutral;
        return (
          <div key={card.id}
            className={`${card.colSpan === 2 ? 'col-span-2' : 'col-span-1'} rounded-2xl border p-5 shadow-card transition-all duration-200 hover:shadow-card-md hover:-translate-y-0.5 ${s.card}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${s.label}`}>{card.label}</p>
                <p className={`font-tabular font-bold leading-none mb-1 ${isHero ? 'text-4xl' : 'text-3xl'} ${s.value}`}>{card.value}</p>
                {card.sub && <p className={`text-xs mt-1.5 ${s.sub}`}>{card.sub}</p>}
                {card.trend && (
                  <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
                    <Icon name={card.trend.dir === 'up' ? 'ArrowTrendingUpIcon' : card.trend.dir === 'down' ? 'ArrowTrendingDownIcon' : 'MinusIcon'} size={13} />
                    <span>{card.trend.val}</span>
                    <span className={`font-normal ${s.trendSub}`}>{card.trend.label}</span>
                  </div>
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
