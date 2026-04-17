'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'HomeIcon', href: '/billing-counter/dashboard' },
  { label: 'Billing', icon: 'ReceiptPercentIcon', href: '/billing-counter/billing' },
  { label: 'Returns', icon: 'ArrowPathIcon', href: '/billing-counter/returns' },
];

interface BillingCounterSidebarProps {
  activeRoute?: string;
}

export default function BillingCounterSidebar({ activeRoute = '/billing-counter/dashboard' }: BillingCounterSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });
  const { user } = useAuth();

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setCollapsed(true);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside
      className={[
        'flex flex-col bg-white border-r border-slate-100 shadow-sm transition-all duration-300 ease-in-out shrink-0 z-20',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      <div className={`flex items-center border-b border-slate-100 bg-gradient-to-br from-amber-600 to-orange-700 ${collapsed ? 'h-16 justify-center px-3' : 'h-20 gap-3 px-4'}`}>
        {collapsed ? (
          <img src="/assets/images/srs1.png" alt="SRS" className="w-10 h-10 object-contain drop-shadow-md" />
        ) : (
          <>
            <img src="/assets/images/srs1.png" alt="SRS Logo" className="w-12 h-12 object-contain drop-shadow-md shrink-0" />
            <div className="min-w-0">
              <span className="font-black text-white text-base tracking-wide block truncate leading-tight">श्री राम स्टोर्स</span>
              <span className="text-[10px] text-amber-100 font-semibold tracking-widest uppercase block mt-0.5">Billing Counter</span>
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Icon name="UserCircleIcon" size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-800 truncate">{user?.name ?? 'Counter Staff'}</p>
              <p className="text-[10px] text-amber-600 truncate">{user?.shopName ?? 'Assigned Shop'}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(item => {
          const active = activeRoute === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                active ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                collapsed ? 'justify-center px-2' : '',
              ].join(' ')}
            >
              <Icon
                name={item.icon as Parameters<typeof Icon>[0]['name']}
                size={18}
                className={active ? 'shrink-0 text-amber-600' : 'shrink-0 text-slate-400 group-hover:text-slate-600'}
              />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-9 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all duration-150"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'} size={16} className="transition-transform duration-200" />
          {!collapsed && <span className="ml-2 text-xs text-slate-400">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
