import React from 'react';
import AppLayout from '@/components/AppLayout';
import KPIBentoGrid from './components/KPIBentoGrid';
import InventoryTable from './components/InventoryTable';
import QuickActionsPanel from './components/QuickActionsPanel';
import ChartsSection from './components/ChartsSection';
import DashboardHeader from './components/DashboardHeader';

export default function DashboardPage() {
  return (
    <AppLayout activeRoute="/dashboard">
      <div className="space-y-6 animate-fade-in">
        <DashboardHeader />
        <KPIBentoGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ChartsSection />
          </div>
          <div className="xl:col-span-1">
            <QuickActionsPanel />
          </div>
        </div>
        <InventoryTable />
      </div>
    </AppLayout>
  );
}