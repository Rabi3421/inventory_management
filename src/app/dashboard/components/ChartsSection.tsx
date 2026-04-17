'use client';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, TooltipProps } from 'recharts';

export interface ShopwisePoint { shop: string; inStock: number; lowStock: number; outOfStock: number; }
export interface CategoryPoint  { name: string; value: number; color: string; }

interface Props {
  shopwiseData: ShopwisePoint[];
  categoryData: CategoryPoint[];
  loading: boolean;
}

type ChartTab = 'shopwise' | 'category';

function ShopwiseTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label} Branch</p>
      {payload.map(p => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-6 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? '' }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-semibold font-tabular text-slate-800">{(p.value as number).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
      <p className="text-slate-500"><span className="font-semibold font-tabular text-slate-800">{(d.value as number).toLocaleString('en-IN')}</span> units</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-end gap-3 h-[240px] px-2 pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <div className="bg-slate-100 rounded-sm" style={{ height: `${30 + Math.random() * 140}px` }} />
            <div className="h-2 bg-slate-100 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChartsSection({ shopwiseData, categoryData, loading }: Props) {
  const [activeTab, setActiveTab] = useState<ChartTab>('shopwise');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-800">Inventory Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5">Stock distribution across shops and categories</p>
        </div>
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg w-full xs:w-auto">
          {([{ key: 'shopwise', label: 'Shop-wise', short: 'Shops' }, { key: 'category', label: 'By Category', short: 'Category' }] as { key: ChartTab; label: string; short: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 xs:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                ${activeTab === tab.key ? 'bg-white text-indigo-700 shadow-card' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-5">
        {loading ? (
          <ChartSkeleton />
        ) : activeTab === 'shopwise' ? (
          <div>
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 flex-wrap">
              {[{ color: '#4f46e5', label: 'In Stock' }, { color: '#f59e0b', label: 'Low Stock' }, { color: '#ef4444', label: 'Out of Stock' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
                </div>
              ))}
            </div>
            {shopwiseData.length === 0 ? (
              <div className="h-[200px] sm:h-[240px] flex items-center justify-center text-slate-400 text-sm">No shop data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[240px]">
                <BarChart data={shopwiseData} barGap={2} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="shop" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ShopwiseTooltip />} cursor={{ fill: 'rgba(79,70,229,0.04)' }} />
                  <Bar dataKey="inStock"    name="In Stock"    fill="#4f46e5" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="lowStock"   name="Low Stock"   fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outOfStock" name="Out of Stock" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {categoryData.length === 0 ? (
              <div className="w-full h-[200px] sm:h-[240px] flex items-center justify-center text-slate-400 text-sm">No category data available</div>
            ) : (
              <>
                <div className="w-full sm:w-[55%]">
                <ResponsiveContainer width="100%" height={180} className="sm:!h-[240px]">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {categoryData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2 sm:space-y-2.5">
                  {(() => {
                    const total = categoryData.reduce((s, c) => s + c.value, 0);
                    return categoryData.map(cat => {
                      const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                              <span className="text-slate-600 font-medium">{cat.name}</span>
                            </div>
                            <span className="font-tabular font-semibold text-slate-700">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
