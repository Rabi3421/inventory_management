'use client';
import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface KPICard {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string; label: string };
  icon: string;
  variant: 'default' | 'positive' | 'warning' | 'danger' | 'info' | 'hero';
  colSpan?: number;
}

const kpiCards: KPICard[] = [
  {
    id: 'kpi-shop-skus',
    label: 'My Shop SKUs',
    value: '312',
    subValue: 'active products in Lekki',
    trend: { direction: 'up', value: '+8', label: 'added this month' },
    icon: 'CubeIcon',
    variant: 'hero',
    colSpan: 2,
  },
  {
    id: 'kpi-shop-units',
    label: 'Stock Units',
    value: '15,840',
    subValue: 'units on hand',
    trend: { direction: 'down', value: '-1.4%', label: 'vs last week' },
    icon: 'ArchiveBoxIcon',
    variant: 'default',
  },
  {
    id: 'kpi-shop-low-stock',
    label: 'Low Stock',
    value: '11',
    subValue: 'products need reorder',
    trend: { direction: 'up', value: '+4', label: 'since yesterday' },
    icon: 'ExclamationTriangleIcon',
    variant: 'warning',
  },
  {
    id: 'kpi-shop-out-of-stock',
    label: 'Out of Stock',
    value: '3',
    subValue: 'products at zero qty',
    trend: { direction: 'up', value: '+1', label: 'since yesterday' },
    icon: 'XCircleIcon',
    variant: 'danger',
  },
  {
    id: 'kpi-shop-value',
    label: 'Shop Stock Value',
    value: '$78,450',
    subValue: 'estimated at cost',
    trend: { direction: 'up', value: '+$1,200', label: 'vs last month' },
    icon: 'BanknotesIcon',
    variant: 'info',
  },
];

const variantStyles: Record<KPICard['variant'], {
  card: string;
  icon: string;
  iconBg: string;
  trendUp: string;
  trendDown: string;
  trendNeutral: string;
  value: string;
}> = {
  hero: {
    card: 'bg-emerald-600 border-emerald-500',
    icon: 'text-emerald-200',
    iconBg: 'bg-emerald-700/60',
    trendUp: 'text-emerald-200',
    trendDown: 'text-emerald-200',
    trendNeutral: 'text-emerald-200',
    value: 'text-white',
  },
  default: {
    card: 'bg-white border-slate-100',
    icon: 'text-slate-500',
    iconBg: 'bg-slate-100',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
    trendNeutral: 'text-slate-500',
    value: 'text-slate-900',
  },
  positive: {
    card: 'bg-white border-slate-100',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
    trendNeutral: 'text-emerald-600',
    value: 'text-slate-900',
  },
  warning: {
    card: 'bg-amber-50 border-amber-100',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    trendUp: 'text-amber-700',
    trendDown: 'text-emerald-600',
    trendNeutral: 'text-amber-600',
    value: 'text-slate-900',
  },
  danger: {
    card: 'bg-red-50 border-red-100',
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
    trendUp: 'text-red-600',
    trendDown: 'text-emerald-600',
    trendNeutral: 'text-red-600',
    value: 'text-slate-900',
  },
  info: {
    card: 'bg-white border-slate-100',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
    trendNeutral: 'text-emerald-600',
    value: 'text-slate-900',
  },
};

export default function ShopAdminKPIGrid() {
  const row1 = kpiCards.slice(0, 4);
  const row2 = kpiCards.slice(4, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {row1.map(card => (
        <KPICardComponent key={card.id} card={card} />
      ))}
      {row2.map(card => (
        <KPICardComponent key={card.id} card={card} forceColSpan={2} />
      ))}
    </div>
  );
}

function KPICardComponent({ card, forceColSpan }: { card: KPICard; forceColSpan?: number }) {
  const styles = variantStyles[card.variant];
  const isHero = card.variant === 'hero';
  const colSpan = forceColSpan ?? card.colSpan ?? 1;
  const colSpanClass = colSpan === 2 ? 'col-span-2' : 'col-span-1';

  const trendColor = card.trend
    ? card.trend.direction === 'up'
      ? styles.trendUp
      : card.trend.direction === 'down'
        ? styles.trendDown
        : styles.trendNeutral
    : '';

  return (
    <div
      className={`
        ${colSpanClass} rounded-2xl border p-5 shadow-card
        transition-all duration-200 hover:shadow-card-md hover:-translate-y-0.5
        ${styles.card}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isHero ? 'text-emerald-200' : 'text-slate-400'}`}>
            {card.label}
          </p>
          <p className={`font-tabular font-bold leading-none mb-1 ${isHero ? 'text-4xl' : 'text-3xl'} ${styles.value}`}>
            {card.value}
          </p>
          {card.subValue && (
            <p className={`text-xs mt-1.5 ${isHero ? 'text-emerald-200' : 'text-slate-400'}`}>
              {card.subValue}
            </p>
          )}
          {card.trend && (
            <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
              <Icon
                name={
                  card.trend.direction === 'up' ? 'ArrowTrendingUpIcon'
                    : card.trend.direction === 'down' ? 'ArrowTrendingDownIcon' : 'MinusIcon'
                }
                size={13}
              />
              <span>{card.trend.value}</span>
              <span className={`font-normal ${isHero ? 'text-emerald-300' : 'text-slate-400'}`}>
                {card.trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
          <Icon
            name={card.icon as Parameters<typeof Icon>[0]['name']}
            size={22}
            className={styles.icon}
          />
        </div>
      </div>
    </div>
  );
}
