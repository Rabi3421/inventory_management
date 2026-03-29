'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BillItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  balanceAfter: number;
}

interface Bill {
  _id: string;
  billNumber: string;
  shopId: string;
  items: BillItem[];
  subtotal: number;
  total: number;
  customerName: string;
  customerPhone: string;
  performedBy: string;
  note: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(amount);
}

function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Print a standalone receipt HTML in a new window ────────────────────────────

function openReceiptWindow(bill: Bill, shopName: string) {
  const itemRows = bill.items.map((item, i) => `
    <tr class="${i % 2 === 0 ? '' : 'row-odd'}">
      <td class="item-name">
        <span class="name">${item.name}</span>
        <span class="sku">${item.sku}</span>
      </td>
      <td class="center">${item.qty}</td>
      <td class="right">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="right total-cell">₹${item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('');

  const totalItems = bill.items.reduce((s, i) => s + i.qty, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt — ${bill.billNumber}</title>
  <style>
    @page { size: A5 portrait; margin: 0; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #ffffff; display: flex; justify-content: center; padding: 0; min-height: 100vh; }
    .receipt { background: #fff; width: 100%; max-width: 100%; border-radius: 0; overflow: hidden; box-shadow: none; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #fff; text-align: center; padding: 28px 12px 20px; }
    .header .shop-name { font-size: 22px; font-weight: 800; }
    .header .sub { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .meta { display: flex; justify-content: space-between; padding: 18px 12px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; }
    .meta-block .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-block .value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; font-family: monospace; }
    .meta-block .value-sm { font-size: 12px; color: #475569; margin-top: 1px; }
    .meta-block.right { text-align: right; }
    .served-by { padding: 10px 12px; font-size: 12px; color: #64748b; border-bottom: 1px solid #f1f5f9; }
    .served-by span { font-weight: 600; color: #334155; }
    .customer-block { padding: 10px 12px; background: #f0fdf4; border-bottom: 1px solid #dcfce7; }
    .customer-row { display: flex; justify-content: space-between; align-items: center; }
    .customer-label { font-size: 11px; color: #16a34a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .customer-value { font-size: 13px; font-weight: 600; color: #15803d; }
    .items { padding: 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { border-bottom: 2px solid #e2e8f0; }
    thead th { padding: 12px 0 10px; color: #94a3b8; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    th.center, td.center { text-align: center; width: 44px; }
    th.right, td.right { text-align: right; }
    th:first-child, td.item-name { text-align: left; padding-right: 12px; }
    td { padding: 10px 0; vertical-align: top; }
    .row-odd td { background: #f8fafc; }
    .row-odd td:first-child { border-radius: 6px 0 0 6px; padding-left: 6px; }
    .row-odd td:last-child { border-radius: 0 6px 6px 0; padding-right: 6px; }
    td.item-name .name { display: block; font-weight: 600; color: #1e293b; }
    td.item-name .sku  { display: block; font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 1px; }
    .total-cell { font-weight: 700; color: #0f172a; }
    .totals { padding: 16px 12px 20px; border-top: 1px dashed #e2e8f0; margin-top: 4px; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 3px 0; }
    .total-final { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; }
    .total-final .label { font-size: 16px; font-weight: 800; color: #0f172a; }
    .total-final .amount { font-size: 20px; font-weight: 800; color: #059669; }
    .note { margin: 0 12px 16px; padding: 10px 12px; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; font-size: 12px; color: #713f12; }
    .footer { background: #f8fafc; border-top: 1px dashed #e2e8f0; text-align: center; padding: 14px 12px; font-size: 11px; color: #94a3b8; line-height: 1.7; }
    .footer .thank-you { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 4px; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
      .row-odd td { background: transparent; }
    }
  </style>
</head>
<body>
  <div>
    <div class="receipt">
      <div class="header">
        <div class="shop-name">${shopName}</div>
        <div class="sub">Tax Invoice / Receipt</div>
      </div>
      <div class="meta">
        <div class="meta-block">
          <div class="label">Bill No.</div>
          <div class="value">${bill.billNumber}</div>
        </div>
        <div class="meta-block right">
          <div class="label">Date &amp; Time</div>
          <div class="value-sm">${dateStr(bill.createdAt)}</div>
          <div class="value-sm">${timeStr(bill.createdAt)}</div>
        </div>
      </div>
      <div class="served-by">Served by: <span>${bill.performedBy}</span></div>
      ${bill.customerPhone ? `
      <div class="customer-block">
        <div class="customer-row">
          <span class="customer-label">Customer</span>
          <span class="customer-value">${bill.customerName ? bill.customerName + ' &middot; ' : ''}+91 ${bill.customerPhone}</span>
        </div>
      </div>` : ''}
      <div class="items">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="center">Qty</th>
              <th class="right">Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>${fmt(bill.subtotal)}</span></div>
        <div class="total-row"><span>Tax (0%)</span><span>—</span></div>
        <div class="total-final">
          <span class="label">Total</span>
          <span class="amount">${fmt(bill.total)}</span>
        </div>
      </div>
      ${bill.note ? `<div class="note"><strong>Note:</strong> ${bill.note}</div>` : ''}
      <div class="footer">
        <div class="thank-you">Thank you for shopping at ${shopName}! 🙏</div>
        ${totalItems} item${totalItems !== 1 ? 's' : ''} &nbsp;·&nbsp; Bill #${bill.billNumber}
      </div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
  document.body.appendChild(iframe);
  const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (iDoc) {
    iDoc.open();
    iDoc.write(html);
    iDoc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 600);
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [10, 20, 50];

export default function BillsPage() {
  const { user } = useAuth();
  const shopId   = user?.shopId   ?? '';
  const shopName = user?.shopName ?? 'My Shop';

  const [bills, setBills]           = useState<Bill[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [limit, setLimit]           = useState(20);
  const [page, setPage]             = useState(1);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBills = useCallback(async (p: number, q: string, from: string, to: string, lim: number) => {
    if (!shopId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        shopId, page: String(p), limit: String(lim),
        ...(q    ? { search: q }       : {}),
        ...(from ? { dateFrom: from }  : {}),
        ...(to   ? { dateTo: to }      : {}),
      });
      const res = await fetch(`/api/bills?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setBills(data.bills);
        setPagination(data.pagination);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [shopId]);

  // Initial load + re-fetch on filter change
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchBills(page, search, dateFrom, dateTo, limit);
    }, search ? 350 : 0);
  }, [page, search, dateFrom, dateTo, limit, fetchBills]);

  // Reset to page 1 when filters change
  function applySearch(val: string) { setSearch(val); setPage(1); }
  function applyDateFrom(val: string) { setDateFrom(val); setPage(1); }
  function applyDateTo(val: string) { setDateTo(val); setPage(1); }
  function applyLimit(val: number) { setLimit(val); setPage(1); }

  const totalRevenue = bills.reduce((s, b) => s + b.total, 0);

  // ── Summary cards ────────────────────────────────────────────────────────────

  const summaryCards = [
    {
      label: 'Total Bills',
      value: pagination.total.toLocaleString('en-IN'),
      icon: 'DocumentTextIcon',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Revenue (this view)',
      value: fmt(totalRevenue),
      icon: 'BanknotesIcon',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Avg Bill Value',
      value: bills.length ? fmt(totalRevenue / bills.length) : '₹0',
      icon: 'ChartBarIcon',
      color: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <ShopAdminLayout activeRoute="/shop-admin/bills">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Bills History</h1>
          <p className="text-sm text-slate-500 mt-0.5">All past bills and receipts for {shopName}</p>
        </div>
        <a
          href="/shop-admin/billing"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          <Icon name="PlusIcon" className="w-4 h-4" />
          New Bill
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color} shrink-0`}>
              <Icon name={c.icon} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-lg font-bold text-slate-800">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1">
            <Icon name="MagnifyingGlassIcon" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill no., customer, product…"
              value={search}
              onChange={e => applySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="date"
              value={dateFrom}
              onChange={e => applyDateFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
            <span className="text-slate-400 text-xs shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => applyDateTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>
          {/* Clear filters */}
          {(search || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all shrink-0"
            >
              <Icon name="XMarkIcon" className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Bill No.', 'Date', 'Customer', 'Items', 'Total', 'Served By', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-32 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-28 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-10 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Icon name="DocumentTextIcon" className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No bills found</p>
                      <p className="text-slate-400 text-xs">
                        {search || dateFrom || dateTo ? 'Try adjusting your filters.' : 'Start billing to see records here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : bills.map(bill => (
                <tr
                  key={bill._id}
                  onClick={() => setSelectedBill(bill)}
                  className="border-b border-slate-50 hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {bill.billNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-700 font-medium text-xs">{dateStr(bill.createdAt)}</div>
                    <div className="text-slate-400 text-[11px]">{timeStr(bill.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {bill.customerName || bill.customerPhone ? (
                      <div>
                        {bill.customerName && (
                          <div className="text-slate-700 font-medium text-xs">{bill.customerName}</div>
                        )}
                        {bill.customerPhone && (
                          <div className="text-slate-400 text-[11px] font-mono">+91 {bill.customerPhone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 font-medium">{bill.items.reduce((s, i) => s + i.qty, 0)}</span>
                    <span className="text-slate-400 text-xs ml-1">
                      ({bill.items.length} SKU{bill.items.length !== 1 ? 's' : ''})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-800">{fmt(bill.total)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{bill.performedBy}</td>
                  <td className="px-4 py-3 pr-5">
                    <button
                      onClick={e => { e.stopPropagation(); openReceiptWindow(bill, shopName); }}
                      title="Print / Download receipt"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Icon name="PrinterIcon" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                Showing <span className="font-semibold text-slate-700">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)}
                </span> of <span className="font-semibold text-slate-700">{pagination.total}</span>
              </span>
              <div className="flex items-center gap-1">
                <span>Rows:</span>
                <select
                  value={limit}
                  onChange={e => applyLimit(Number(e.target.value))}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none"
                >
                  {LIMIT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Icon name="ChevronLeftIcon" className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.min(Math.max(page - 2, 1) + i, pagination.pages);
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg border text-xs font-medium transition-all ${
                      p === page
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Icon name="ChevronRightIcon" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bill Detail Modal ─────────────────────────────────────────────────── */}
      {selectedBill && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-800">{selectedBill.billNumber}</p>
                <p className="text-xs text-slate-400 mt-0.5">{dateStr(selectedBill.createdAt)} · {timeStr(selectedBill.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openReceiptWindow(selectedBill, shopName)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Icon name="PrinterIcon" className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Icon name="XMarkIcon" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Customer + server */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Customer</p>
                  {selectedBill.customerName && (
                    <p className="text-sm font-semibold text-slate-800">{selectedBill.customerName}</p>
                  )}
                  {selectedBill.customerPhone && (
                    <p className="text-xs text-slate-600 font-mono">+91 {selectedBill.customerPhone}</p>
                  )}
                  {!selectedBill.customerName && !selectedBill.customerPhone && (
                    <p className="text-xs text-slate-400">No customer info</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Served by</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedBill.performedBy}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {selectedBill.items.map((item, i) => (
                    <div key={i} className={`flex items-start justify-between gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-800">{fmt(item.lineTotal)}</p>
                        <p className="text-xs text-slate-400">{item.qty} × {fmt(item.unitPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{fmt(selectedBill.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>—</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-emerald-700">{fmt(selectedBill.total)}</span>
                </div>
              </div>

              {/* Note */}
              {selectedBill.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <span className="font-semibold">Note: </span>{selectedBill.note}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ShopAdminLayout>
  );
}
