'use client';
import React, { useState, useEffect, useCallback } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import ShopAdminDashboardHeader from './components/ShopAdminDashboardHeader';
import ShopAdminKPIGrid, { type ShopKPIData } from './components/ShopAdminKPIGrid';
import ShopAdminInventoryTable from './components/ShopAdminInventoryTable';
import ShopAdminQuickActions, { type StockAlert } from './components/ShopAdminQuickActions';
import ShopAdminChartsSection, { type WeeklyPoint, type CategoryPoint } from './components/ShopAdminChartsSection';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  shopId:       string;
  shopName:     string;
  kpi:          ShopKPIData;
  weeklyChart:  WeeklyPoint[];
  categoryChart:CategoryPoint[];
  stockAlerts:  StockAlert[];
}

export default function ShopAdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData]                     = useState<DashboardData | null>(null);
  const [loading, setLoading]               = useState(true);
  const [range, setRange]                   = useState('30d');
  const [lastRefreshed, setLastRefreshed]   = useState<Date | null>(null);
  const [returnSummary, setReturnSummary]   = useState({ todayReturns: 0, todayRefundAmount: 0, todayReturnedItems: 0 });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/shop-admin/dashboard');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (!user?.shopId) return;

    fetch(`/api/returns?shopId=${encodeURIComponent(user.shopId)}&limit=1`, { credentials: 'include' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(json => {
        setReturnSummary({
          todayReturns: Number(json.summary?.todayReturns ?? 0),
          todayRefundAmount: Number(json.summary?.todayRefundAmount ?? 0),
          todayReturnedItems: Number(json.summary?.todayReturnedItems ?? 0),
        });
      })
      .catch(() => {
        setReturnSummary({ todayReturns: 0, todayRefundAmount: 0, todayReturnedItems: 0 });
      });
  }, [user?.shopId, lastRefreshed]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  const shopName = data?.shopName ?? user?.shopName ?? '';
  const shopId   = data?.shopId   ?? user?.shopId   ?? '';

  return (
    <ShopAdminLayout activeRoute="/shop-admin/dashboard">
      <div className="space-y-6 animate-fade-in">
        <ShopAdminDashboardHeader
          shopName={shopName}
          range={range}
          onRangeChange={setRange}
          onRefresh={fetchDashboard}
          refreshing={loading}
          lastRefreshed={lastRefreshed}
        />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">Returns Control</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Manage product returns for {shopName || 'your shop'}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">Find the original bill, mark the exact quantities coming back, and push the stock back into inventory with a full return trail.</p>
              </div>
              <a
                href="/shop-admin/returns"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
              >
                <span>Open Returns</span>
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Today's returns</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Return entries</span>
                <span className="text-sm font-semibold text-slate-900">{returnSummary.todayReturns}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Refund value</span>
                <span className="text-sm font-semibold text-rose-700">₹{returnSummary.todayRefundAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Items added back</span>
                <span className="text-sm font-semibold text-slate-900">{returnSummary.todayReturnedItems}</span>
              </div>
            </div>
          </div>
        </section>
        <ShopAdminKPIGrid
          data={data?.kpi ?? null}
          loading={loading}
          shopName={shopName}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <ShopAdminChartsSection
              weeklyData={data?.weeklyChart ?? []}
              categoryData={data?.categoryChart ?? []}
              shopName={shopName}
              loading={loading}
            />
          </div>
          <div className="lg:col-span-1">
            <ShopAdminQuickActions
              alerts={data?.stockAlerts ?? []}
              loading={loading}
            />
          </div>
        </div>
        <ShopAdminInventoryTable shopId={shopId} shopName={shopName} />
      </div>
    </ShopAdminLayout>
  );
}
