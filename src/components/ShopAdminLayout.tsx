'use client';

import React from 'react';
import ShopAdminSidebar from './ShopAdminSidebar';
import ShopAdminTopbar from './ShopAdminTopbar';
import { useRoleGuard } from '@/contexts/AuthContext';

interface ShopAdminLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function ShopAdminLayout({ children, activeRoute = '/shop-admin/dashboard' }: ShopAdminLayoutProps) {
  const { isAuthorized, isLoading } = useRoleGuard('shopadmin');

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-11 h-11 mx-auto rounded-2xl border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="mt-4 text-sm font-medium text-slate-700">Checking your shop admin session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ShopAdminSidebar activeRoute={activeRoute} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ShopAdminTopbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
