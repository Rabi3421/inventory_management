'use client';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, TooltipProps,  } from 'recharts';


// Shop-wise stock comparison data
const shopStockData = [
  { shop: 'Ikeja', inStock: 18420, lowStock: 1240, outOfStock: 80 },
  { shop: 'Lekki', inStock: 14300, lowStock: 2100, outOfStock: 340 },
  { shop: 'Surulere', inStock: 11800, lowStock: 890, outOfStock: 120 },
  { shop: 'Yaba', inStock: 16540, lowStock: 1560, outOfStock: 60 },
  { shop: 'Ajah', inStock: 9200, lowStock: 3200, outOfStock: 510 },
  { shop: 'VI', inStock: 15600, lowStock: 720, outOfStock: 40 },
];

// Category stock distribution
const categoryData = [
  { name: 'Electronics', value: 28400, color: '#4f46e5' },
  { name: 'Apparel', value: 19800, color: '#0ea5e9' },
  { name: 'Food & Bev', value: 16200, color: '#10b981' },
  { name: 'Home & Garden', value: 12600, color: '#f59e0b' },
  { name: 'Health & Beauty', value: 9800, color: '#ec4899' },
  { name: 'Sporting Goods', value: 7512, color: '#8b5cf6' },
];

type ChartTab = 'shopwise' | 'category';

function ShopwiseTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label} Branch</p>
      {payload.map(p => (
        <div key={`tt-${p.dataKey}`} className="flex items-center justify-between gap-6 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-semibold font-tabular text-slate-800">
            {(p.value as number).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
      <p className="text-slate-500">
        <span className="font-semibold font-tabular text-slate-800">{(d.value as number).toLocaleString()}</span> units
      </p>
    </div>
  );
}

export default function ChartsSection() {
  const [activeTab, setActiveTab] = useState<ChartTab>('shopwise');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Inventory Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5">Stock distribution across shops and categories</p>
        </div>
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          {([
            { key: 'shopwise', label: 'Shop-wise' },
            { key: 'category', label: 'By Category' },
          ] as { key: ChartTab; label: string }[]).map(tab => (
            <button
              key={`chart-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                ${activeTab === tab.key
                  ? 'bg-white text-indigo-700 shadow-card'
                  : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {activeTab === 'shopwise' ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              {[
                { color: '#4f46e5', label: 'In Stock' },
                { color: '#f59e0b', label: 'Low Stock' },
                { color: '#ef4444', label: 'Out of Stock' },
              ].map(l => (
                <div key={`legend-${l.label}`} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={shopStockData} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shop"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ShopwiseTooltip />} cursor={{ fill: 'rgba(79,70,229,0.04)' }} />
                <Bar dataKey="inStock" name="In Stock" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lowStock" name="Low Stock" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outOfStock" name="Out of Stock" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {categoryData.map(cat => {
                const total = categoryData.reduce((s, c) => s + c.value, 0);
                const pct = ((cat.value / total) * 100).toFixed(1);
                return (
                  <div key={`cat-legend-${cat.name}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        <span className="text-slate-600 font-medium">{cat.name}</span>
                      </div>
                      <span className="font-tabular font-semibold text-slate-700">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}