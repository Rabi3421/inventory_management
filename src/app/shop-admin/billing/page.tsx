'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScannedProduct {
  _id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  availableQty: number;
}

interface CartItem {
  product: ScannedProduct;
  qty: number;
}

interface ReceiptItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  balanceAfter: number;
}

interface Receipt {
  billNumber: string;
  shopId: string;
  items: ReceiptItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  performedBy: string;
  note: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user } = useAuth();
  const shopId   = user?.shopId   ?? '';
  const shopName = user?.shopName ?? 'My Shop';

  // Cart state
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanError, setScanError]   = useState('');
  const [scanning, setScanning]     = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScannedProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);

  // Checkout state
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [receipt, setReceipt]         = useState<Receipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [billNote, setBillNote]       = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError]       = useState('');
  const [gstRate, setGstRate]             = useState<number>(0);
  const [gstFromSettings, setGstFromSettings] = useState<{ enabled: boolean; rate: number }>({ enabled: false, rate: 0 });
  const [gstSettingsLoaded, setGstSettingsLoaded] = useState(false);

  const [scanGunActive, setScanGunActive] = useState(false);

  const barcodeRef       = useRef<HTMLInputElement>(null);
  const barcodeValueRef  = useRef('');          // mirrors barcodeInput for use in event handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarcodeScanRef = useRef<(code: string) => void>(() => {});
  const searchRef        = useRef<HTMLInputElement>(null);
  const searchTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropRef          = useRef<HTMLDivElement>(null);

  // Keep the ref in sync with state
  useEffect(() => { barcodeValueRef.current = barcodeInput; }, [barcodeInput]);

  // Auto-focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Load GST default from settings
  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const enabled = !!data.settings?.gstEnabled;
        const rate    = Math.min(100, Math.max(0, Number(data.settings?.gstRate ?? 0)));
        setGstFromSettings({ enabled, rate });
        if (enabled) setGstRate(rate);
        setGstSettingsLoaded(true);
      })
      .catch(() => { setGstSettingsLoaded(true); /* fallback: hide GST */ });
  }, []);

  // Global keydown: intercept characters from the scan gun even when another
  // element has focus, so no keystroke is ever lost.
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName ?? '';
      const isOtherTypingField =
        (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') &&
        active !== barcodeRef.current;

      // If focus is already on the barcode input, let the native input handle it
      if (active === barcodeRef.current) return;

      // If focus is on another form field, don't steal keystrokes
      if (isOtherTypingField) return;

      // Ignore modifier combos
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        // Trigger scan with whatever has been accumulated
        e.preventDefault();
        barcodeRef.current?.focus();
        const val = barcodeValueRef.current;
        if (val.trim()) {
          handleBarcodeScanRef.current(val);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const next = barcodeValueRef.current.slice(0, -1);
        barcodeValueRef.current = next;
        setBarcodeInput(next);
        barcodeRef.current?.focus();
      } else if (e.key.length === 1) {
        // Printable character — append to barcode value and focus the input
        e.preventDefault();
        const next = barcodeValueRef.current + e.key;
        barcodeValueRef.current = next;
        setBarcodeInput(next);
        barcodeRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowSearchDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Barcode scan handler ────────────────────────────────────────────────────

  const handleBarcodeScan = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setScanError('');
    setScanning(true);

    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code.trim())}?shopId=${shopId}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error ?? 'Product not found.');
        setScanning(false);
        setBarcodeInput('');
        barcodeRef.current?.focus();
        return;
      }

      addToCart(data.product);
    } catch {
      setScanError('Network error. Please try again.');
    } finally {
      setScanning(false);
      setBarcodeInput('');
      barcodeValueRef.current = '';
      barcodeRef.current?.focus();
    }
  }, [shopId]);

  // Keep the ref always pointing to the latest version
  handleBarcodeScanRef.current = handleBarcodeScan;

  // ── Cart helpers ────────────────────────────────────────────────────────────

  function addToCart(product: ScannedProduct) {
    setCart(prev => {
      const existing = prev.find(c => c.product._id === product._id);
      if (existing) {
        if (existing.qty + 1 > product.availableQty) {
          setScanError(`Only ${product.availableQty} units of "${product.name}" in stock.`);
          return prev;
        }
        setScanError('');
        return prev.map(c =>
          c.product._id === product._id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      if (product.availableQty < 1) {
        setScanError(`"${product.name}" is out of stock.`);
        return prev;
      }
      setScanError('');
      return [...prev, { product, qty: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty < 1) { removeFromCart(productId); return; }
    setCart(prev => prev.map(c => {
      if (c.product._id !== productId) return c;
      if (qty > c.product.availableQty) return c;
      return { ...c, qty };
    }));
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(c => c.product._id !== productId));
  }

  function clearCart() {
    setCart([]);
    setScanError('');
    setCheckoutError('');
    setBillNote('');
    setCustomerName('');
    setCustomerPhone('');
    setPhoneError('');
    barcodeRef.current?.focus();
  }

  // ── Live search ─────────────────────────────────────────────────────────────

  function onSearchChange(val: string) {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); setShowSearchDrop(false); return; }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/products?shopId=${shopId}&search=${encodeURIComponent(val.trim())}&limit=10`,
          { credentials: 'include' },
        );
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data.products ?? []);
          setShowSearchDrop(true);
        }
      } catch { /* ignore */ } finally {
        setSearchLoading(false);
      }
    }, 300);
  }

  function selectSearchResult(p: ScannedProduct) {
    addToCart(p);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDrop(false);
    barcodeRef.current?.focus();
  }

  // ── Checkout ────────────────────────────────────────────────────────────────

  const subtotal   = parseFloat(cart.reduce((s, c) => s + c.product.price * c.qty, 0).toFixed(2));
  const gstAmount  = parseFloat((subtotal * gstRate / 100).toFixed(2));
  const cartTotal  = parseFloat((subtotal + gstAmount).toFixed(2));

  async function handleCheckout() {
    if (cart.length === 0) return;

    // Validate phone
    const phone = customerPhone.trim();
    if (!phone) {
      setPhoneError('Customer phone number is required.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setPhoneError('');
    setCheckoutError('');
    setCheckingOut(true);

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          items: cart.map(c => ({ productId: c.product._id, qty: c.qty })),
          performedBy: user?.name ?? user?.email ?? 'shop-admin',
          note: billNote,
          customerName: customerName.trim(),
          customerPhone: phone,
          gstRate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data.error ?? 'Checkout failed.');
        setCheckingOut(false);
        return;
      }

      setReceipt(data.receipt);
      setShowReceipt(true);
      setCart([]);
      setBillNote('');
      setCustomerName('');
      setCustomerPhone('');
      setGstRate(gstFromSettings.enabled ? gstFromSettings.rate : 0);
    } catch {
      setCheckoutError('Network error. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  // ── Print receipt ────────────────────────────────────────────────────────────

  function printReceipt() {
    if (!receipt) return;

    const itemRows = receipt.items.map((item, i) => `
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

    // Title shown in PDF filename
    const pdfTitle = `Receipt-${receipt.billNumber}`;

    const totalItems = receipt.items.reduce((s, i) => s + i.qty, 0);

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
    .meta-line span { }

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
      <div class="inv-number">${receipt.billNumber}</div>
      <div class="inv-badge">Tax Invoice</div>
    </div>
  </div>

  <!-- Meta line -->
  <div class="meta-line">
    <span>${dateStr(receipt.createdAt)} &nbsp;&middot;&nbsp; ${timeStr(receipt.createdAt)}</span>
    <span>Served by: <strong style="color:#475569">${receipt.performedBy}</strong></span>
  </div>

  ${ receipt.customerPhone ? `
  <!-- Customer line -->
  <div class="cust-line">
    Bill to: <span class="cv">${receipt.customerName || 'Walk-in Customer'}</span>
    <span class="cp">+91&nbsp;${receipt.customerPhone}</span>
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
      <div class="t-row"><span>Subtotal</span><span>${fmt(receipt.subtotal)}</span></div>
      ${receipt.gstRate > 0
        ? `<div class="t-gst"><span>GST @ ${receipt.gstRate}%</span><span>+ ${fmt(receipt.gstAmount)}</span></div>`
        : ''
      }
      <div class="t-total"><span class="lbl">Total</span><span class="amt">${fmt(receipt.total)}</span></div>
    </div>
  </div>

  ${receipt.note ? `<div class="note"><strong>Note:</strong> ${receipt.note}</div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="footer-left">${receipt.billNumber} &nbsp;&middot;&nbsp; ${dateStr(receipt.createdAt)}</div>
      <div class="footer-tagline">This is a computer-generated invoice, no signature required.</div>
    </div>
    <div class="footer-right">Thank you for your purchase! 🙏</div>
  </div>

</body>
</html>`;

    // Inject into a hidden iframe and trigger print dialog (Save as PDF)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
    document.body.appendChild(iframe);
    const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (iDoc) {
      iDoc.open();
      iDoc.write(html);
      iDoc.close();
      // Give fonts/images a moment to load, then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Remove iframe after the print dialog closes
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 600);
    }
  }

  function startNewBill() {
    setShowReceipt(false);
    setReceipt(null);
    setScanError('');
    setCheckoutError('');
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }

  // ── Receipt Modal ────────────────────────────────────────────────────────────

  if (showReceipt && receipt) {
    return (
      <ShopAdminLayout activeRoute="/shop-admin/billing">
        <div className="max-w-2xl mx-auto py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Bill Generated!</h1>
              <p className="text-sm text-slate-500">Sale recorded successfully</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={printReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
              >
                <Icon name="ArrowDownTrayIcon" className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={startNewBill}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Icon name="PlusIcon" className="w-4 h-4" />
                New Bill
              </button>
            </div>
          </div>

          {/* Receipt preview card — professional invoice */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

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
                <div className="text-white font-mono font-bold text-sm mt-0.5">{receipt.billNumber}</div>
              </div>
            </div>

            <div className="px-8 pt-5 pb-7">

              {/* Plain-text meta line */}
              <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-1 border-b border-slate-100">
                <span>{dateStr(receipt.createdAt)}&nbsp;&nbsp;·&nbsp;&nbsp;{timeStr(receipt.createdAt)}</span>
                <span>Served by <span className="font-semibold text-slate-600">{receipt.performedBy}</span></span>
              </div>

              {/* Customer — plain inline */}
              {(receipt.customerName || receipt.customerPhone) && (
                <div className="text-xs text-slate-400 mb-5 mt-2.5">
                  Bill to:{'  '}
                  <span className="font-semibold text-slate-700">
                    {receipt.customerName || 'Walk-in Customer'}
                  </span>
                  {receipt.customerPhone && (
                    <span className="ml-2 font-mono text-slate-500">+91&nbsp;{receipt.customerPhone}</span>
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
                  {receipt.items.map((item, i) => (
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
                  <span>Subtotal</span><span>{fmt(receipt.subtotal)}</span>
                </div>
                {(receipt.gstRate ?? 0) > 0 ? (
                  <div className="flex justify-between text-sm text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                    <span>GST ({receipt.gstRate}%)</span><span>+{fmt(receipt.gstAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-800">
                  <span className="text-base font-extrabold text-slate-900">TOTAL</span>
                  <span className="text-2xl font-black text-emerald-700">{fmt(receipt.total)}</span>
                </div>
              </div>

              {/* Note */}
              {receipt.note && (
                <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <span className="font-semibold">Note:</span> {receipt.note}
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {receipt.items.reduce((s, i) => s + i.qty, 0)} item{receipt.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}
                  &nbsp;·&nbsp; #{receipt.billNumber}
                </div>
                <div className="text-xs font-semibold text-slate-500">Thank you for your purchase! 🙏</div>
              </div>

            </div>
          </div>


        </div>
      </ShopAdminLayout>
    );
  }

  // ── Camera scan handler ────────────────────────────────────────────────────

  function handleCameraCode(code: string) {
    setShowCameraScanner(false);
    handleBarcodeScan(code);
  }

  // ── Main Billing UI ──────────────────────────────────────────────────────────

  return (
    <>
    {showCameraScanner && (
      <BarcodeScanner
        onScan={handleCameraCode}
        onClose={() => setShowCameraScanner(false)}
      />
    )}
    <ShopAdminLayout activeRoute="/shop-admin/billing">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Use your scan gun or search products to add to cart
          </p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
          >
            <Icon name="TrashIcon" className="w-4 h-4" />
            Clear Cart
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── Left: Scan + Search ───────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Barcode scanner input */}
          <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
            scanGunActive ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-200'
          }`}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  scanGunActive ? 'bg-emerald-500' : 'bg-emerald-100'
                }`}>
                  <Icon name="QrCodeIcon" className={`w-4 h-4 ${
                    scanGunActive ? 'text-white' : 'text-emerald-700'
                  }`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    Scan Gun
                    {scanGunActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Click field or start scanning
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">Point your scan gun at any barcode — it will auto-submit</div>
                </div>
              </div>
              <button
                onClick={() => { setScanError(''); setShowCameraScanner(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-medium rounded-xl border border-slate-200 transition-colors"
                title="Use phone/laptop camera instead"
              >
                <Icon name="CameraIcon" className="w-3.5 h-3.5" />
                Camera
              </button>
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onFocus={() => setScanGunActive(true)}
                  onBlur={() => setScanGunActive(false)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleBarcodeScan(barcodeInput);
                  }}
                  placeholder="Point scan gun here and pull trigger…"
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 font-mono transition-all ${
                    scanGunActive
                      ? 'border-emerald-400 focus:ring-emerald-500/20 bg-emerald-50/30'
                      : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-400'
                  }`}
                  autoComplete="off"
                />
                <Icon
                  name="QrCodeIcon"
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    scanGunActive ? 'text-emerald-500' : 'text-slate-400'
                  }`}
                />
              </div>
              <button
                onClick={() => handleBarcodeScan(barcodeInput)}
                disabled={scanning || !barcodeInput.trim()}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {scanning ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="MagnifyingGlassIcon" className="w-4 h-4" />
                )}
                {scanning ? 'Looking up…' : 'Scan'}
              </button>
            </div>

            {/* Re-focus hint when not active */}
            {!scanGunActive && !scanError && (
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <Icon name="InformationCircleIcon" className="w-3.5 h-3.5 flex-shrink-0" />
                Press any key or click the field above — then pull the scan gun trigger
              </p>
            )}

            {scanError && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <Icon name="ExclamationCircleIcon" className="w-4 h-4 flex-shrink-0" />
                {scanError}
              </div>
            )}
          </div>

          {/* Product search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" ref={dropRef}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Icon name="MagnifyingGlassIcon" className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Search Products</div>
                <div className="text-xs text-slate-400">Search by name or SKU</div>
              </div>
            </div>

            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDrop(true)}
                placeholder="Search product name or SKU…"
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                autoComplete="off"
              />
              <Icon name="MagnifyingGlassIcon" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              )}

              {/* Dropdown */}
              {showSearchDrop && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden max-h-72 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p._id}
                      onClick={() => selectSearchResult(p)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.sku}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-slate-800">{fmt(p.price)}</div>
                        <div className={`text-xs font-medium ${p.availableQty === 0 ? 'text-red-500' : p.availableQty <= 20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {p.availableQty === 0 ? 'Out of stock' : `${p.availableQty} in stock`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="ShoppingCartIcon" className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Cart</span>
                {cart.length > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    {cart.reduce((s, c) => s + c.qty, 0)} items
                  </span>
                )}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Icon name="ShoppingCartIcon" className="w-7 h-7 text-slate-300" />
                </div>
                <div className="text-sm font-medium text-slate-500">Cart is empty</div>
                <div className="text-xs text-slate-400 mt-1">Scan a barcode or search for products above</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map(item => (
                  <div key={item.product._id} className="flex items-center gap-4 px-5 py-3.5">
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{item.product.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-slate-400">{item.product.sku}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{fmt(item.product.price)} each</span>
                      </div>
                    </div>

                    {/* Qty stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.product._id, item.qty - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Icon name="MinusIcon" className="w-3 h-3 text-slate-600" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.product.availableQty}
                        value={item.qty}
                        onChange={e => updateQty(item.product._id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                      />
                      <button
                        onClick={() => updateQty(item.product._id, item.qty + 1)}
                        disabled={item.qty >= item.product.availableQty}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center transition-colors"
                      >
                        <Icon name="PlusIcon" className="w-3 h-3 text-slate-600" />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="w-24 text-right">
                      <div className="text-sm font-bold text-slate-800">{fmt(item.product.price * item.qty)}</div>
                      {item.qty > 1 && (
                        <div className="text-xs text-slate-400">{item.qty} × {fmt(item.product.price)}</div>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.product._id)}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                    >
                      <Icon name="XMarkIcon" className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Order summary + Checkout ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="ReceiptPercentIcon" className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Order Summary</span>
            </div>

            {/* Item breakdown */}
            {cart.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">No items yet</div>
            ) : (
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.product._id} className="flex justify-between text-sm">
                    <span className="text-slate-600 truncate mr-2">
                      {item.product.name}
                      {item.qty > 1 && <span className="text-slate-400"> ×{item.qty}</span>}
                    </span>
                    <span className="font-medium text-slate-800 flex-shrink-0">{fmt(item.product.price * item.qty)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* GST Rate — only shown when superadmin has enabled GST */}
            {gstSettingsLoaded && gstFromSettings.enabled && (
              <div className="mt-3 mb-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <Icon name="LockClosedIcon" className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs text-indigo-700 font-medium">
                    GST {gstRate === 0 ? '(0%)' : `${gstRate}%`} applied
                  </span>
                  <span className="ml-auto text-[10px] text-indigo-400 italic">set by admin</span>
                </div>
              </div>
            )}

            {/* Divider + total */}
            <div className="border-t border-dashed border-slate-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Items</span>
                <span>{cart.reduce((s, c) => s + c.qty, 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {gstRate > 0 && (
                <div className="flex justify-between text-sm text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                  <span>GST ({gstRate}%)</span>
                  <span>+{fmt(gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200 mt-1">
                <span>Total</span>
                <span className="text-emerald-700 text-lg">{fmt(cartTotal)}</span>
              </div>
            </div>

            {/* Customer details */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Customer Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-sm bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 font-medium select-none">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCustomerPhone(v);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="10-digit mobile number"
                    className={`flex-1 px-3 py-2 text-sm bg-slate-50 border rounded-r-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      phoneError
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-400'
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" className="w-3 h-3" />
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer Name <span className="text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Note <span className="text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  value={billNote}
                  onChange={e => setBillNote(e.target.value)}
                  placeholder="e.g. Reference, occasion…"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
              </div>
            </div>

            {/* Checkout error */}
            {checkoutError && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <Icon name="ExclamationCircleIcon" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {checkoutError}
              </div>
            )}

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkingOut}
              className="mt-4 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
            >
              {checkingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Icon name="CheckCircleIcon" className="w-4 h-4" />
                  Checkout &amp; Generate Bill
                </>
              )}
            </button>
          </div>

          {/* Quick tips */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Tips</div>
            <div className="space-y-2">
              {[
                { icon: 'QrCodeIcon', tip: 'The scan field is always ready — just pull the trigger on your scan gun' },
                { icon: 'ArrowPathIcon', tip: 'Scanning the same barcode again adds +1 to that item in the cart' },
                { icon: 'MagnifyingGlassIcon', tip: 'Use Search Products below to add items manually by name or SKU' },
                { icon: 'PrinterIcon', tip: 'After checkout, download the PDF receipt or print it' },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-2">
                  <Icon name={icon} className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-slate-500">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ShopAdminLayout>
    </>
  );
}
