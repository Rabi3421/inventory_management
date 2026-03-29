'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number;
  group?: string;
}

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', icon: 'HomeIcon', href: '/dashboard', group: 'main' },
  { label: 'Products', icon: 'CubeIcon', href: '/dashboard/products', group: 'main' },
  { label: 'Inventory', icon: 'ClipboardDocumentListIcon', href: '/dashboard/inventory', group: 'main' },
  { label: 'Shops', icon: 'BuildingStorefrontIcon', href: '/shops', group: 'main' },
  { label: 'Users', icon: 'UsersIcon', href: '/users', group: 'admin' },
  { label: 'Reports', icon: 'ChartBarIcon', href: '/reports', group: 'admin' },
  { label: 'Settings', icon: 'Cog6ToothIcon', href: '/settings', group: 'admin' },
];

interface SidebarProps {
  activeRoute?: string;
}

export default function Sidebar({ activeRoute = '/dashboard' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });
  const [inventoryCount, setInventoryCount] = useState<number>(0);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setCollapsed(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/inventory?limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.pagination?.total !== undefined) setInventoryCount(data.pagination.total); })
      .catch(() => {});
  }, []);

  const navItems = baseNavItems.map(item =>
    item.href === '/dashboard/inventory'
      ? { ...item, badge: inventoryCount }
      : item
  );

  const mainItems = navItems.filter(i => i.group === 'main');
  const adminItems = navItems.filter(i => i.group === 'admin');

  return (
    <aside
      className={`
        flex flex-col bg-white border-r border-slate-100 shadow-sm
        transition-all duration-300 ease-in-out shrink-0 z-20
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-slate-100 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-semibold text-slate-800 text-sm tracking-tight truncate">
            ShopInventory
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="text-[10px] font-600 uppercase tracking-widest text-slate-400 px-3 pb-2 pt-1">
            Main
          </p>
        )}
        {mainItems.map(item => (
          <NavLink key={`nav-${item.href}`} item={item} active={activeRoute === item.href} collapsed={collapsed} />
        ))}

        <div className={`${collapsed ? 'my-2' : 'my-3'} border-t border-slate-100`} />

        {!collapsed && (
          <p className="text-[10px] font-600 uppercase tracking-widest text-slate-400 px-3 pb-2 pt-1">
            Admin
          </p>
        )}
        {adminItems.map(item => (
          <NavLink key={`nav-${item.href}`} item={item} active={activeRoute === item.href} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-9 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all duration-150 group"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon
            name={collapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'}
            size={16}
            className="transition-transform duration-200"
          />
          {!collapsed && <span className="ml-2 text-xs text-slate-400">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function NavLink({ item, active, collapsed }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-150 group relative
        ${active
          ? 'bg-indigo-50 text-indigo-700' :'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }
        ${collapsed ? 'justify-center px-2' : ''}
      `}
    >
      <Icon
        name={item.icon as Parameters<typeof Icon>[0]['name']}
        size={18}
        className={`shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {item.badge}
            </span>
          )}
        </>
      )}
      {collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-r-full" />
      )}
    </Link>
  );
}