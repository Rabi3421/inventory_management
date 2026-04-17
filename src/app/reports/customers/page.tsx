'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type RangeKey = '30d' | '90d' | '1y' | 'all';
type GroupBy = 'day' | 'month' | 'year';

interface Summary {
  trackedCustomers: number;
  repeatCustomers: number;
  totalVisits: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface CustomerListItem {
  customerPhone: string;
  customerName: string;
  visitCount: number;
  totalSpend: number;
  averageOrderValue: number;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
}

interface PeriodBreakdownRow {
  period: string;
  billCount: number;
  totalSpend: number;
  averageSpend: number;
}

interface RecentPurchase {
  billId: string;
  billNumber: string;
  shopId: string;
  shopName: string;
  total: number;
  itemCount: number;
  createdAt: string;
  customerName: string;
  customerPhone: string;
}

interface FavoriteProduct {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  spend: number;
}

interface ShopBreakdownRow {
  shopId: string;
  shopName: string;
  visitCount: number;
  totalSpend: number;
  lastPurchaseAt: string;
}

interface CustomerDetail extends CustomerListItem {
  periodBreakdown: PeriodBreakdownRow[];
  recentPurchases: RecentPurchase[];
  favoriteProducts: FavoriteProduct[];
  shopBreakdown: ShopBreakdownRow[];
}

interface CustomerAnalyticsResponse {
  range: RangeKey;
  groupBy: GroupBy;
  summary: Summary;
  topCustomers: CustomerListItem[];
  searchResults: CustomerListItem[];
  customer: CustomerDetail | null;
}

const RANGE_OPTIONS: RangeKey[] = ['30d', '90d', '1y', 'all'];
const GROUP_OPTIONS: GroupBy[] = ['day', 'month', 'year'];

function fmtMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function fmtDate(value: string, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatPeriodLabel(value: string, groupBy: GroupBy) {
  if (!value) return '—';
  if (groupBy === 'year') return value;
  if (groupBy === 'month') {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(year, (month || 1) - 1, 1));
  }
  return fmtDate(value);
}

function timeAgo(value: string) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

export default function CustomerReportsPage() {
  const [range, setRange] = useState<RangeKey>('1y');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (options?: { phone?: string; search?: string }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ range, groupBy });
      const phone = options?.phone ?? selectedPhone;
      const search = options?.search ?? searchInput.trim();
      if (phone) params.set('phone', phone);
      if (search) params.set('search', search);

