'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid, { type KPIData } from './components/KPIBentoGrid';
import ChartsSection, { type ShopwisePoint, type CategoryPoint } from './components/ChartsSection';
import QuickActionsPanel, { type StockAlert } from './components/QuickActionsPanel';
import InventoryTable from './components/InventoryTable';

interface DashboardData {
  kpi:           KPIData;
  shopwiseChart: ShopwisePoint[];
  categoryChart: CategoryPoint[];
  stockAlerts:   StockAlert[];
}

export default function DashboardPage() {
  const [data, setData]                 = useState<DashboardData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [range, setRange]               = useState('30d');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/dashboard');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch {
      // keep previous data on error, dashboard stays usable
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  const handleRefresh = () => { if (!loading) fetchDashboard(); };

  return (
    <AppLayout activeRoute="/dashboard">
      <div className="space-y-6 animate-fade-in">
        <DashboardHeader
          range={range}
          onRangeChange={setRange}
          onRefresh={handleRefresh}
          refreshing={loading}
          shopCount={data?.kpi.totalShops ?? 0}
          activeShops={data?.kpi.activeShops ?? 0}
          lastRefreshed={lastRefreshed}
        />

        <KPIBentoGrid
          data={data?.kpi ?? null}
          loading={loading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <ChartsSection
              shopwiseData={data?.shopwiseChart ?? []}
              categoryData={data?.categoryChart ?? []}
              loading={loading}
            />
          </div>
          <div className="lg:col-span-1">
            <QuickActionsPanel
              alerts={data?.stockAlerts ?? []}
              loading={loading}
            />
          </div>
        </div>

        <InventoryTable />
      </div>
    </AppLayout>
  );
}
