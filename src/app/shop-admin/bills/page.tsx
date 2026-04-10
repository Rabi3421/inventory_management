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
  gstRate: number;
  gstAmount: number;
  total: number;
  customerName: string;
  customerPhone: string;
  performedBy: string;
  note: string;
  createdAt: string;
}

interface GstSummaryRow {
  period: string;       // 'YYYY-MM-DD' or 'YYYY-MM'
  gstCollected: number;
  revenue: number;
  subtotal: number;
  billCount: number;
}

interface GstSummaryTotals {
  gstCollected: number;
  revenue: number;
  subtotal: number;
  billCount: number;
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
      <tr>
        <td class="l" style="color:#94a3b8;font-size:10px">${i + 1}</td>
        <td class="l">
          <div class="item-name">${item.name}</div>
          <div class="item-sku">${item.sku}</div>
        </td>
        <td class="c">${item.qty}</td>
        <td class="r">${fmt(item.unitPrice)}</td>
        <td class="r">${fmt(item.lineTotal)}</td>
      </tr>`).join('');

  const totalItems = bill.items.reduce((s, i) => s + i.qty, 0);
  const pdfTitle = `Receipt-${bill.billNumber}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pdfTitle}</title>
  <style>
    @page { size: A5 portrait; margin: 12mm 10mm; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #0f172a; font-size: 12px; line-height: 1.5; }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 2px solid #059669;
      margin-bottom: 14px;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 10px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-text { flex: 1; }
    .shop-name   { font-size: 20px; font-weight: 900; color: #064e3b; letter-spacing: -0.4px; }
    .shop-sub    { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 2px; }
    .header-right { text-align: right; flex-shrink: 0; }
    .inv-label   { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; }
    .inv-number  { font-size: 13px; font-weight: 800; color: #065f46; font-family: monospace; margin-top: 2px; }
    .inv-badge   {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 8px;
      background: #d1fae5;
      color: #065f46;
      font-size: 9px;
      font-weight: 700;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    /* ── Meta line ── */
    .meta-line {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
      padding-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 12px;
    }

    /* ── Customer line ── */
    .cust-line {
      font-size: 10px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .cust-line .cv { font-weight: 700; color: #334155; }
    .cust-line .cp { font-family: monospace; color: #64748b; margin-left: 6px; }

    /* ── Items table ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    thead tr { background: #f1f5f9; }
    thead th {
      padding: 7px 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #64748b;
    }
    thead th:first-child { border-radius: 6px 0 0 6px; padding-left: 10px; text-align: left; }
    thead th:last-child  { border-radius: 0 6px 6px 0; padding-right: 10px; }
    th.c { text-align: center; width: 36px; }
    th.r, td.r { text-align: right; }
    th.l, td.l { text-align: left; }
    td {
      padding: 8px 8px;
      font-size: 11px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      color: #334155;
    }
    td:first-child { padding-left: 10px; }
    td:last-child  { padding-right: 10px; font-weight: 700; color: #0f172a; }
    .item-name { font-weight: 600; color: #0f172a; }
    .item-sku  { font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 1px; }
    td.c { text-align: center; }
    tbody tr:last-child td { border-bottom: none; }

    /* ── Totals ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals-box { width: 200px; }
    .t-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
      color: #475569;
      border-bottom: 1px dashed #e2e8f0;
    }
    .t-row:last-child { border-bottom: none; }
    .t-gst {
      display: flex;
      justify-content: space-between;
      padding: 3px 6px;
      font-size: 11px;
      color: #92400e;
      background: #fef3c7;
      border-radius: 4px;
      margin: 3px 0;
    }
    .t-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 2px solid #0f172a;
    }
    .t-total .lbl { font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .t-total .amt { font-size: 18px; font-weight: 900; color: #059669; }

    /* ── Note ── */
    .note {
      margin-top: 14px;
      padding: 8px 10px;
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 6px;
      font-size: 10px;
      color: #78350f;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-left  { font-size: 9px; color: #94a3b8; }
    .footer-right { font-size: 10px; font-weight: 700; color: #475569; }
    .footer-tagline { font-size: 8px; color: #cbd5e1; margin-top: 2px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <img src="${window.location.origin}/assets/images/srs1.png" alt="Logo" class="logo" />
    <div class="header-text">
      <div class="shop-name">${shopName}</div>
      <div class="shop-sub">Cutlery &amp; Kitchenware</div>
    </div>
    <div class="header-right">
      <div class="inv-label">Invoice No.</div>
      <div class="inv-number">${bill.billNumber}</div>
      <div class="inv-badge">Tax Invoice</div>
    </div>
  </div>

  <!-- Meta line -->
  <div class="meta-line">
    <span>${dateStr(bill.createdAt)} &nbsp;&middot;&nbsp; ${timeStr(bill.createdAt)}</span>
    <span>Served by: <strong style="color:#475569">${bill.performedBy}</strong></span>
  </div>

  ${ bill.customerPhone ? `
  <!-- Customer line -->
  <div class="cust-line">
    Bill to: <span class="cv">${bill.customerName || 'Walk-in Customer'}</span>
    <span class="cp">+91&nbsp;${bill.customerPhone}</span>
  </div>` : ''}

  <!-- Items table -->
  <table>
    <thead>
      <tr>
        <th class="l" style="width:24px">#</th>
        <th class="l">Description</th>
        <th class="c">Qty</th>
        <th class="r">Unit Price</th>
        <th class="r">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="t-row"><span>Subtotal</span><span>${fmt(bill.subtotal)}</span></div>
      ${(bill.gstRate ?? 0) > 0
        ? `<div class="t-gst"><span>GST @ ${bill.gstRate}%</span><span>+ ${fmt(bill.gstAmount ?? 0)}</span></div>`
        : ''
      }
      <div class="t-total"><span class="lbl">Total</span><span class="amt">${fmt(bill.total)}</span></div>
    </div>
  </div>

  ${bill.note ? `<div class="note"><strong>Note:</strong> ${bill.note}</div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="footer-left">${bill.billNumber} &nbsp;&middot;&nbsp; ${dateStr(bill.createdAt)}</div>
      <div class="footer-tagline">This is a computer-generated invoice, no signature required.</div>
    </div>
    <div class="footer-right">Thank you for your purchase! 🙏</div>
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

  // GST analytics state
  const [gstTab, setGstTab]                   = useState<'today'|'week'|'month'|'custom'>('month');
  const [gstCustomFrom, setGstCustomFrom]     = useState('');
  const [gstCustomTo, setGstCustomTo]         = useState('');
  const [gstGroupBy, setGstGroupBy]           = useState<'day'|'month'>('day');
  const [gstRows, setGstRows]                 = useState<GstSummaryRow[]>([]);
  const [gstTotals, setGstTotals]             = useState<GstSummaryTotals>({ gstCollected: 0, revenue: 0, subtotal: 0, billCount: 0 });
  const [gstLoading, setGstLoading]           = useState(false);

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

  // ── GST summary fetch ────────────────────────────────────────────────────────
  const fetchGstSummary = useCallback(async (tab: typeof gstTab, customFrom: string, customTo: string, groupBy: 'day'|'month') => {
    if (!shopId) return;
    setGstLoading(true);
    try {
      const now   = new Date();
      let from = '';
      let to   = '';

      if (tab === 'today') {
        from = now.toISOString().split('T')[0];
        to   = from;
      } else if (tab === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        from = start.toISOString().split('T')[0];
        to   = now.toISOString().split('T')[0];
      } else if (tab === 'month') {
        from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        to   = now.toISOString().split('T')[0];
      } else {
        from = customFrom;
        to   = customTo;
      }

      const params = new URLSearchParams({
        shopId,
        gstSummary: 'true',
        groupBy,
        ...(from ? { dateFrom: from } : {}),
        ...(to   ? { dateTo:   to   } : {}),
      });
      const res  = await fetch(`/api/bills?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setGstRows(data.rows ?? []);
        setGstTotals(data.totals ?? { gstCollected: 0, revenue: 0, subtotal: 0, billCount: 0 });
      }
    } catch { /* ignore */ } finally {
      setGstLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchGstSummary(gstTab, gstCustomFrom, gstCustomTo, gstGroupBy);
  }, [gstTab, gstCustomFrom, gstCustomTo, gstGroupBy, fetchGstSummary]);

  const totalRevenue  = bills.reduce((s, b) => s + b.total, 0);
  const totalGstInView = bills.reduce((s, b) => s + (b.gstAmount ?? 0), 0);

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
    {
      label: 'GST Collected (this view)',
      value: fmt(totalGstInView),
      icon: 'ReceiptPercentIcon',
      color: 'bg-amber-50 text-amber-600',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

      {/* ── GST Analytics ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Icon name="ReceiptPercentIcon" className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">GST Analytics</p>
              <p className="text-xs text-slate-400">How much GST you&apos;ve collected over time</p>
            </div>
          </div>
          {/* Period tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start sm:self-auto">
            {(['today', 'week', 'month', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setGstTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                  gstTab === t
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'today' ? 'Today' : t === 'week' ? 'Last 7 Days' : t === 'month' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range (only when tab=custom) */}
        {gstTab === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">From</label>
              <input type="date" value={gstCustomFrom} onChange={e => setGstCustomFrom(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">To</label>
              <input type="date" value={gstCustomTo} onChange={e => setGstCustomTo(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs font-medium text-slate-500">Group by</label>
              <select value={gstGroupBy} onChange={e => setGstGroupBy(e.target.value as 'day'|'month')}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        )}

        {/* Summary totals strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
          {[
            { label: 'Bills', value: gstTotals.billCount.toLocaleString('en-IN'), accent: 'text-slate-800' },
            { label: 'Revenue', value: fmt(gstTotals.revenue), accent: 'text-emerald-700' },
            { label: 'Subtotal (excl. GST)', value: fmt(gstTotals.subtotal), accent: 'text-slate-700' },
            { label: 'GST Collected', value: fmt(gstTotals.gstCollected), accent: 'text-amber-600 font-extrabold' },
          ].map(item => (
            <div key={item.label} className="px-5 py-3">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{item.label}</p>
              <p className={`text-base font-bold mt-0.5 ${item.accent}`}>{gstLoading ? '…' : item.value}</p>
            </div>
          ))}
        </div>

        {/* Breakdown table */}
        {gstLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading GST data…</div>
        ) : gstRows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No GST data found for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-slate-100">
                  {['Period', 'Bills', 'Subtotal', 'GST Collected', 'Total Revenue'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gstRows.map((row, i) => (
                  <tr key={row.period} className={`border-t border-slate-50 ${i % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-700">{row.period}</td>
                    <td className="px-5 py-2.5 text-slate-600">{row.billCount}</td>
                    <td className="px-5 py-2.5 text-slate-600">{fmt(row.subtotal)}</td>
                    <td className="px-5 py-2.5">
                      {row.gstCollected > 0
                        ? <span className="font-bold text-amber-600">{fmt(row.gstCollected)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 font-semibold text-emerald-700">{fmt(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            {/* Modal action bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-500">Bill Preview</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openReceiptWindow(selectedBill, shopName)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                  <Icon name="ArrowDownTrayIcon" className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Icon name="XMarkIcon" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt card — same design as billing page */}
            <div className="bg-white border border-slate-200 rounded-b-2xl overflow-hidden">

              {/* Header band */}
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-8 py-5 flex items-center gap-5">
                <img
                  src="/assets/images/srs1.png"
                  alt="SRS Logo"
                  className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xl font-black tracking-tight">{shopName}</div>
                  <div className="text-emerald-200 text-xs mt-0.5 uppercase tracking-widest font-medium">Tax Invoice / Receipt</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-emerald-200 text-[10px] uppercase tracking-widest">Bill No.</div>
                  <div className="text-white font-mono font-bold text-sm mt-0.5">{selectedBill.billNumber}</div>
                </div>
              </div>

              <div className="px-8 pt-5 pb-7">

                {/* Plain-text meta line */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-1 border-b border-slate-100">
                  <span>{dateStr(selectedBill.createdAt)}&nbsp;&nbsp;·&nbsp;&nbsp;{timeStr(selectedBill.createdAt)}</span>
                  <span>Served by <span className="font-semibold text-slate-600">{selectedBill.performedBy}</span></span>
                </div>

                {/* Customer — plain inline */}
                {(selectedBill.customerName || selectedBill.customerPhone) && (
                  <div className="text-xs text-slate-400 mb-5 mt-2.5">
                    Bill to:{'  '}
                    <span className="font-semibold text-slate-700">
                      {selectedBill.customerName || 'Walk-in Customer'}
                    </span>
                    {selectedBill.customerPhone && (
                      <span className="ml-2 font-mono text-slate-500">+91&nbsp;{selectedBill.customerPhone}</span>
                    )}
                  </div>
                )}

                {/* Items table */}
                <table className="w-full text-sm mb-0">
                  <thead>
                    <tr className="bg-slate-50 rounded-xl">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-3 py-2.5 rounded-l-xl">#</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-2 py-2.5">Item</th>
                      <th className="text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-2 py-2.5 w-12">Qty</th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-2 py-2.5 w-24">Unit Price</th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-3 py-2.5 w-28 rounded-r-xl">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 px-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-700">{item.qty}</td>
                        <td className="py-3 px-2 text-right text-slate-500 text-xs">{fmt(item.unitPrice)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{fmt(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals block */}
                <div className="mt-4 ml-auto w-72 space-y-1.5">
                  <div className="flex justify-between text-sm text-slate-500 border-t border-dashed border-slate-200 pt-3">
                    <span>Subtotal</span><span>{fmt(selectedBill.subtotal)}</span>
                  </div>
                  {(selectedBill.gstRate ?? 0) > 0 ? (
                    <div className="flex justify-between text-sm text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                      <span>GST ({selectedBill.gstRate}%)</span><span>+{fmt(selectedBill.gstAmount ?? 0)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-800">
                    <span className="text-base font-extrabold text-slate-900">TOTAL</span>
                    <span className="text-2xl font-black text-emerald-700">{fmt(selectedBill.total)}</span>
                  </div>
                </div>

                {/* Note */}
                {selectedBill.note && (
                  <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <span className="font-semibold">Note:</span> {selectedBill.note}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {selectedBill.items.reduce((s, i) => s + i.qty, 0)} item{selectedBill.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}
                    &nbsp;·&nbsp; #{selectedBill.billNumber}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">Thank you for your purchase! 🙏</div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </ShopAdminLayout>
  );
}
