'use client';
import React, { useState } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, TooltipProps,
} from 'recharts';

// ── Data ─────────────────────────────────────────────────────────────────────

const weeklySales = [
  { week: 'W1 Mar', revenue: 18400, orders: 42 },
  { week: 'W2 Mar', revenue: 22100, orders: 51 },
  { week: 'W3 Mar', revenue: 19600, orders: 46 },
  { week: 'W4 Mar', revenue: 24300, orders: 58 },
];

const categoryBreakdown = [
  { name: 'Food & Bev', value: 28400, color: '#10b981' },
  { name: 'Health & Beauty', value: 18600, color: '#ec4899' },
  { name: 'Apparel', value: 14200, color: '#0ea5e9' },
  { name: 'Electronics', value: 10800, color: '#4f46e5' },
  { name: 'Home & Garden', value: 6200, color: '#f59e0b' },
];

const stockMovement = [
  { day: 'Mon', inbound: 120, outbound: 95 },
  { day: 'Tue', inbound: 80, outbound: 110 },
  { day: 'Wed', inbound: 200, outbound: 140 },
  { day: 'Thu', inbound: 60, outbound: 88 },
  { day: 'Fri', inbound: 150, outbound: 175 },
  { day: 'Sat', inbound: 40, outbound: 120 },
  { day: 'Sun', inbound: 10, outbound: 45 },
];

const topProducts = [
  { name: 'Indomie Noodles (Carton)', sold: 184, revenue: 3312, category: 'Food & Bev' },
  { name: 'Nestlé Milo 900g Tin', sold: 142, revenue: 1278, category: 'Food & Bev' },
  { name: 'Nivea Men Deodorant 150ml', sold: 118, revenue: 472, category: 'Health & Beauty' },
  { name: 'Dettol Antiseptic Liquid 1L', sold: 96, revenue: 672, category: 'Health & Beauty' },
  { name: 'Adidas Tiro 23 Shorts', sold: 72, revenue: 3240, category: 'Apparel' },
];

const reportTypes = [
  { id: 'stock', label: 'Stock Summary', icon: 'ClipboardDocumentListIcon', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Current stock levels and alerts' },
  { id: 'sales', label: 'Sales Report', icon: 'CurrencyDollarIcon', color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Revenue, orders, and trends' },
  { id: 'restock', label: 'Restock History', icon: 'TruckIcon', color: 'text-sky-600', bg: 'bg-sky-50', desc: 'All restock requests and fulfillments' },
  { id: 'category', label: 'Category Report', icon: 'TagIcon', color: 'text-violet-600', bg: 'bg-violet-50', desc: 'Product performance by category' },
];

// ── Tooltips ──────────────────────────────────────────────────────────────────

function SalesTooltip({ active, payload, label }: TooltipProps<number, string>) {
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
            {p.name === 'revenue' ? `₹${(p.value as number).toLocaleString()}` : p.value}
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

type DateRange = '7d' | '30d' | '90d';

export default function ShopAdminReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const totalRevenue = weeklySales.reduce((s, w) => s + w.revenue, 0);
  const totalOrders = weeklySales.reduce((s, w) => s + w.orders, 0);
  const avgOrderValue = Math.round(totalRevenue / totalOrders);
  const topProduct = topProducts[0];

  return (
    <ShopAdminLayout activeRoute="/shop-admin/reports">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Icon name="BuildingStorefrontIcon" size={14} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            </div>
            <p className="text-slate-500 text-sm">Lekki Branch · Analytics & Performance</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
              {(['7d', '30d', '90d'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                    ${dateRange === r ? 'bg-white text-emerald-700 shadow-card' : 'text-slate-500 hover:text-slate-700'}`}
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
            { label: 'Shop Revenue', value: `₹${totalRevenue.toLocaleString()}`, trend: '+9.4%', icon: 'BanknotesIcon', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100', up: true },
            { label: 'Total Orders', value: totalOrders.toLocaleString(), trend: '+6.1%', icon: 'ShoppingCartIcon', color: 'bg-sky-50 text-sky-600', border: 'border-sky-100', up: true },
            { label: 'Avg Order Value', value: `₹${avgOrderValue}`, trend: '+2.6%', icon: 'ReceiptPercentIcon', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100', up: true },
            { label: 'Top Product', value: topProduct.name.split(' ').slice(0, 2).join(' '), trend: `${topProduct.sold} sold`, icon: 'TrophyIcon', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100', up: true },
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
              <p className="text-lg font-bold text-slate-800 truncate">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Download Reports */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Download Reports</h3>
          <p className="text-xs text-slate-400 mb-4">Generate and export detailed shop reports</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {reportTypes.map(report => (
              <button
                key={report.id}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-150 text-left group"
              >
                <div className={`w-10 h-10 rounded-xl ${report.bg} ${report.color} flex items-center justify-center shrink-0`}>
                  <Icon name={report.icon as Parameters<typeof Icon>[0]['name']} size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">{report.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{report.desc}</p>
                </div>
                <Icon name="ArrowDownTrayIcon" size={14} className="ml-auto text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Weekly Revenue */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Weekly Revenue & Orders</h3>
              <p className="text-xs text-slate-400 mt-0.5">March 2026</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-5 mb-4">
                {[
                  { color: '#10b981', label: 'Revenue' },
                  { color: '#0ea5e9', label: 'Orders' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklySales} barGap={2} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<SalesTooltip />} />
                  <Bar yAxisId="left" dataKey="revenue" name="revenue" fill="#10b981" radius={[5, 5, 0, 0]} />
                  <Bar yAxisId="right" dataKey="orders" name="orders" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Revenue by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">This month</p>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryBreakdown.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {categoryBreakdown.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-slate-500">{c.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700">₹{(c.value / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stock Movement */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Stock Movement</h3>
            <p className="text-xs text-slate-400 mt-0.5">Inbound vs outbound units this week</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-5 mb-4">
              {[
                { color: '#10b981', label: 'Inbound' },
                { color: '#f59e0b', label: 'Outbound' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stockMovement}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="inbound" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                <Line type="monotone" dataKey="outbound" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Top Selling Products</h3>
            <p className="text-xs text-slate-400 mt-0.5">Best performers this month at Lekki Branch</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Units Sold</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-600">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, idx) => (
                  <tr key={product.name} className={`border-b border-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'} hover:bg-emerald-50/20 transition-colors`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{product.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{product.sold}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">${product.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ShopAdminLayout>
  );
}
