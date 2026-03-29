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
