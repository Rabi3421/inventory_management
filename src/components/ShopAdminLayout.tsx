import React from 'react';
import ShopAdminSidebar from './ShopAdminSidebar';
import ShopAdminTopbar from './ShopAdminTopbar';

interface ShopAdminLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function ShopAdminLayout({ children, activeRoute = '/shop-admin/dashboard' }: ShopAdminLayoutProps) {
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
