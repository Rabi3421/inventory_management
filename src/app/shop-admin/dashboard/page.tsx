import React from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import ShopAdminDashboardHeader from './components/ShopAdminDashboardHeader';
import ShopAdminKPIGrid from './components/ShopAdminKPIGrid';
import ShopAdminInventoryTable from './components/ShopAdminInventoryTable';
import ShopAdminQuickActions from './components/ShopAdminQuickActions';
import ShopAdminChartsSection from './components/ShopAdminChartsSection';

export default function ShopAdminDashboardPage() {
  return (
    <ShopAdminLayout activeRoute="/shop-admin/dashboard">
      <div className="space-y-6 animate-fade-in">
        <ShopAdminDashboardHeader />
        <ShopAdminKPIGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ShopAdminChartsSection />
          </div>
          <div className="xl:col-span-1">
            <ShopAdminQuickActions />
          </div>
        </div>
        <ShopAdminInventoryTable />
      </div>
    </ShopAdminLayout>
  );
}
