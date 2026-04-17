'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BillingCounterLayout from '@/components/BillingCounterLayout';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface BillItem {
  _id: string;
  billNumber: string;
  total: number;
  subtotal: number;
  gstAmount: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: Array<{ qty: number }>;
}

interface BillsResponse {
  bills: BillItem[];
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function BillingCounterDashboardPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnSummary, setReturnSummary] = useState({ todayReturns: 0, todayRefundAmount: 0, todayReturnedItems: 0 });

  const fetchBills = useCallback(async () => {
    if (!user?.shopId || !user?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bills?shopId=${encodeURIComponent(user.shopId)}&performedByUserId=${encodeURIComponent(user.id)}&limit=20`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch bills');

      const data = (await res.json()) as BillsResponse;
      setBills(data.bills ?? []);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.shopId]);

  const fetchReturnSummary = useCallback(async () => {
    if (!user?.shopId || !user?.id) return;

    try {
      const params = new URLSearchParams({
        shopId: user.shopId,
        performedByUserId: user.id,
        limit: '1',
      });
      const res = await fetch(`/api/returns?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch returns');
      const data = await res.json();
      setReturnSummary({
        todayReturns: Number(data.summary?.todayReturns ?? 0),
        todayRefundAmount: Number(data.summary?.todayRefundAmount ?? 0),
        todayReturnedItems: Number(data.summary?.todayReturnedItems ?? 0),
      });
    } catch {
      setReturnSummary({ todayReturns: 0, todayRefundAmount: 0, todayReturnedItems: 0 });
    }
  }, [user?.id, user?.shopId]);

  useEffect(() => {
    void fetchBills();
    void fetchReturnSummary();
  }, [fetchBills, fetchReturnSummary]);

  const todayKey = new Date().toDateString();

  const stats = useMemo(() => {
    const todayBills = bills.filter(bill => new Date(bill.createdAt).toDateString() === todayKey);
    const totalBills = todayBills.length;
    const todayRevenue = todayBills.reduce((sum, bill) => sum + bill.total, 0);
    const todayItems = todayBills.reduce((sum, bill) => sum + bill.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
    const averageBill = totalBills > 0 ? todayRevenue / totalBills : 0;

    return { totalBills, todayRevenue, todayItems, averageBill };
  }, [bills, todayKey]);

  const recentBills = bills.slice(0, 8);

  return (
    <BillingCounterLayout activeRoute="/billing-counter/dashboard">
      <div className="space-y-6 animate-fade-in">
        <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-600">Billing Counter</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Welcome back, {user?.name?.split(' ')[0] ?? 'teammate'}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Track your billing performance for {user?.shopName ?? 'your assigned shop'} and jump straight into new customer checkouts.</p>
            </div>
            <a
              href="/billing-counter/billing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
            >
              <Icon name="ReceiptPercentIcon" size={18} />
              Start New Bill
            </a>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Today's Bills", value: String(stats.totalBills), icon: 'DocumentTextIcon' },
            { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), icon: 'BanknotesIcon' },
            { label: 'Items Sold Today', value: String(stats.todayItems), icon: 'CubeIcon' },
            { label: 'Average Bill', value: formatCurrency(stats.averageBill), icon: 'ChartBarIcon' },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-black text-slate-900">{loading ? '—' : card.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={20} />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">Returns Desk</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">Handle product returns without breaking stock accuracy</h2>
                <p className="mt-2 text-sm text-slate-600">Search by bill number or customer mobile, choose quantities, and add returned items back to stock instantly.</p>
              </div>
              <a
                href="/billing-counter/returns"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
              >
                <Icon name="ArrowPathIcon" size={18} />
                Open Returns
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Return summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Today's returns</span>
                <span className="text-sm font-semibold text-slate-900">{returnSummary.todayReturns}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Refund value</span>
                <span className="text-sm font-semibold text-rose-700">{formatCurrency(returnSummary.todayRefundAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Items received back</span>
                <span className="text-sm font-semibold text-slate-900">{returnSummary.todayReturnedItems}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Bills</h2>
                <p className="text-sm text-slate-500">Your latest checkout activity</p>
              </div>
              <button
                type="button"
                onClick={() => void fetchBills()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Icon name="ArrowPathIcon" size={16} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/80 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Bill</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Items</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!loading && recentBills.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No bills created yet. Start your first checkout from the billing page.
                      </td>
                    </tr>
                  ) : (
                    recentBills.map(bill => (
                      <tr key={bill._id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{bill.billNumber}</p>
                            <p className="text-xs text-slate-500">Included GST {formatCurrency(bill.gstAmount)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{bill.customerName || bill.customerPhone || 'Walk-in Customer'}</td>
                        <td className="px-5 py-4 text-slate-700">{bill.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(bill.total)}</td>
                        <td className="px-5 py-4 text-slate-500">{new Date(bill.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Today at a glance</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Assigned Shop</span>
                  <span className="text-sm font-semibold text-slate-900">{user?.shopName ?? 'Not assigned'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Handled by</span>
                  <span className="text-sm font-semibold text-slate-900">{user?.name ?? 'Billing Counter'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Refresh Status</span>
                  <span className="text-sm font-semibold text-emerald-600">{loading ? 'Syncing…' : 'Up to date'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
                  <Icon name="LightBulbIcon" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Counter tips</h2>
                  <p className="text-sm text-slate-600">Keep the checkout line moving smoothly.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>Use barcode scanning for faster product lookup.</p>
                <p>Double-check quantities before generating the bill.</p>
                <p>Capture customer details when they need repeat invoices.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </BillingCounterLayout>
  );
}
