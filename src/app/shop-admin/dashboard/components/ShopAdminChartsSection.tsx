'use client';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export interface WeeklyPoint   { day: string; sold: number; restocked: number; }
export interface CategoryPoint  { name: string; value: number; color: string; }

interface Props {
  weeklyData:   WeeklyPoint[];
  categoryData: CategoryPoint[];
  shopName:     string;
  loading:      boolean;
}

type ChartTab = 'weekly' | 'category';

export default function ShopAdminChartsSection({ weeklyData, categoryData, shopName, loading }: Props) {
  const [activeTab, setActiveTab] = useState<ChartTab>('weekly');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Shop Performance</h3>
          <p className="text-xs text-slate-400 mt-0.5">{shopName || 'My Shop'} · This week</p>
        </div>
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          {([{ key: 'weekly', label: 'Weekly Activity' }, { key: 'category', label: 'By Category' }] as { key: ChartTab; label: string }[]).map(tab => (
            <button key={`chart-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                activeTab === tab.key ? 'bg-white text-emerald-700 shadow-card' : 'text-slate-500 hover:text-slate-700'
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="h-[220px] bg-slate-50 rounded-xl animate-pulse" />
        ) : activeTab === 'weekly' ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Units Sold
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-sm bg-indigo-300 inline-block" />Restocked
              </div>
            </div>
            {weeklyData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No activity data yet for this shop.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="sold" fill="#10b981" radius={[4, 4, 0, 0]} name="Units Sold" />
                  <Bar dataKey="restocked" fill="#a5b4fc" radius={[4, 4, 0, 0]} name="Restocked" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          categoryData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No product data yet for this shop.</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(value: number) => [`${value} SKUs`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {categoryData.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-slate-600 truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 font-tabular shrink-0">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
