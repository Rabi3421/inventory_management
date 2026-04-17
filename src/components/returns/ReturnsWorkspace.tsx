'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface ReturnsLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

interface ReturnsWorkspaceProps {
  layout: React.ComponentType<ReturnsLayoutProps>;
  activeRoute: string;
  title: string;
  subtitle: string;
}

interface SearchBill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

interface ReturnHistoryItem {
  _id: string;
  returnNumber: string;
  billId: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  note: string;
  performedBy: string;
  subtotal: number;
  gstAmount: number;
  totalRefund: number;
  createdAt: string;
  items: Array<{
    productId: string;
    sku: string;
    hsnCode?: string;
    name: string;
    qty: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    lineTotal: number;
  }>;
}

interface ReturnSummary {
  totalReturns: number;
  totalRefundAmount: number;
  totalReturnedItems: number;
  todayReturns: number;
  todayRefundAmount: number;
  todayReturnedItems: number;
}

interface ReturnableBillItem {
  productId: string;
  sku: string;
  hsnCode?: string;
  name: string;
  qty: number;
  returnedQty: number;
  remainingQty: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
}

interface ReturnableBill {
  _id: string;
  billNumber: string;
  shopId: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  customerName: string;
  customerPhone: string;
  note: string;
  performedBy: string;
  createdAt: string;
  items: ReturnableBillItem[];
}

interface ReturnsResponse {
  returns: ReturnHistoryItem[];
  matchingBills: SearchBill[];
  summary: ReturnSummary;
}

