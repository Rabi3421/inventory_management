'use client';
import React from 'react';
import Icon from '@/components/ui/AppIcon';

export interface SalesVelocityProduct {
  _id: string;
  name: string;
  sku: string;
  price: number;
  availableQty: number;
  totalQty: number;
  soldQty: number;
  revenue: number;
  saleCount: number;
  velocityPerDay: number;
  lastSoldAt: string | null;
  ageDays: number;
  sellThroughRate: number;
  daysSinceLastSold: number;
}

export interface AgingAlert extends SalesVelocityProduct {
  agingLevel: 'watch' | 'warning' | 'critical';
}

export interface CategoryVelocityPoint {
  name: string;
  productCount: number;
  soldQty: number;
  revenue: number;
  availableQty: number;
  totalQty: number;
  sellThroughRate: number;
}

export interface SalesVelocityData {
  range: string;
  rangeDays: number;
  totalSoldUnits: number;
  productsWithSales: number;
  unsoldProducts: number;
  avgSellThrough: number;
  fastSellThroughCount: number;
  slowSellThroughCount: number;
  fastSellingProducts: SalesVelocityProduct[];
  slowSellingProducts: SalesVelocityProduct[];
  agingAlerts: AgingAlert[];
  categoryVelocity: CategoryVelocityPoint[];
}

interface Props {
  data: SalesVelocityData | null;
  loading: boolean;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Never sold';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function VelocitySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {Array.from({ length: 2 }).map((_, column) => (
        <div key={column} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 animate-pulse">
          <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 border border-slate-100 rounded-xl">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 w-16 bg-slate-100 rounded ml-auto" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductRow({ product, tone }: { product: SalesVelocityProduct; tone: 'fast' | 'slow' }) {
  const badgeClasses = tone === 'fast'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50/70 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {tone === 'fast' ? 'Fast' : 'Slow'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">{product.sku}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>{product.soldQty} sold</span>
          <span>{product.saleCount} bills</span>
          <span>{product.velocityPerDay.toFixed(2)}/day</span>
          <span>{product.sellThroughRate.toFixed(1)}% sell-through</span>
          <span>{product.availableQty.toLocaleString()} in stock</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-900">{formatMoney(product.revenue)}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Last sold {formatDate(product.lastSoldAt)}</p>
      </div>
    </div>
  );
}

export default function SalesVelocitySection({ data, loading }: Props) {
  const rangeLabel = data?.range === '7d'
    ? 'Last 7 days'
    : data?.range === '90d'
      ? 'Last 90 days'
      : 'Last 30 days';

  const agingBadgeClass = (level: AgingAlert['agingLevel']) => {
    if (level === 'critical') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-sky-50 text-sky-700 border-sky-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-800">Sales Velocity Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5">Fast and slow selling products over {rangeLabel.toLowerCase()}</p>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{data.totalSoldUnits} units sold</span>
            <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200">{data.productsWithSales} products sold</span>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{data.unsoldProducts} products untouched</span>
            <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{data.avgSellThrough.toFixed(1)}% avg sell-through</span>
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{data.fastSellThroughCount} fast movers</span>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{data.slowSellThroughCount} slow movers</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <VelocitySkeleton />
        ) : data ? (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Fast Selling Products</p>
                  <p className="text-xs text-emerald-700/70">Highest demand in the selected period</p>
                </div>
                <Icon name="ArrowTrendingUpIcon" size={18} className="text-emerald-600" />
              </div>
              <div className="space-y-3">
                {data.fastSellingProducts.length === 0 ? (
                  <div className="text-sm text-slate-400 py-8 text-center">No sales data available</div>
                ) : data.fastSellingProducts.map(product => (
                  <ProductRow key={product._id} product={product} tone="fast" />
                ))}
              </div>
            </div>

            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Slow Selling Products</p>
                  <p className="text-xs text-amber-700/70">Low movement items that may need attention</p>
                </div>
                <Icon name="ArrowTrendingDownIcon" size={18} className="text-amber-600" />
              </div>
              <div className="space-y-3">
                {data.slowSellingProducts.length === 0 ? (
                  <div className="text-sm text-slate-400 py-8 text-center">No inventory data available</div>
                ) : data.slowSellingProducts.map(product => (
                  <ProductRow key={product._id} product={product} tone="slow" />
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Stock Aging Warnings</p>
                  <p className="text-xs text-slate-500">Products that have been idle for too long</p>
                </div>
                <Icon name="ClockIcon" size={18} className="text-slate-500" />
              </div>
              <div className="space-y-3">
                {data.agingAlerts.length === 0 ? (
                  <div className="text-sm text-slate-400 py-8 text-center">No aging warnings right now</div>
                ) : data.agingAlerts.map(product => (
                  <div key={product._id} className="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded-xl bg-white">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${agingBadgeClass(product.agingLevel)}`}>
                          {product.agingLevel === 'critical' ? 'Critical' : product.agingLevel === 'warning' ? 'Warning' : 'Watch'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{product.sku}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>{product.daysSinceLastSold} days since sale</span>
                        <span>{product.sellThroughRate.toFixed(1)}% sell-through</span>
                        <span>{product.availableQty.toLocaleString()} in stock</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatMoney(product.revenue)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{product.saleCount} sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Price Band Sales Breakdown</p>
                  <p className="text-xs text-indigo-700/70">Proxy category analysis for product velocity</p>
                </div>
                <Icon name="Squares2X2Icon" size={18} className="text-indigo-600" />
              </div>
              <div className="space-y-3">
                {data.categoryVelocity.length === 0 ? (
                  <div className="text-sm text-slate-400 py-8 text-center">No category-style sales data yet</div>
                ) : data.categoryVelocity.map(row => {
                  const total = row.totalQty > 0 ? Math.min(100, (row.soldQty / row.totalQty) * 100) : 0;
                  return (
                    <div key={row.name} className="p-3 bg-white border border-indigo-100 rounded-xl">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{row.name}</p>
                          <p className="text-[11px] text-slate-400">{row.productCount} products</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{row.sellThroughRate.toFixed(1)}%</p>
                          <p className="text-[11px] text-slate-400">sell-through</p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${total}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{row.soldQty} sold</span>
                        <span>{row.availableQty} available</span>
                        <span>{formatMoney(row.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </>
        ) : (
          <div className="py-10 text-center text-slate-400 text-sm">No sales analytics available yet</div>
        )}
      </div>
    </div>
  );
}
