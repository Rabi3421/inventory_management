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
    id: 'kpi-total-skus',
    label: 'Total SKUs',
    value: '1,847',
    subValue: 'across all shops',
    trend: { direction: 'up', value: '+43', label: 'added this month' },
    icon: 'CubeIcon',
    variant: 'hero',
    colSpan: 2,
  },
  {
    id: 'kpi-total-units',
    label: 'Total Stock Units',
    value: '94,312',
    subValue: 'units on hand',
    trend: { direction: 'down', value: '-2.1%', label: 'vs last week' },
    icon: 'ArchiveBoxIcon',
    variant: 'default',
  },
  {
    id: 'kpi-low-stock',
    label: 'Low Stock Alerts',
    value: '37',
    subValue: 'products need reorder',
    trend: { direction: 'up', value: '+12', label: 'since yesterday' },
    icon: 'ExclamationTriangleIcon',
    variant: 'warning',
  },
  {
    id: 'kpi-out-of-stock',
    label: 'Out of Stock',
    value: '9',
    subValue: 'products at zero qty',
    trend: { direction: 'up', value: '+3', label: 'since yesterday' },
    icon: 'XCircleIcon',
    variant: 'danger',
  },
  {
    id: 'kpi-active-shops',
    label: 'Active Shops',
    value: '6 / 6',
    subValue: 'all locations synced',
    trend: { direction: 'neutral', value: '100%', label: 'sync rate' },
    icon: 'BuildingStorefrontIcon',
    variant: 'positive',
  },
  {
    id: 'kpi-stock-value',
    label: 'Total Stock Value',
    value: '$482,910',
    subValue: 'estimated at cost',
    trend: { direction: 'up', value: '+$8,240', label: 'vs last month' },
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
    card: 'bg-indigo-600 border-indigo-500',
    icon: 'text-indigo-200',
    iconBg: 'bg-indigo-700/60',
    trendUp: 'text-indigo-200',
    trendDown: 'text-indigo-200',
    trendNeutral: 'text-indigo-200',
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
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
    trendNeutral: 'text-indigo-600',
    value: 'text-slate-900',
  },
};

export default function KPIBentoGrid() {
  // Grid: 4 cols
  // Row 1: hero (spans 2) + 2 regular = 4 cols
  // Row 2: 3 regular cards (last spans 1 each) = need to handle last row
  // 6 cards: hero(2col) + unit(1) + low-stock(1) | out(1) + active(1) + value(1) + empty(1)
  // Better: hero(2) + 2 = row1; row2: 3 cards each 1 col + hero already used 2 so last row 4 = 4 regular but we have 4 remaining... let me recount
  // Cards: hero(2col), total-units(1), low-stock(1), out-of-stock(1), active-shops(1), stock-value(1) = 7 col-spans in 4-col grid
  // Row1: hero(2) + total-units(1) + low-stock(1) = 4 ✓
  // Row2: out-of-stock(1) + active-shops(1) + stock-value(1) + [empty or span 2 for last] 
  // stock-value spans 2 to fill → 1+1+2=4 ✓

  const row1 = kpiCards.slice(0, 4);   // hero(2col), units, low-stock
  const row2 = kpiCards.slice(4, 6);   // out-of-stock, active-shops, stock-value

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Row 1 */}
      {row1.map(card => (
        <KPICardComponent key={card.id} card={card} />
      ))}
      {/* Row 2: 2 cards + last spans 2 to fill 4 cols */}
      {row2.map((card, i) => (
        <KPICardComponent
          key={card.id}
          card={card}
          forceColSpan={i === row2.length - 1 ? 2 : 1}
        />
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
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isHero ? 'text-indigo-200' : 'text-slate-400'}`}>
            {card.label}
          </p>
          <p className={`font-tabular font-bold leading-none mb-1 ${isHero ? 'text-4xl' : 'text-3xl'} ${styles.value}`}>
            {card.value}
          </p>
          {card.subValue && (
            <p className={`text-xs mt-1.5 ${isHero ? 'text-indigo-200' : 'text-slate-400'}`}>
              {card.subValue}
            </p>
          )}
          {card.trend && (
            <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
              <Icon
                name={
                  card.trend.direction === 'up' ?'ArrowTrendingUpIcon'
                    : card.trend.direction === 'down' ?'ArrowTrendingDownIcon' :'MinusIcon'
                }
                size={13}
              />
              <span>{card.trend.value}</span>
              <span className={`font-normal ${isHero ? 'text-indigo-300' : 'text-slate-400'}`}>
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