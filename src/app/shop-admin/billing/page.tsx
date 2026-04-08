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

  const [scanGunActive, setScanGunActive] = useState(false);

  const barcodeRef       = useRef<HTMLInputElement>(null);
  const barcodeValueRef  = useRef('');          // mirrors barcodeInput for use in event handlers
  const searchRef        = useRef<HTMLInputElement>(null);
  const searchTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropRef          = useRef<HTMLDivElement>(null);

  // Keep the ref in sync with state
  useEffect(() => { barcodeValueRef.current = barcodeInput; }, [barcodeInput]);

  // Auto-focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
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
          handleBarcodeScan(val);
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
  }, [handleBarcodeScan]);

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
      barcodeRef.current?.focus();
    }
  }, [shopId]);

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

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);

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
      <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="item-name">
          <span class="name">${item.name}</span>
          <span class="sku">${item.sku}</span>
        </td>
        <td class="center">${item.qty}</td>
        <td class="right">${fmt(item.unitPrice)}</td>
        <td class="right total-cell">${fmt(item.lineTotal)}</td>
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
    @page { size: A5 portrait; margin: 0; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #ffffff;
      display: flex;
      justify-content: center;
      padding: 0;
      min-height: 100vh;
    }
    .receipt {
      background: #ffffff;
      width: 100%;
      max-width: 100%;
      border-radius: 0;
      overflow: hidden;
      box-shadow: none;
    }
    /* Shop header */
    .header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #fff;
      text-align: center;
      padding: 28px 12px 20px;
    }
    .header .shop-name {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .header .sub {
      font-size: 12px;
      color: rgba(255,255,255,0.75);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    /* Meta row */
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 18px 12px;
      background: #f8fafc;
      border-bottom: 1px dashed #e2e8f0;
    }
    .meta-block .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-block .value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; font-family: monospace; }
    .meta-block .value-sm { font-size: 12px; color: #475569; margin-top: 1px; }
    .meta-block.right { text-align: right; }
    /* Served by */
    .served-by {
      padding: 10px 12px;
      font-size: 12px;
      color: #64748b;
      border-bottom: 1px solid #f1f5f9;
    }
    .served-by span { font-weight: 600; color: #334155; }
    /* Customer block */
    .customer-block {
      padding: 10px 12px;
      background: #f0fdf4;
      border-bottom: 1px solid #dcfce7;
    }
    .customer-row { display: flex; justify-content: space-between; align-items: center; }
    .customer-label { font-size: 11px; color: #16a34a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .customer-value { font-size: 13px; font-weight: 600; color: #15803d; }
    /* Items table */
    .items { padding: 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { border-bottom: 2px solid #e2e8f0; }
    thead th { padding: 12px 0 10px; color: #94a3b8; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    th.center, td.center { text-align: center; width: 44px; }
    th.right, td.right { text-align: right; }
    th:first-child, td.item-name { text-align: left; padding-right: 12px; }
    td { padding: 10px 0; vertical-align: top; }
    .row-even { background: transparent; }
    .row-odd td { background: #f8fafc; }
    .row-odd td:first-child { border-radius: 6px 0 0 6px; padding-left: 6px; }
    .row-odd td:last-child { border-radius: 0 6px 6px 0; padding-right: 6px; }
    td.item-name .name { display: block; font-weight: 600; color: #1e293b; }
    td.item-name .sku  { display: block; font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 1px; }
    .total-cell { font-weight: 700; color: #0f172a; }
    /* Totals */
    .totals {
      padding: 16px 12px 20px;
      border-top: 1px dashed #e2e8f0;
      margin-top: 4px;
    }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 3px 0; }
    .total-final {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #e2e8f0;
    }
    .total-final .label { font-size: 16px; font-weight: 800; color: #0f172a; }
    .total-final .amount { font-size: 20px; font-weight: 800; color: #059669; }
    /* Note */
    .note {
      margin: 0 12px 16px;
      padding: 10px 12px;
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 8px;
      font-size: 12px;
      color: #713f12;
    }
    .note .note-label { font-weight: 700; }
    /* Footer */
    .footer {
      background: #f8fafc;
      border-top: 1px dashed #e2e8f0;
      text-align: center;
      padding: 14px 12px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.7;
    }
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
          <div class="value">${receipt.billNumber}</div>
        </div>
        <div class="meta-block right">
          <div class="label">Date &amp; Time</div>
          <div class="value-sm">${dateStr(receipt.createdAt)}</div>
          <div class="value-sm">${timeStr(receipt.createdAt)}</div>
        </div>
      </div>

      <div class="served-by">Served by: <span>${receipt.performedBy}</span></div>

      ${receipt.customerPhone ? `
      <div class="customer-block">
        <div class="customer-row">
          <span class="customer-label">Customer</span>
          <span class="customer-value">${receipt.customerName ? receipt.customerName + ' &middot; ' : ''}+91 ${receipt.customerPhone}</span>
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
        <div class="total-row"><span>Subtotal</span><span>${fmt(receipt.subtotal)}</span></div>
        <div class="total-row"><span>Tax (0%)</span><span>—</span></div>
        <div class="total-final">
          <span class="label">Total</span>
          <span class="amount">${fmt(receipt.total)}</span>
        </div>
      </div>

      ${receipt.note ? `<div class="note"><span class="note-label">Note:</span> ${receipt.note}</div>` : ''}

      <div class="footer">
        <div class="thank-you">Thank you for shopping at ${shopName}! 🙏</div>
        ${totalItems} item${totalItems !== 1 ? 's' : ''} &nbsp;·&nbsp; Bill #${receipt.billNumber}<br/>
        ShopInventory — Powered by your store
      </div>
    </div>

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

          {/* Receipt preview card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Shop header */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-8 py-6 text-center">
              <div className="text-xl font-bold">{shopName}</div>
              <div className="text-emerald-100 text-xs mt-1 uppercase tracking-widest">Tax Invoice / Receipt</div>
            </div>

            <div className="px-8 py-6">
              {/* Bill meta */}
              <div className="flex justify-between text-sm mb-4 pb-4 border-b border-dashed border-slate-200">
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Bill No.</div>
                  <div className="font-mono font-semibold text-slate-800 mt-0.5">{receipt.billNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Date &amp; Time</div>
                  <div className="font-medium text-slate-800 mt-0.5">{dateStr(receipt.createdAt)}</div>
                  <div className="text-slate-500 text-xs">{timeStr(receipt.createdAt)}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 mb-5">
                <div className="text-xs text-slate-400">
                  Served by: <span className="font-medium text-slate-600">{receipt.performedBy}</span>
                </div>
                {(receipt.customerName || receipt.customerPhone) && (
                  <div className="text-xs text-slate-400">
                    Customer:{' '}
                    <span className="font-medium text-slate-600">
                      {receipt.customerName ? `${receipt.customerName} · ` : ''}{receipt.customerPhone}
                    </span>
                  </div>
                )}
              </div>

              {/* Items */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-slate-400 text-xs font-semibold uppercase tracking-wide pb-2 pr-4">Item</th>
                    <th className="text-center text-slate-400 text-xs font-semibold uppercase tracking-wide pb-2 w-12">Qty</th>
                    <th className="text-right text-slate-400 text-xs font-semibold uppercase tracking-wide pb-2 w-24">Price</th>
                    <th className="text-right text-slate-400 text-xs font-semibold uppercase tracking-wide pb-2 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => (
                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                      <td className="py-2.5 pr-4">
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-2.5 text-center text-slate-700">{item.qty}</td>
                      <td className="py-2.5 text-right text-slate-600 text-xs">{fmt(item.unitPrice)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-800">{fmt(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-200 pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{fmt(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax (0%)</span>
                  <span>—</span>
                </div>
                <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-3 border-t border-slate-200 mt-1">
                  <span>Total</span>
                  <span className="text-emerald-700">{fmt(receipt.total)}</span>
                </div>
              </div>

              {receipt.note && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <span className="font-semibold">Note:</span> {receipt.note}
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-center text-xs text-slate-400">
                <div className="font-semibold text-slate-500 mb-1">Thank you for shopping at {shopName}! 🙏</div>
                {receipt.items.reduce((s, i) => s + i.qty, 0)} item{receipt.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''} &nbsp;·&nbsp; Bill #{receipt.billNumber}
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
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200 mt-1">
                <span>Total</span>
                <span className="text-emerald-700 text-lg">{fmt(subtotal)}</span>
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