      const res = await fetch(`/api/reports/customers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as CustomerAnalyticsResponse;
      setData(json);
    } catch {
      setError('Failed to load customer analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupBy, range, searchInput, selectedPhone]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    const value = searchInput.trim();
    setSelectedPhone(/^\d{7,15}$/.test(value) ? value : '');
    void fetchData({ phone: /^\d{7,15}$/.test(value) ? value : '', search: value });
  };

  const clearSelection = () => {
    setSelectedPhone('');
    setSearchInput('');
    void fetchData({ phone: '', search: '' });
  };

  const customer = data?.customer ?? null;
  const cards = useMemo(() => ([
    {
      label: 'Tracked Customers',
      value: loading ? '—' : fmtNumber(data?.summary.trackedCustomers ?? 0),
      helper: 'Customers with mobile number',
      icon: 'UsersIcon',
      color: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-100',
    },
    {
      label: 'Repeat Customers',
      value: loading ? '—' : fmtNumber(data?.summary.repeatCustomers ?? 0),
      helper: 'Purchased more than once',
      icon: 'ArrowPathRoundedSquareIcon',
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Customer Visits',
      value: loading ? '—' : fmtNumber(data?.summary.totalVisits ?? 0),
      helper: 'Bills linked to mobile numbers',
      icon: 'ReceiptPercentIcon',
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
    },
    {
      label: 'Average Order',
      value: loading ? '—' : fmtMoney(data?.summary.averageOrderValue ?? 0),
      helper: `Total spend ${fmtMoney(data?.summary.totalRevenue ?? 0)}`,
      icon: 'BanknotesIcon',
      color: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
    },
  ]), [data?.summary.averageOrderValue, data?.summary.repeatCustomers, data?.summary.totalRevenue, data?.summary.totalVisits, data?.summary.trackedCustomers, loading]);

  return (
    <AppLayout activeRoute="/reports/customers">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
              <Link href="/reports" className="transition-colors hover:text-indigo-700">Reports</Link>
              <span>/</span>
              <span className="font-medium text-slate-700">Customer Tracker</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Customer Purchase Tracker</h1>
            <p className="mt-0.5 text-sm text-slate-500">Track repeat visits and spending by customer mobile number for offers, gifts, and loyalty ideas.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void fetchData()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Icon name="ArrowPathIcon" size={14} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="ExclamationTriangleIcon" size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">Search by mobile number</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  inputMode="numeric"
                  value={searchInput}
                  onChange={event => setSearchInput(event.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  placeholder="Enter customer mobile number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={handleSearch}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Icon name="MagnifyingGlassIcon" size={15} />
                  Search
                </button>
                <button
                  onClick={clearSelection}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Group</p>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                  {GROUP_OPTIONS.map(option => (
                    <button
                      key={option}
                      onClick={() => setGroupBy(option)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${groupBy === option ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Range</p>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                  {RANGE_OPTIONS.map(option => (
                    <button
                      key={option}
                      onClick={() => setRange(option)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${range === option ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className={`rounded-xl border ${card.border} bg-white p-4 shadow-sm`}>
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}>
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={17} />
                </div>
              </div>
              {loading ? (
                <>
                  <Skeleton className="mb-2 h-6 w-24" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-slate-800">{card.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{card.helper}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{card.label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Selected Customer</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Search a mobile number to view day-wise, month-wise, or year-wise spending.</p>
                </div>
                {customer && (
                  <div className="rounded-xl bg-indigo-50 px-3 py-2 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Last purchase</p>
                    <p className="text-sm font-bold text-indigo-800">{fmtDate(customer.lastPurchaseAt, true)}</p>
                    <p className="text-xs text-indigo-600">{timeAgo(customer.lastPurchaseAt)}</p>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !customer ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Search a customer mobile number to see visits, spend pattern, recent bills, and favorite products.
                </div>
              ) : (
                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                      <p className="mt-2 text-base font-bold text-slate-900">{customer.customerName || 'Walk-in saved by phone'}</p>
                      <p className="mt-1 font-mono text-sm text-slate-500">+91 {customer.customerPhone}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Visits</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{fmtNumber(customer.visitCount)}</p>
                      <p className="mt-1 text-xs text-slate-500">First purchase {fmtDate(customer.firstPurchaseAt)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Spend</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(customer.totalSpend)}</p>
                      <p className="mt-1 text-xs text-slate-500">Average order {fmtMoney(customer.averageOrderValue)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preferred Shop Count</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{fmtNumber(customer.shopBreakdown.length)}</p>
                      <p className="mt-1 text-xs text-slate-500">Across available bills in selected range</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">{groupBy} period</th>
                          <th className="px-4 py-3 font-semibold text-right">Bills</th>
                          <th className="px-4 py-3 font-semibold text-right">Spend</th>
                          <th className="px-4 py-3 font-semibold text-right">Avg bill</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {customer.periodBreakdown.map(row => (
                          <tr key={row.period}>
                            <td className="px-4 py-3 font-medium text-slate-700">{formatPeriodLabel(row.period, groupBy)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{fmtNumber(row.billCount)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtMoney(row.totalSpend)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(row.averageSpend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {customer && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 pb-4 pt-5">
                    <h3 className="text-base font-semibold text-slate-800">Recent Purchases</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Latest bills linked to this mobile number</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {customer.recentPurchases.map(bill => (
                      <div key={bill.billId} className="flex items-start justify-between gap-3 px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-800">{bill.billNumber}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{bill.shopName} • {bill.itemCount} items</p>
                          <p className="mt-1 text-xs text-slate-400">{fmtDate(bill.createdAt, true)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">{fmtMoney(bill.total)}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{timeAgo(bill.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 pb-4 pt-5">
                    <h3 className="text-base font-semibold text-slate-800">Favorite Products</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Products this customer buys most often</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {customer.favoriteProducts.map(product => (
                      <div key={`${product.productId}-${product.sku}`} className="flex items-start justify-between gap-3 px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-800">{product.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">{product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">{fmtMoney(product.spend)}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{fmtNumber(product.qty)} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {!!searchInput && !customer && (data?.searchResults.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800">Matching Customers</h3>
                <p className="mt-0.5 text-xs text-slate-400">Pick a number to open full customer analytics</p>
                <div className="mt-4 space-y-3">
                  {data?.searchResults.map(row => (
                    <button
                      key={row.customerPhone}
                      onClick={() => {
                        setSelectedPhone(row.customerPhone);
                        setSearchInput(row.customerPhone);
                        void fetchData({ phone: row.customerPhone, search: row.customerPhone });
                      }}
                      className="w-full rounded-xl border border-slate-100 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                      <p className="font-semibold text-slate-800">{row.customerName || 'Saved by phone only'}</p>
                      <p className="mt-1 font-mono text-sm text-slate-500">+91 {row.customerPhone}</p>
                      <p className="mt-1 text-xs text-slate-400">{fmtNumber(row.visitCount)} visits • {fmtMoney(row.totalSpend)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Top Customers</h3>
              <p className="mt-0.5 text-xs text-slate-400">Highest spending customers in the selected range</p>
              <div className="mt-4 space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))
                ) : (data?.topCustomers.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-400">No customer bills found for this range.</p>
                ) : (
                  data?.topCustomers.map((row, index) => (
                    <button
                      key={row.customerPhone}
                      onClick={() => {
                        setSelectedPhone(row.customerPhone);
                        setSearchInput(row.customerPhone);
                        void fetchData({ phone: row.customerPhone, search: row.customerPhone });
                      }}
                      className="flex w-full items-start gap-3 rounded-xl border border-slate-100 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{row.customerName || 'Saved by phone only'}</p>
                        <p className="mt-1 truncate font-mono text-xs text-slate-400">+91 {row.customerPhone}</p>
                        <p className="mt-1 text-xs text-slate-500">{fmtNumber(row.visitCount)} visits • Last {timeAgo(row.lastPurchaseAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">{fmtMoney(row.totalSpend)}</p>
                        <p className="mt-1 text-xs text-slate-400">Avg {fmtMoney(row.averageOrderValue)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {customer && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800">Shop Breakdown</h3>
                <p className="mt-0.5 text-xs text-slate-400">Where this customer buys most often</p>
                <div className="mt-4 space-y-3">
                  {customer.shopBreakdown.map(shop => (
                    <div key={shop.shopId} className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">{shop.shopName}</p>
                          <p className="mt-1 text-xs text-slate-400">Last purchase {fmtDate(shop.lastPurchaseAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">{fmtMoney(shop.totalSpend)}</p>
                          <p className="mt-1 text-xs text-slate-400">{fmtNumber(shop.visitCount)} bills</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
