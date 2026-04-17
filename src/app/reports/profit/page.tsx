'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

interface ProfitRow {
  productId: string;
  name: string;
  sku: string;
  shopName: string;
  soldQty: number;
  revenue: number;
  unitCost: number;
  cost: number;
  profit: number;
  margin: number;
  averageSalePrice: number;
  stockLeft: number;
}

interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  soldQty: number;
  averageMargin: number;
  productCount: number;
  profitableCount: number;
  lossCount: number;
  topProduct: ProfitRow | null;
}

interface ProfitResponse {
  range: DateRange;
  summary: ProfitSummary;
  rows: ProfitRow[];
}

const RANGE_OPTIONS: DateRange[] = ['7d', '30d', '90d', '1y', 'all'];

function fmtMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

export default function ProfitPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [data, setData] = useState<ProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/profit?range=${dateRange}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as ProfitResponse;
      setData(json);
    } catch {
      setError('Failed to load profit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/profit?range=${dateRange}&format=csv`);
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = res.headers.get('Content-Disposition') ?? '';
      const fileName = cd.match(/filename="([^"]+)"/)?.[1] ?? 'profit-report.csv';
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  const cards = [
    {
      label: 'Revenue',
      value: summary ? fmtMoney(summary.totalRevenue) : '—',
      helper: 'Sale value excluding GST',
      icon: 'BanknotesIcon',
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Landed Cost',
      value: summary ? fmtMoney(summary.totalCost) : '—',
      helper: 'Purchase price + tax + transport',
      icon: 'CubeIcon',
      color: 'bg-slate-50 text-slate-600',
      border: 'border-slate-100',
    },
    {
      label: 'Owner Profit',
      value: summary ? fmtMoney(summary.totalProfit) : '—',
      helper: 'Revenue minus landed cost',
      icon: 'ArrowTrendingUpIcon',
      color: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-100',
    },
    {
      label: 'Avg Margin',
      value: summary ? `${summary.averageMargin.toFixed(1)}%` : '—',
      helper: `${summary?.profitableCount ?? 0} profitable / ${summary?.lossCount ?? 0} loss-making`,
      icon: 'ChartBarIcon',
      color: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
    },
  ];

  return (
    <AppLayout activeRoute="/reports/profit">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
              <Link href="/reports" className="transition-colors hover:text-indigo-700">Reports</Link>
              <span>/</span>
              <span className="font-medium text-slate-700">Profit Tracker</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Product Profit Tracker</h1>
            <p className="mt-0.5 text-sm text-slate-500">Track how much owner profit each product is generating.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
              {RANGE_OPTIONS.map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${dateRange === range ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Icon name="ArrowPathIcon" size={14} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={loading || exporting}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm disabled:opacity-50 hover:bg-slate-50"
            >
              <Icon name="ArrowDownTrayIcon" size={14} className="text-slate-400" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="ExclamationTriangleIcon" size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className={`rounded-xl border ${card.border} bg-white p-4 shadow-sm`}>
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}>
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={17} />
                </div>
              </div>
              {loading ? (
                <>
                  <Skeleton className="mb-2 h-6 w-24" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-slate-800">{card.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{card.helper}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{card.label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-5">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Profit by Product</h3>
                <p className="mt-0.5 text-xs text-slate-400">GST is excluded because it is collected separately from the customer.</p>
              </div>
              {summary?.topProduct && !loading && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Top product</p>
                  <p className="text-sm font-bold text-emerald-800">{summary.topProduct.name}</p>
                  <p className="text-xs text-emerald-600">{fmtMoney(summary.topProduct.profit)} profit</p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No sales data found for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Product</th>
                      <th className="px-5 py-3 font-semibold">Shop</th>
                      <th className="px-5 py-3 font-semibold text-right">Sold</th>
                      <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                      <th className="px-5 py-3 font-semibold text-right">Cost</th>
                      <th className="px-5 py-3 font-semibold text-right">Profit</th>
                      <th className="px-5 py-3 font-semibold text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map(row => (
                      <tr key={row.productId} className={row.profit < 0 ? 'bg-red-50/40' : ''}>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-800">{row.name}</div>
                          <div className="font-mono text-xs text-slate-400">{row.sku}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{row.shopName}</td>
                        <td className="px-5 py-3 text-right text-slate-700">{fmtNumber(row.soldQty)}</td>
                        <td className="px-5 py-3 text-right text-slate-700">{fmtMoney(row.revenue)}</td>
                        <td className="px-5 py-3 text-right text-slate-700">{fmtMoney(row.cost)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${row.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtMoney(row.profit)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${row.margin >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{row.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Profit Formula</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Profit is calculated from billed sales as <span className="font-semibold text-slate-700">revenue minus landed cost</span>.
                Landed cost uses <span className="font-semibold text-slate-700">purchase price + tax + transportation cost</span>.
                GST is not counted as owner income.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Quick Stats</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Products tracked</span>
                  <span className="font-semibold text-slate-800">{summary?.productCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Units sold</span>
                  <span className="font-semibold text-slate-800">{summary ? fmtNumber(summary.soldQty) : '0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Profitable products</span>
                  <span className="font-semibold text-emerald-700">{summary?.profitableCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Loss-making products</span>
                  <span className="font-semibold text-red-600">{summary?.lossCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
