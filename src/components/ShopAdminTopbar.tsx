'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

function getInitials(name?: string) {
  if (!name) return 'SA';
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

interface SearchResult {
  _id: string;
  name: string;
  sku: string;
  availableQty: number;
  price: number;
}

interface Notification {
  id: string;
  productId: string;
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  productName: string;
  sku: string;
  availableQty: number;
}

export default function ShopAdminTopbar() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchVal, setSearchVal]   = useState('');
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef                   = useRef<HTMLDivElement>(null);
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notification state ───────────────────────────────────────────────────
  const [notifications, setNotifications]       = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen]               = useState(false);
  const [notifLoading, setNotifLoading]         = useState(false);
  const [readIds, setReadIds]                   = useState<Set<string>>(new Set());
  const notifRef                                = useRef<HTMLDivElement>(null);

  // ── Dropdown state ────────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    const shopId = user?.shopId ?? '';
    if (!shopId) return;
    setNotifLoading(true);
    try {
      const res = await fetch(`/api/notifications?shopId=${shopId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch { /* ignore */ }
    finally { setNotifLoading(false); }
  }, [user?.shopId]);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.shopId]);

  // Close search panel on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [notifOpen]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [dropdownOpen]);

  // Mark all as read when panel opens
  function handleOpenNotif() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      // Refresh on open
      fetchNotifications();
    }
  }

  function markAllRead() {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
  }

  function handleNotifClick(n: Notification) {
    // Mark this one as read
    setReadIds(prev => { const s = new Set(prev); s.add(n.id); return s; });
    setNotifOpen(false);
    router.push(`/shop-admin/inventory?highlight=${n.productId}`);
  }

  // Debounced search fetch
  const doSearch = useCallback(async (q: string) => {
    const shopId = user?.shopId ?? '';
    if (!q.trim() || !shopId) { setResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/inventory?shopId=${shopId}&search=${encodeURIComponent(q)}&limit=8`,
        { credentials: 'include' }
      );
      const data = await res.json();
      setResults(res.ok ? (data.items ?? []) : []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [user?.shopId]);

  function handleSearchChange(val: string) {
    setSearchVal(val);
    setSearchOpen(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(() => doSearch(val), 300);
  }

  function handleResultClick(id: string) {
    setSearchOpen(false);
    setSearchVal('');
    setResults([]);
    router.push(`/shop-admin/inventory?highlight=${id}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setSearchOpen(false);
    router.push(`/shop-admin/inventory?search=${encodeURIComponent(searchVal.trim())}`);
    setSearchVal('');
    setResults([]);
  }

  const showDropdown = searchOpen && searchVal.trim().length > 0;

  // Displayed unread count: recalculate live
  const liveUnread = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-100 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 shrink-0 z-10">

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="hidden sm:flex flex-1 max-w-md relative" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="w-full">
          <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          <input
            type="text"
            placeholder="Search products, barcodes…"
            value={searchVal}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => { if (searchVal.trim()) setSearchOpen(true); }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150"
          />
        </form>

        {/* Results dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
            {results.length === 0 && !searching ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">No products found</div>
            ) : results.map(r => (
              <button
                key={r._id}
                onMouseDown={() => handleResultClick(r._id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700">{r.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{r.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-700">₹{r.price.toLocaleString('en-IN')}</p>
                  <p className={`text-[10px] font-semibold ${r.availableQty === 0 ? 'text-red-500' : r.availableQty <= 20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {r.availableQty === 0 ? 'Out of stock' : `${r.availableQty} left`}
                  </p>
                </div>
              </button>
            ))}
            {results.length > 0 && (
              <button
                onMouseDown={handleSearchSubmit as never}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Icon name="MagnifyingGlassIcon" size={12} />
                See all results for &ldquo;{searchVal}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Right side items ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {/* New Bill CTA */}
        <Link
          href="/shop-admin/billing"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          <Icon name="ReceiptPercentIcon" size={14} className="text-white" />
          <span className="hidden sm:inline">New Bill</span>
          <span className="sm:hidden">Bill</span>
        </Link>

        {/* ── Notification Bell ─────────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleOpenNotif}
            className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-150"
            aria-label="Notifications"
          >
            <Icon name="BellIcon" size={18} />
            {liveUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-[9px] font-bold text-white leading-none px-0.5">
                {liveUnread > 99 ? '99+' : liveUnread}
              </span>
            )}
            {notifLoading && liveUnread === 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
            )}
          </button>

          {/* Notification panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Icon name="BellIcon" size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Notifications</span>
                  {liveUnread > 0 && (
                    <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                      {liveUnread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {liveUnread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={fetchNotifications}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Refresh"
                  >
                    <Icon name="ArrowPathIcon" size={13} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                {notifLoading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Loading…
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                    <Icon name="BellIcon" size={28} className="text-slate-200" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs text-slate-300">No stock alerts right now</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const isRead = readIds.has(n.id);
                    const isCritical = n.severity === 'critical';
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors group
                          ${isRead ? 'opacity-60 hover:opacity-100 hover:bg-slate-50' : isCritical ? 'bg-red-50/60 hover:bg-red-50' : 'bg-amber-50/40 hover:bg-amber-50'}`}
                      >
                        {/* Icon */}
                        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                          ${isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                          <Icon name={isCritical ? 'XCircleIcon' : 'ExclamationTriangleIcon'} size={14} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wide
                              ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                              {n.title}
                            </span>
                            {!isRead && (
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                                ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">
                            {n.productName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{n.message}</p>
                        </div>

                        {/* Stock badge */}
                        <div className={`flex-shrink-0 text-[10px] font-bold rounded-md px-1.5 py-0.5 mt-0.5
                          ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {n.availableQty} left
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50">
                  <Link
                    href="/shop-admin/inventory"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <Icon name="ArrowRightIcon" size={12} />
                    View full inventory
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all duration-150 group"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {isLoading ? '…' : getInitials(user?.name)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name ?? 'Loading…'}</p>
              <p className="text-[10px] text-emerald-600 leading-tight font-medium">{user?.shopName ?? 'Shop Admin'}</p>
            </div>
            <Icon
              name="ChevronDownIcon"
              size={14}
              className={`text-slate-400 group-hover:text-slate-600 hidden sm:block transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {user?.shopName ?? 'Shop Admin'}
                </span>
              </div>
              <div className="py-1">
                <Link
                  href="/shop-admin/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Icon name="Cog6ToothIcon" size={15} className="text-slate-400" />
                  Settings
                </Link>
                <Link
                  href="/shop-admin/bills"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Icon name="DocumentTextIcon" size={15} className="text-slate-400" />
                  Bills History
                </Link>
              </div>
              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={() => { setDropdownOpen(false); void logout(); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <Icon name="ArrowRightOnRectangleIcon" size={15} className="text-red-400" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