interface BillDetailResponse {
  bill: ReturnableBill;
  returnHistory: ReturnHistoryItem[];
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(value: string, withTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / (1000 * 60)));
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openReturnReceiptWindow(entry: ReturnHistoryItem, shopName: string) {
  if (typeof window === 'undefined') return;

  const totalItems = entry.items.reduce((sum, item) => sum + item.qty, 0);
  const itemRows = entry.items.map((item, index) => `
      <tr>
        <td class="l idx">${index + 1}</td>
        <td class="l">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-sku">${escapeHtml(item.sku)}${item.hsnCode ? ` · HSN ${escapeHtml(item.hsnCode)}` : ''}</div>
          <div class="item-meta">${item.gstAmount > 0 ? `${item.gstRate}% GST incl. ${fmtMoney(item.gstAmount)}` : 'No GST recorded'}</div>
        </td>
        <td class="c">${item.qty}</td>
        <td class="r">${fmtMoney(item.unitPrice)}</td>
        <td class="r">${fmtMoney(item.lineTotal)}</td>
      </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Return-${escapeHtml(entry.returnNumber)}</title>
  <style>
    @page { size: A5 portrait; margin: 12mm 10mm; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #0f172a; font-size: 12px; line-height: 1.5; }
    .header { display:flex; align-items:center; gap:14px; padding-bottom:14px; border-bottom:2px solid #e11d48; margin-bottom:14px; }
    .logo { width:56px; height:56px; border-radius:10px; object-fit:contain; flex-shrink:0; }
    .header-text { flex:1; }
    .shop-name { font-size:20px; font-weight:900; color:#881337; letter-spacing:-0.4px; }
    .shop-sub { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:1.2px; margin-top:2px; }
    .header-right { text-align:right; }
    .inv-label { font-size:9px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.8px; }
    .inv-number { font-size:13px; font-weight:800; color:#9f1239; font-family:monospace; margin-top:2px; }
    .inv-badge { display:inline-block; margin-top:5px; padding:2px 8px; background:#ffe4e6; color:#9f1239; font-size:9px; font-weight:700; border-radius:20px; text-transform:uppercase; letter-spacing:0.6px; }
    .meta-line { display:flex; justify-content:space-between; gap:12px; font-size:10px; color:#94a3b8; padding-bottom:10px; border-bottom:1px solid #e2e8f0; margin-bottom:12px; }
    .cust-line, .reason-line { font-size:10px; color:#94a3b8; margin-bottom:10px; }
    .cust-line .cv, .reason-line .cv { font-weight:700; color:#334155; }
    .cust-line .cp { font-family:monospace; color:#64748b; margin-left:6px; }
    table { width:100%; border-collapse:collapse; margin-bottom:0; }
    thead tr { background:#f8fafc; }
    thead th { padding:7px 8px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:#64748b; }
    thead th:first-child { border-radius:6px 0 0 6px; padding-left:10px; }
    thead th:last-child { border-radius:0 6px 6px 0; padding-right:10px; }
    th.c, td.c { text-align:center; }
    th.r, td.r { text-align:right; }
    th.l, td.l { text-align:left; }
    td { padding:8px 8px; font-size:11px; border-bottom:1px solid #f1f5f9; vertical-align:top; color:#334155; }
    td:first-child { padding-left:10px; }
    td:last-child { padding-right:10px; font-weight:700; color:#0f172a; }
    .idx { color:#94a3b8; font-size:10px; }
    .item-name { font-weight:600; color:#0f172a; }
    .item-sku { font-size:9px; color:#94a3b8; font-family:monospace; margin-top:1px; }
    .item-meta { font-size:9px; color:#64748b; margin-top:2px; }
    .summary { display:flex; justify-content:flex-end; margin-top:12px; }
    .summary-box { width:220px; }
    .row { display:flex; justify-content:space-between; padding:4px 0; font-size:11px; color:#475569; border-bottom:1px dashed #e2e8f0; }
    .row:last-child { border-bottom:none; }
    .grand { margin-top:6px; padding-top:8px; border-top:2px solid #e2e8f0; font-size:14px; font-weight:800; color:#9f1239; }
    .foot { margin-top:18px; padding-top:10px; border-top:1px dashed #cbd5e1; text-align:center; font-size:10px; color:#64748b; }
    .note { margin-top:10px; font-size:10px; color:#475569; background:#fff1f2; border:1px solid #ffe4e6; border-radius:10px; padding:8px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="/assets/images/srs1.png" alt="SRS" />
    <div class="header-text">
      <div class="shop-name">${escapeHtml(shopName || 'Shop Return Receipt')}</div>
      <div class="shop-sub">Product Return Receipt</div>
    </div>
    <div class="header-right">
      <div class="inv-label">Return No.</div>
      <div class="inv-number">${escapeHtml(entry.returnNumber)}</div>
      <div class="inv-badge">Refund</div>
    </div>
  </div>

  <div class="meta-line">
    <span>Return Date: ${escapeHtml(fmtDate(entry.createdAt, true))}</span>
    <span>Original Bill: ${escapeHtml(entry.billNumber)}</span>
    <span>Processed By: ${escapeHtml(entry.performedBy)}</span>
  </div>

  ${(entry.customerName || entry.customerPhone) ? `<div class="cust-line"><span class="cv">Customer:</span> ${escapeHtml(entry.customerName || 'Saved by phone only')}${entry.customerPhone ? `<span class="cp">+91 ${escapeHtml(entry.customerPhone)}</span>` : ''}</div>` : ''}
  <div class="reason-line"><span class="cv">Reason:</span> ${escapeHtml(entry.reason)}</div>

  <table>
    <thead>
      <tr>
        <th class="l">#</th>
        <th class="l">Product</th>
        <th class="c">Qty</th>
        <th class="r">Rate</th>
        <th class="r">Refund</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="row"><span>Returned Items</span><span>${totalItems}</span></div>
      <div class="row"><span>Refund Before GST</span><span>${fmtMoney(entry.subtotal)}</span></div>
      <div class="row"><span>Included GST</span><span>${fmtMoney(entry.gstAmount)}</span></div>
      <div class="row grand"><span>Total Refund</span><span>${fmtMoney(entry.totalRefund)}</span></div>
    </div>
  </div>

  ${entry.note ? `<div class="note"><strong>Note:</strong> ${escapeHtml(entry.note)}</div>` : ''}

  <div class="foot">
    Returned goods have been added back to stock. Please keep this slip for refund tracking.
  </div>

  <script>
    window.onload = () => {
      window.print();
      window.onafterprint = () => window.close();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function ReturnsWorkspace({
  layout: Layout,
  activeRoute,
  title,
  subtitle,
}: ReturnsWorkspaceProps) {
  const { user } = useAuth();
  const shopId = user?.shopId ?? '';
  const shopName = user?.shopName ?? 'My Shop';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [billLoading, setBillLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [recentReturns, setRecentReturns] = useState<ReturnHistoryItem[]>([]);
  const [matchingBills, setMatchingBills] = useState<SearchBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<ReturnableBill | null>(null);
  const [selectedBillReturns, setSelectedBillReturns] = useState<ReturnHistoryItem[]>([]);
  const [returnReason, setReturnReason] = useState('Damaged / defective');
  const [returnNote, setReturnNote] = useState('');
  const [returnQtyByProduct, setReturnQtyByProduct] = useState<Record<string, string>>({});
  const [lastCreatedReturn, setLastCreatedReturn] = useState<ReturnHistoryItem | null>(null);

  const fetchReturnsHome = useCallback(async (search = '') => {
    if (!shopId) return;
    if (search) setSearchLoading(true);
    else setReturnsLoading(true);
    setLoadError('');

    try {
      const params = new URLSearchParams({ shopId, limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (user?.role === 'billingcounter' && user?.id) {
        params.set('performedByUserId', user.id);
      }
      const res = await fetch(`/api/returns?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load returns');
      const data = (await res.json()) as ReturnsResponse;
      setSummary(data.summary);
      setRecentReturns(data.returns ?? []);
      setMatchingBills(data.matchingBills ?? []);
    } catch {
      setLoadError('Failed to load return data. Please try again.');
    } finally {
      setReturnsLoading(false);
      setSearchLoading(false);
    }
  }, [shopId, user?.id, user?.role]);

  const fetchBillDetail = useCallback(async (billId: string) => {
    if (!shopId || !billId) return;
    setBillLoading(true);
    setLoadError('');
    setSubmitSuccess('');
    setLastCreatedReturn(null);
    try {
      const res = await fetch(`/api/returns/bill/${billId}?shopId=${encodeURIComponent(shopId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch bill');
      const data = (await res.json()) as BillDetailResponse;
      setSelectedBill(data.bill);
      setSelectedBillReturns(data.returnHistory ?? []);
      setReturnQtyByProduct({});
    } catch {
      setLoadError('Failed to load selected bill details. Please try again.');
    } finally {
      setBillLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void fetchReturnsHome();
  }, [fetchReturnsHome]);

  const handleSearch = useCallback(() => {
    void fetchReturnsHome(searchQuery);
  }, [fetchReturnsHome, searchQuery]);

  const returnableItems = useMemo(() => selectedBill?.items.filter(item => item.remainingQty > 0) ?? [], [selectedBill]);
  const selectedReturnItems = useMemo(() => {
    return returnableItems
      .map(item => ({ item, qty: Number(returnQtyByProduct[item.productId] ?? 0) }))
      .filter(entry => Number.isFinite(entry.qty) && entry.qty > 0);
  }, [returnQtyByProduct, returnableItems]);

  const totalRefund = useMemo(() => {
    return selectedReturnItems.reduce((sum, entry) => sum + entry.item.unitPrice * entry.qty, 0);
  }, [selectedReturnItems]);

  async function handleSubmitReturn() {
    if (!selectedBill) return;
    if (!returnReason.trim()) {
      setSubmitError('Select or enter a return reason.');
      return;
    }
    if (selectedReturnItems.length === 0) {
      setSubmitError('Enter at least one return quantity.');
      return;
    }

    const invalidItem = selectedReturnItems.find(entry => entry.qty > entry.item.remainingQty);
    if (invalidItem) {
      setSubmitError(`Only ${invalidItem.item.remainingQty} unit(s) of ${invalidItem.item.name} can be returned.`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    setLastCreatedReturn(null);

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shopId,
          billId: selectedBill._id,
          items: selectedReturnItems.map(entry => ({ productId: entry.item.productId, qty: entry.qty })),
          reason: returnReason.trim(),
          note: returnNote.trim(),
          performedBy: user?.name ?? user?.email ?? 'shop-admin',
          performedByUserId: user?.id ?? '',
          performedByRole: user?.role ?? '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to process return.');
        return;
      }

      setLastCreatedReturn(data.returnRecord as ReturnHistoryItem);
      setSubmitSuccess(`Return ${data.returnRecord?.returnNumber ?? ''} saved successfully.`.trim());
      setReturnNote('');
      setReturnQtyByProduct({});
      await Promise.all([
        fetchReturnsHome(searchQuery),
        fetchBillDetail(selectedBill._id),
      ]);
    } catch {
      setSubmitError('Failed to process return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const summaryCards = [
    {
      label: "Today's Returns",
      value: returnsLoading ? '—' : String(summary?.todayReturns ?? 0),
      helper: `${summary?.todayReturnedItems ?? 0} item(s) received back`,
      icon: 'ArrowPathIcon',
      color: 'bg-orange-50 text-orange-600',
      border: 'border-orange-100',
    },
    {
      label: 'Today Refund Value',
      value: returnsLoading ? '—' : fmtMoney(summary?.todayRefundAmount ?? 0),
      helper: 'Value to settle with customers',
      icon: 'BanknotesIcon',
      color: 'bg-rose-50 text-rose-600',
      border: 'border-rose-100',
    },
    {
      label: 'Total Returns',
      value: returnsLoading ? '—' : String(summary?.totalReturns ?? 0),
      helper: `${summary?.totalReturnedItems ?? 0} item(s) returned overall`,
      icon: 'DocumentTextIcon',
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
    },
    {
      label: 'Total Refund Value',
      value: returnsLoading ? '—' : fmtMoney(summary?.totalRefundAmount ?? 0),
      helper: 'Tracked in current return history',
      icon: 'ChartBarIcon',
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
  ];

  return (
    <Layout activeRoute={activeRoute}>
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Product Returns</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p>
            </div>
            <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSearch();
                }}
                placeholder="Search by bill number, mobile, or customer name"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Icon name="MagnifyingGlassIcon" size={16} />
                {searchLoading ? 'Searching…' : 'Search Bills'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  void fetchReturnsHome('');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {(loadError || submitError || submitSuccess) && (
          <div className="space-y-3">
            {loadError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <Icon name="ExclamationTriangleIcon" size={16} className="shrink-0" />
                {loadError}
              </div>
            )}
            {submitError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <Icon name="ExclamationTriangleIcon" size={16} className="shrink-0" />
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="shrink-0" />
                  {submitSuccess}
                </div>
                {lastCreatedReturn && (
                  <button
                    type="button"
                    onClick={() => openReturnReceiptWindow(lastCreatedReturn, shopName)}
                    className="ml-auto inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <Icon name="PrinterIcon" size={14} />
                    Print Receipt
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(card => (
            <div key={card.label} className={`rounded-2xl border ${card.border} bg-white p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-black text-slate-900">{card.value}</p>
                  <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.color}`}>
                  <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Matching Bills</h2>
                  <p className="text-sm text-slate-500">Search a bill first, then select which items to take back.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchReturnsHome(searchQuery)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="ArrowPathIcon" size={16} />
                  Refresh
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {searchLoading ? (
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : matchingBills.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    Search by bill number or mobile number to load returnable bills.
                  </div>
                ) : (
                  matchingBills.map(bill => (
                    <button
                      type="button"
                      key={bill._id}
                      onClick={() => void fetchBillDetail(bill._id)}
                      className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${selectedBill?._id === bill._id ? 'bg-indigo-50/60' : ''}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{bill.billNumber}</p>
                        <p className="mt-1 text-sm text-slate-600">{bill.customerName || bill.customerPhone || 'Walk-in customer'}</p>
                        <p className="mt-1 text-xs text-slate-400">{fmtDate(bill.createdAt, true)} • {bill.itemCount} item(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{fmtMoney(bill.total)}</p>
                        <p className="mt-1 text-xs text-slate-400">Open bill</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Return Entry</h2>
                <p className="text-sm text-slate-500">Select quantities carefully. Stock is added back immediately after saving.</p>
              </div>

              {billLoading ? (
                <div className="space-y-3 p-5">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !selectedBill ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">No bill selected yet.</div>
              ) : (
                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill</p>
                      <p className="mt-2 text-base font-bold text-slate-900">{selectedBill.billNumber}</p>
                      <p className="mt-1 text-xs text-slate-500">{fmtDate(selectedBill.createdAt, true)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                      <p className="mt-2 text-base font-bold text-slate-900">{selectedBill.customerName || 'Saved by phone only'}</p>
                      <p className="mt-1 font-mono text-sm text-slate-500">{selectedBill.customerPhone ? `+91 ${selectedBill.customerPhone}` : 'No phone on bill'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill Total</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(selectedBill.total)}</p>
                      <p className="mt-1 text-xs text-slate-500">Original sale value</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Refund</p>
                      <p className="mt-2 text-2xl font-bold text-rose-700">{fmtMoney(totalRefund)}</p>
                      <p className="mt-1 text-xs text-slate-500">Based on selected quantities</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Product</th>
                          <th className="px-4 py-3 font-semibold text-right">Sold</th>
                          <th className="px-4 py-3 font-semibold text-right">Returned</th>
                          <th className="px-4 py-3 font-semibold text-right">Remaining</th>
                          <th className="px-4 py-3 font-semibold text-right">Price</th>
                          <th className="px-4 py-3 font-semibold text-right">Return Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedBill.items.map(item => (
                          <tr key={item.productId} className={item.remainingQty <= 0 ? 'bg-slate-50' : ''}>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{item.name}</div>
                              <div className="font-mono text-xs text-slate-400">{item.sku}{item.hsnCode ? ` • HSN ${item.hsnCode}` : ''}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{item.qty}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{item.returnedQty}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${item.remainingQty > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{item.remainingQty}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={item.remainingQty}
                                disabled={item.remainingQty <= 0}
                                value={returnQtyByProduct[item.productId] ?? ''}
                                onChange={event => {
                                  const next = event.target.value;
                                  if (next === '') {
                                    setReturnQtyByProduct(prev => {
                                      const updated = { ...prev };
                                      delete updated[item.productId];
                                      return updated;
                                    });
                                    return;
                                  }
                                  const numeric = Math.max(0, Math.min(item.remainingQty, Number(next)));
                                  setReturnQtyByProduct(prev => ({ ...prev, [item.productId]: String(numeric) }));
                                }}
                                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label className="block text-sm font-semibold text-slate-700">Return Reason</label>
                      <select
                        value={returnReason}
                        onChange={event => setReturnReason(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option>Damaged / defective</option>
                        <option>Wrong product billed</option>
                        <option>Expired product</option>
                        <option>Customer changed mind</option>
                        <option>Size / variant mismatch</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label className="block text-sm font-semibold text-slate-700">Return Note</label>
                      <textarea
                        value={returnNote}
                        onChange={event => setReturnNote(event.target.value)}
                        rows={3}
                        placeholder="Optional note for staff or customer context"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Refund to customer</p>
                      <p className="text-xs text-slate-500">Selected items: {selectedReturnItems.reduce((sum, entry) => sum + entry.qty, 0)} unit(s)</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xl font-black text-rose-700">{fmtMoney(totalRefund)}</p>
                      <button
                        type="button"
                        onClick={handleSubmitReturn}
                        disabled={submitting || selectedReturnItems.length === 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="ArrowPathIcon" size={16} className={submitting ? 'animate-spin' : ''} />
                        {submitting ? 'Saving Return…' : 'Process Return'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Selected Bill Return History</h2>
                <p className="text-sm text-slate-500">Earlier returns already processed on this bill</p>
              </div>
              <div className="divide-y divide-slate-100">
                {billLoading ? (
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : selectedBillReturns.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">No returns recorded for the selected bill yet.</div>
                ) : (
                  selectedBillReturns.map(entry => (
                    <div key={entry._id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.returnNumber}</p>
                          <p className="mt-1 text-sm text-slate-600">{entry.reason}</p>
                          <p className="mt-1 text-xs text-slate-400">{fmtDate(entry.createdAt, true)} • by {entry.performedBy}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-rose-700">{fmtMoney(entry.totalRefund)}</p>
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <p className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</p>
                            <button
                              type="button"
                              onClick={() => openReturnReceiptWindow(entry, shopName)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Icon name="PrinterIcon" size={12} />
                              Print
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Recent Returns</h2>
                <p className="text-sm text-slate-500">Latest return transactions recorded for this workspace</p>
              </div>
              <div className="divide-y divide-slate-100">
                {returnsLoading ? (
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : recentReturns.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">No returns recorded yet.</div>
                ) : (
                  recentReturns.map(entry => (
                    <div key={entry._id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.returnNumber}</p>
                          <p className="mt-1 text-sm text-slate-600">Bill {entry.billNumber} • {entry.customerName || entry.customerPhone || 'Walk-in customer'}</p>
                          <p className="mt-1 text-xs text-slate-400">{entry.items.reduce((sum, item) => sum + item.qty, 0)} item(s) • {entry.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-rose-700">{fmtMoney(entry.totalRefund)}</p>
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <p className="text-xs text-slate-400">{fmtDate(entry.createdAt, true)}</p>
                            <button
                              type="button"
                              onClick={() => openReturnReceiptWindow(entry, shopName)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Icon name="PrinterIcon" size={12} />
                              Print
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
