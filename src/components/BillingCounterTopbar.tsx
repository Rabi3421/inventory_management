'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

function getInitials(name?: string) {
  if (!name) return 'BC';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

export default function BillingCounterTopbar() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-100 flex items-center justify-between gap-3 px-3 sm:px-6 shrink-0 z-10">
      <div>
        <p className="text-sm font-semibold text-slate-800">Counter Billing Workspace</p>
        <p className="text-xs text-slate-500">Create bills quickly for {user?.shopName ?? 'your assigned shop'}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.push('/billing-counter/billing')}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
        >
          <Icon name="PlusIcon" size={16} />
          <span className="hidden sm:inline">New Bill</span>
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
            {getInitials(user?.name)}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name ?? 'Billing Counter'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email ?? 'Signed in'}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isLoading}
            className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600 transition-colors disabled:opacity-60"
            title="Logout"
          >
            <Icon name="ArrowRightStartOnRectangleIcon" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
