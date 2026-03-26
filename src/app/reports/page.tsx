'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, TooltipProps,
} from 'recharts';

// ── Data ────────────────────────────────────────────────────────────────────

const monthlySales = [
  { month: 'Oct', revenue: 182400, orders: 214 },
  { month: 'Nov', revenue: 207600, orders: 248 },
  { month: 'Dec', revenue: 264800, orders: 319 },
  { month: 'Jan', revenue: 198200, orders: 241 },
  { month: 'Feb', revenue: 223500, orders: 267 },
  { month: 'Mar', revenue: 241900, orders: 289 },
];

const shopPerformance = [
  { shop: 'Ikeja', revenue: 195200, target: 180000 },
  { shop: 'VI', revenue: 218900, target: 200000 },
  { shop: 'Lekki', revenue: 128400, target: 140000 },
  { shop: 'Yaba', revenue: 142800, target: 130000 },
  { shop: 'Surulere', revenue: 98600, target: 110000 },
  { shop: 'Ajah', revenue: 76300, target: 100000 },
];

const categoryRevenue = [
  { name: 'Electronics', value: 182400, color: '#4f46e5' },
  { name: 'Apparel', value: 98600, color: '#0ea5e9' },
  { name: 'Food & Bev', value: 76200, color: '#10b981' },
  { name: 'Health & Beauty', value: 54800, color: '#ec4899' },
  { name: 'Home & Garden', value: 38200, color: '#f59e0b' },
  { name: 'Sporting Goods', value: 21900, color: '#8b5cf6' },
];

const stockTrend = [
  { week: 'W1', inStock: 88000, lowStock: 2100, outOfStock: 240 },
  { week: 'W2', inStock: 85400, lowStock: 2800, outOfStock: 310 },
  { week: 'W3', inStock: 91200, lowStock: 1900, outOfStock: 180 },
  { week: 'W4', inStock: 94312, lowStock: 2440, outOfStock: 290 },
];

const reportTypes = [
  { id: 'inventory', label: 'Inventory Summary', icon: 'ClipboardDocumentListIcon', color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Stock levels, low stock, out-of-stock' },
  { id: 'sales', label: 'Sales Report', icon: 'CurrencyDollarIcon', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Revenue, orders, trends by period' },
  { id: 'shop', label: 'Shop Performance', icon: 'BuildingStorefrontIcon', color: 'text-sky-600', bg: 'bg-sky-50', desc: 'Per-shop comparison and targets' },
  { id: 'category', label: 'Category Breakdown', icon: 'TagIcon', color: 'text-violet-600', bg: 'bg-violet-50', desc: 'Stock and revenue by category' },
];

// ── Tooltips ─────────────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-6 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500 capitalize">{p.name}</span>
          </div>
          <span className="font-semibold text-slate-800">
            {p.name === 'revenue' ? `$${(p.value as number).toLocaleString()}` : (p.value as number).toLocaleString()}
          </span>
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
      <p className="text-slate-500">
        <span className="font-semibold text-slate-800">${(d.value as number).toLocaleString()}</span> revenue
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d' | '1y';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const totalRevenue = monthlySales.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = monthlySales.reduce((s, m) => s + m.orders, 0);
  const avgOrderValue = Math.round(totalRevenue / totalOrders);
  const topShop = shopPerformance.reduce((a, b) => (a.revenue > b.revenue ? a : b));

  return (
    <AppLayout activeRoute="/reports">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Business insights across all shops</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
              {(['7d', '30d', '90d', '1y'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                    ${dateRange === r ? 'bg-white text-indigo-700 shadow-card' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
              <Icon name="ArrowDownTrayIcon" size={15} className="text-slate-400" />
              Export All
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, trend: '+12.4%', icon: 'BanknotesIcon', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100', up: true },
            { label: 'Total Orders', value: totalOrders.toLocaleString(), trend: '+8.2%', icon: 'ShoppingCartIcon', color: 'bg-sky-50 text-sky-600', border: 'border-sky-100', up: true },
            { label: 'Avg Order Value', value: `$${avgOrderValue}`, trend: '+3.8%', icon: 'ReceiptPercentIcon', color: 'bg-violet-50 text-violet-600', border: 'border-violet-100', up: true },
            { label: 'Top Shop', value: topShop.shop, trend: `$${topShop.revenue.toLocaleString()}`, icon: 'TrophyIcon', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100', up: true },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-card p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center`}>
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={17} />
                </div>
                <span className={`text-xs font-semibold ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {card.trend}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Export Report Cards */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Generate Reports</h3>
          <p className="text-xs text-slate-400 mb-4">Export detailed reports as CSV or PDF</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {reportTypes.map(report => (
              <button
                key={report.id}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-150 text-left group"
              >
                <div className={`w-10 h-10 rounded-xl ${report.bg} ${report.color} flex items-center justify-center shrink-0`}>
                  <Icon name={report.icon as Parameters<typeof Icon>[0]['name']} size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">{report.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{report.desc}</p>
                </div>
                <Icon name="ArrowDownTrayIcon" size={14} className="ml-auto text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Monthly Revenue & Orders</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-5 mb-4">
                {[
                  { color: '#4f46e5', label: 'Revenue' },
                  { color: '#10b981', label: 'Orders' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlySales} barGap={2} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar yAxisId="left" dataKey="revenue" name="revenue" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                  <Bar yAxisId="right" dataKey="orders" name="orders" fill="#10b981" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Revenue by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution across categories</p>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryRevenue} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryRevenue.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {categoryRevenue.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-slate-500">{c.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700">${(c.value / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Shop Performance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Shop Performance vs Target</h3>
            <p className="text-xs text-slate-400 mt-0.5">Revenue achieved against monthly targets</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-5 mb-4">
              {[
                { color: '#4f46e5', label: 'Revenue' },
                { color: '#e2e8f0', label: 'Target' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={shopPerformance} barGap={2} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="shop" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" name="revenue" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                <Bar dataKey="target" name="target" fill="#e2e8f0" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Stock Level Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">Weekly stock movement over the past month</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-5 mb-4">
              {[
                { color: '#4f46e5', label: 'In Stock' },
                { color: '#f59e0b', label: 'Low Stock' },
                { color: '#ef4444', label: 'Out of Stock' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stockTrend}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip />
                <Line type="monotone" dataKey="inStock" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: '#4f46e5' }} />
                <Line type="monotone" dataKey="lowStock" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} />
                <Line type="monotone" dataKey="outOfStock" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
