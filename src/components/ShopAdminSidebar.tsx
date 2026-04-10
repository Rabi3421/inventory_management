'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

const BASE_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'HomeIcon', href: '/shop-admin/dashboard' },
  { label: 'My Inventory', icon: 'ClipboardDocumentListIcon', href: '/shop-admin/inventory' },
  { label: 'Products', icon: 'CubeIcon', href: '/shop-admin/products' },
  { label: 'Billing', icon: 'ReceiptPercentIcon', href: '/shop-admin/billing' },
  { label: 'Bills', icon: 'DocumentTextIcon', href: '/shop-admin/bills' },
  { label: 'Reports', icon: 'ChartBarIcon', href: '/shop-admin/reports' },
  { label: 'Settings', icon: 'Cog6ToothIcon', href: '/shop-admin/settings' },
];

interface ShopAdminSidebarProps {
  activeRoute?: string;
}

export default function ShopAdminSidebar({ activeRoute = '/shop-admin/dashboard' }: ShopAdminSidebarProps) {
  // Auto-collapse on small screens
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });
  const { user } = useAuth();
  const shopName = user?.shopName ?? 'My Shop';
  const shopId   = user?.shopId   ?? '';

  // Collapse on resize below md
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setCollapsed(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [lowStock, setLowStock] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!shopId) return;
    fetch(`/api/inventory?shopId=${shopId}&page=1&limit=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setLowStock(data.stats?.lowStock ?? 0))
      .catch(() => {});
  }, [shopId]);

  const navItems: NavItem[] = BASE_NAV.map(item => {
    if (item.href === '/shop-admin/inventory' && lowStock !== undefined && lowStock > 0) {
      return { ...item, badge: lowStock };
    }
    return item;
  });

  return (
    <aside
      className={`
        flex flex-col bg-white border-r border-slate-100 shadow-sm
        transition-all duration-300 ease-in-out shrink-0 z-20
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo + Shop Badge */}
      <div className={`flex items-center border-b border-slate-100 bg-gradient-to-br from-emerald-700 to-emerald-900 ${collapsed ? 'h-16 justify-center px-3' : 'h-20 gap-3 px-4'}`}>
        {collapsed ? (
          <img
            src="/assets/images/srs1.png"
            alt="SRS"
            className="w-10 h-10 object-contain drop-shadow-md"
          />
        ) : (
          <>
            <img
              src="/assets/images/srs1.png"
              alt="SRS Logo"
              className="w-12 h-12 object-contain drop-shadow-md shrink-0"
            />
            <div className="min-w-0">
              <span className="font-black text-white text-base tracking-wide block truncate leading-tight">
                श्री राम स्टोर्स
              </span>
              <span className="text-[10px] text-emerald-200 font-semibold tracking-widest uppercase block mt-0.5">
                Shop Admin
              </span>
            </div>
          </>
        )}
      </div>

      {/* Shop Info */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Icon name="BuildingStorefrontIcon" size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 truncate">{shopName}</p>
              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Live · Synced
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(item => (
          <NavLink key={`nav-${item.href}`} item={item} active={activeRoute === item.href} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-9 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all duration-150"
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
          ? 'bg-emerald-50 text-emerald-700' :'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }
        ${collapsed ? 'justify-center px-2' : ''}
      `}
    >
      <Icon
        name={item.icon as Parameters<typeof Icon>[0]['name']}
        size={18}
        className={`shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`}
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
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-600 rounded-r-full" />
      )}
    </Link>
  );
}
