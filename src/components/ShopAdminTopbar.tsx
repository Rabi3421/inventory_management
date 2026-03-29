'use client';
import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

function getInitials(name?: string) {
  if (!name) {
    return 'SA';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

export default function ShopAdminTopbar() {
  const [searchVal, setSearchVal] = useState('');
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-100 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 shrink-0 z-10">
      {/* Search — hidden on mobile */}
      <div className="hidden sm:flex flex-1 max-w-md relative">
        <Icon
          name="MagnifyingGlassIcon"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search my shop products, barcodes…"
          value={searchVal}
          onChange={e => setSearchVal(e?.target?.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150"
        />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {/* Shop indicator */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
          <Icon name="BuildingStorefrontIcon" size={13} className="text-emerald-600" />
          <span className="font-medium max-w-[80px] sm:max-w-none truncate">{isLoading ? '…' : (user?.shopName ?? 'My Shop')}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-150">
          <Icon name="BellIcon" size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* Help — hidden on mobile */}
        <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-150">
          <Icon name="QuestionMarkCircleIcon" size={18} />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => void logout()}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all duration-150"
        >
          <Icon name="ArrowRightOnRectangleIcon" size={16} className="text-slate-400" />
          <span>Sign out</span>
        </button>

        <button className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all duration-150 group">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {isLoading ? '…' : getInitials(user?.name)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name ?? 'Loading user'}</p>
            <p className="text-[10px] text-emerald-600 leading-tight font-medium">{user?.shopName ?? 'Shop Admin'}</p>
          </div>
          <Icon name="ChevronDownIcon" size={14} className="text-slate-400 group-hover:text-slate-600 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
