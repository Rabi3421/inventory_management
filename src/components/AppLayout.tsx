'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useRoleGuard } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function AppLayout({ children, activeRoute = '/dashboard' }: AppLayoutProps) {
  const { isAuthorized, isLoading } = useRoleGuard('superadmin');

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-11 h-11 mx-auto rounded-2xl border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="mt-4 text-sm font-medium text-slate-700">Checking your superadmin session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeRoute={activeRoute} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}