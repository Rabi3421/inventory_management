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

export default function Topbar() {
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
          placeholder="Search products, barcodes, shops…"
          value={searchVal}
          onChange={e => setSearchVal(e?.target?.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
          ⌘K
        </kbd>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {/* Sync indicator — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Synced 2m ago</span>
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
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {isLoading ? '…' : getInitials(user?.name)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name ?? 'Loading user'}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.role === 'superadmin' ? 'Superadmin' : 'Signed in'}</p>
          </div>
          <Icon name="ChevronDownIcon" size={14} className="text-slate-400 group-hover:text-slate-600 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}