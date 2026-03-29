'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, TooltipProps,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────
type DateRange = '7d' | '30d' | '90d' | '1y';

interface KPI {
  catalogValue: number;
  totalUnits: number;
  availableUnits: number;
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalShops: number;
  activeShops: number;
}
interface MonthlyPoint  { month: string; stockIn: number; stockOut: number; sales: number; restocks: number; txCount: number; }
interface DailyPoint    { date: string; stockIn: number; stockOut: number; }
interface StockStatus   { name: string; value: number; color: string; }
interface TopProduct    { name: string; sku: string; price: number; availableQty: number; stockValue: number; }
interface MovementType  { type: string; count: number; totalQty: number; }
interface RecentLog     { _id: string; productName: string; productSku: string; type: string; qty: number; balanceAfter: number; note: string; performedBy: string; createdAt: string; }

interface ReportData {
  kpi: KPI;
  monthlyMovement: MonthlyPoint[];
  stockStatus: StockStatus[];
  topProducts: TopProduct[];
  movementByType: MovementType[];
  recentActivity: RecentLog[];
  dailyMovement: DailyPoint[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(v: number) {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)       return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toLocaleString('en-IN')}`;
}
function fmtNum(v: number) {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString();
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const LOG_TYPE_CFG: Record<string, { label: string; color: string; bg: string; dot: string; hex: string }> = {
  purchase:   { label: 'Purchase',   color: 'text-indigo-700', bg: 'bg-indigo-50',  dot: 'bg-indigo-500',  hex: '#4f46e5' },
  restock:    { label: 'Restock',    color: 'text-sky-700',    bg: 'bg-sky-50',     dot: 'bg-sky-500',     hex: '#0ea5e9' },
  sale:       { label: 'Sale',       color: 'text-emerald-700',bg: 'bg-emerald-50', dot: 'bg-emerald-500', hex: '#10b981' },
  adjustment: { label: 'Adjustment', color: 'text-violet-700', bg: 'bg-violet-50',  dot: 'bg-violet-500',  hex: '#8b5cf6' },
  return:     { label: 'Return',     color: 'text-amber-700',  bg: 'bg-amber-50',   dot: 'bg-amber-500',   hex: '#f59e0b' },
};

// ─── Tooltip components ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-500 capitalize">{p.name}</span>
          </div>
          <span className="font-semibold text-slate-800">{fmtNum(p.value as number)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
      <p className="text-slate-500"><span className="font-semibold text-slate-800">{d.value}</span> products</p>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [data, setData]           = useState<ReportData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/reports?range=${dateRange}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async (type: 'inventory' | 'stock' | 'shops') => {
    setExporting(type);
    try {
      const res = await fetch(`/api/reports?range=${dateRange}&export=${type}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const cd   = res.headers.get('Content-Disposition') ?? '';
      const fn   = cd.match(/filename="([^"]+)"/)?.[1] ?? `${type}-report.csv`;
      a.href = url; a.download = fn; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const kpi = data?.kpi;
  const useDaily = dateRange === '7d' || dateRange === '30d';
  const chartData = useDaily && (data?.dailyMovement?.length ?? 0) > 0
    ? data!.dailyMovement
    : data?.monthlyMovement ?? [];

  return (
    <AppLayout activeRoute="/reports">
      <div className="space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Business insights across all shops</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Date range */}
            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
              {(['7d','30d','90d','1y'] as DateRange[]).map(r => (
                <button key={r} onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${dateRange === r ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => fetchData()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
              <Icon name="ArrowPathIcon" size={14} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => handleExport('inventory')} disabled={loading || exporting === 'inventory'}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm disabled:opacity-50">
              <Icon name="ArrowDownTrayIcon" size={14} className="text-slate-400" />
              {exporting === 'inventory' ? 'Exporting…' : 'Export All'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <Icon name="ExclamationTriangleIcon" size={15} className="shrink-0" />{error}
            <button onClick={fetchData} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Catalog Value',   value: loading ? null : fmtMoney(kpi?.catalogValue ?? 0),   icon: 'BanknotesIcon',          color: 'bg-indigo-50 text-indigo-600',  border: 'border-indigo-100',  sub: `${kpi?.totalProducts ?? 0} products` },
            { label: 'Total Units',     value: loading ? null : fmtNum(kpi?.totalUnits ?? 0),        icon: 'CubeIcon',               color: 'bg-sky-50 text-sky-600',        border: 'border-sky-100',     sub: `${kpi?.availableUnits ?? 0} available` },
            { label: 'Low / Out Stock', value: loading ? null : `${kpi?.lowStock ?? 0} / ${kpi?.outOfStock ?? 0}`, icon: 'ExclamationTriangleIcon', color: 'bg-amber-50 text-amber-600',    border: 'border-amber-100',   sub: 'products need attention' },
            { label: 'Shops',           value: loading ? null : String(kpi?.totalShops ?? 0),        icon: 'BuildingStorefrontIcon', color: 'bg-emerald-50 text-emerald-600',border: 'border-emerald-100', sub: `${kpi?.activeShops ?? 0} active` },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-sm p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center`}>
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={17} />
                </div>
              </div>
              {loading
                ? <><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-3 w-32 mt-1" /></>
                : <>
                    <p className="text-xl font-bold text-slate-800">{card.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
                  </>
              }
            </div>
          ))}
        </div>

        {/* ── Export Cards ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Generate Reports</h3>
          <p className="text-xs text-slate-400 mb-4">Export detailed reports as CSV</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'inventory' as const, label: 'Inventory Summary',  icon: 'ClipboardDocumentListIcon', color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Stock levels, low stock, out-of-stock' },
              { id: 'stock'     as const, label: 'Stock Movements',     icon: 'ArrowsRightLeftIcon',       color: 'text-sky-600',    bg: 'bg-sky-50',    desc: `All movements in last ${dateRange}` },
              { id: 'shops'     as const, label: 'Shops Directory',     icon: 'BuildingStorefrontIcon',    color: 'text-emerald-600',bg: 'bg-emerald-50',desc: 'All shops with status & manager' },
            ].map(r => (
              <button key={r.id} onClick={() => handleExport(r.id)} disabled={loading || !!exporting}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group disabled:opacity-50">
                <div className={`w-10 h-10 rounded-xl ${r.bg} ${r.color} flex items-center justify-center shrink-0`}>
                  {exporting === r.id
                    ? <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                    : <Icon name={r.icon as Parameters<typeof Icon>[0]['name']} size={18} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">{r.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                </div>
                <Icon name="ArrowDownTrayIcon" size={14} className="ml-auto text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Charts Row 1: Movement + Stock Status ─────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Stock movement chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {useDaily ? 'Daily' : 'Monthly'} Stock Movement
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Units in vs units out — last {dateRange}</p>
              </div>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({length: 5}).map((_,i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Icon name="ChartBarIcon" size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No movement data for this period</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-5 mb-4">
                    {[{ color: '#4f46e5', label: 'Stock In' }, { color: '#ef4444', label: 'Stock Out' }].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barGap={2} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey={useDaily ? 'date' : 'month'} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="stockIn"  name="Stock In"  fill="#4f46e5" radius={[4,4,0,0]} />
                      <Bar dataKey="stockOut" name="Stock Out" fill="#ef4444" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          {/* Stock Status Pie */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Stock Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Product availability breakdown</p>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="w-36 h-36 rounded-full" />
                  {Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data?.stockStatus ?? []} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {(data?.stockStatus ?? []).map(entry => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-2.5">
                    {(data?.stockStatus ?? []).map(c => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                          <span className="text-slate-500">{c.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700">{c.value} SKUs</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Movement trend line chart ──────────────────────────────────── */}
        {!useDaily && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Movement Trend — Last 6 Months</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sales vs restocks over time</p>
            </div>
            <div className="p-5">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <>
                  <div className="flex items-center gap-5 mb-4">
                    {[
                      { color: '#10b981', label: 'Sales (out)' },
                      { color: '#4f46e5', label: 'Restocks (in)' },
                      { color: '#f59e0b', label: 'Transactions' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data?.monthlyMovement ?? []}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="sales"    name="Sales"      stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                      <Line type="monotone" dataKey="restocks" name="Restocks"   stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: '#4f46e5' }} />
                      <Line type="monotone" dataKey="txCount"  name="Transactions" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} strokeDasharray="4 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom row: Top Products + Movement by Type ────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Top Products by Stock Value */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Top Products by Value</h3>
              <p className="text-xs text-slate-400 mt-0.5">Highest stock value in inventory</p>
            </div>
            <div className="divide-y divide-slate-50">
              {loading
                ? Array.from({length: 5}).map((_,i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-40" /><Skeleton className="h-2.5 w-24" /></div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))
                : (data?.topProducts ?? []).length === 0
                  ? <div className="px-5 py-12 text-center text-slate-400 text-sm">No products yet</div>
                  : (data?.topProducts ?? []).map((p, i) => {
                      const pct = data!.topProducts[0]?.stockValue > 0
                        ? Math.round((p.stockValue / data!.topProducts[0].stockValue) * 100) : 0;
                      return (
                        <div key={p.sku} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-600">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-400 shrink-0">{p.availableQty} units</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-800">{fmtMoney(p.stockValue)}</p>
                            <p className="text-xs text-slate-400">₹{p.price.toLocaleString('en-IN')}/unit</p>
                          </div>
                        </div>
                      );
                    })
              }
            </div>
          </div>

          {/* Right column: Movement by Type + Recent Activity */}
          <div className="space-y-6">

            {/* Movement by Type */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">Movement by Type</h3>
                <p className="text-xs text-slate-400 mt-0.5">Transactions in the last {dateRange}</p>
              </div>
              <div className="p-5">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({length: 4}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (data?.movementByType ?? []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No movements in this period</div>
                ) : (
                  <div className="space-y-3">
                    {(data?.movementByType ?? []).map(m => {
                      const cfg = LOG_TYPE_CFG[m.type] ?? { label: m.type, color: 'text-slate-600', bg: 'bg-slate-50', dot: 'bg-slate-400', hex: '#94a3b8' };
                      const total = (data?.movementByType ?? []).reduce((a, b) => a + b.count, 0);
                      const pct   = total > 0 ? Math.round((m.count / total) * 100) : 0;
                      return (
                        <div key={m.type} className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} w-24 shrink-0`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.hex }} />
                          </div>
                          <span className="text-xs text-slate-500 shrink-0 w-12 text-right">{m.count} tx</span>
                          <span className="text-xs font-semibold text-slate-700 shrink-0 w-16 text-right">{fmtNum(m.totalQty)} units</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Recent Activity</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Latest 10 stock movements</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {loading
                  ? Array.from({length: 5}).map((_,i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-36" /><Skeleton className="h-2.5 w-20" /></div>
                        <Skeleton className="h-3 w-12" />
                      </div>
                    ))
                  : (data?.recentActivity ?? []).length === 0
                    ? <div className="px-5 py-10 text-center text-slate-400 text-sm">No recent activity</div>
                    : (data?.recentActivity ?? []).map(log => {
                        const cfg = LOG_TYPE_CFG[log.type] ?? { label: log.type, color: 'text-slate-600', bg: 'bg-slate-50', dot: 'bg-slate-400', hex: '#94a3b8' };
                        const positive = log.qty > 0;
                        return (
                          <div key={log._id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50">
                            <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate">{log.productName}</p>
                              <p className="text-xs text-slate-400">{cfg.label} · {log.productSku}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {positive ? '+' : ''}{log.qty}
                              </p>
                              <p className="text-xs text-slate-400">{timeAgo(log.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
