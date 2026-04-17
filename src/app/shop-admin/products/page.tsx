'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { INDIAN_STATES_AND_UTS } from '@/lib/locations/india';
import {
  qzConnect,
  qzDisconnect,
  qzIsConnected,
  qzGetPrinters,
  qzPrintLabels,
} from '@/lib/qzTray';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  _id: string;
  shopId?: string;
  shopName?: string;
  sku: string;
  hsnCode?: string;
  sourceState?: string;
  sourceDistrict?: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  gauge?: string;
  weight?: string;
  purchasePrice?: number;
  purchaseDate?: string | null;
  tax?: number;
  saleGstRate?: number;
  transportationCost?: number;
  lowStockAlertQty?: number | null;
  purchaseDetailsStatus?: 'complete' | 'pending';
  purchaseDetailsMissingFields?: string[];
  mfgDate?: string | null;
  expiryDate?: string | null;
  createdAt: string;
}

interface ProductStats {
  totalProducts: number;
  totalUnits: number;
  availableUnits: number;
  catalogValue: number;
  expiringSoon?: number;
}

interface FormState {
  name: string;
  quantity: string;
  price: string;
  description: string;
  sku: string;
  hsnCode: string;
  sourceState: string;
  sourceDistrict: string;
  skuMode: 'auto' | 'manual';
  gauge: string;
  weight: string;
  purchasePrice: string;
  purchaseDate: string;
  tax: string;
  saleGstRate: string;
  transportationCost: string;
  lowStockAlertQty: string;
  mfgDate: string;
  expiryDate: string;
}

interface EditState {
  name: string;
  price: string;
  totalQty: string;
  availableQty: string;
  description: string;
  sku: string;
  hsnCode: string;
  sourceState: string;
  sourceDistrict: string;
  gauge: string;
  weight: string;
  purchasePrice: string;
  purchaseDate: string;
  tax: string;
  saleGstRate: string;
  transportationCost: string;
  lowStockAlertQty: string;
  mfgDate: string;
  expiryDate: string;
}

interface PrintTarget {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  totalQty: number;
  price: number;
  barcodePrintUrl: string;
  restocked: boolean;
}

type SortKey = 'name' | 'price' | 'availableQty' | 'totalQty' | 'createdAt' | 'expiryDate';
type SortDir = 'asc' | 'desc';
type ExpiryFilter = 'all' | 'expiring-soon' | 'expired';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = { name: '', quantity: '', price: '', description: '', sku: '', hsnCode: '', sourceState: '', sourceDistrict: '', skuMode: 'auto', gauge: '', weight: '', purchasePrice: '', purchaseDate: '', tax: '', saleGstRate: '', transportationCost: '', lowStockAlertQty: '', mfgDate: '', expiryDate: '' };
const PAGE_SIZE = 50;

const inputBase =
  'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all';

function toOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toOptionalThreshold(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function toOptionalRate(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return null;
  return Number(parsed.toFixed(2));
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ShopAdminProductsPage() {
  const { user } = useAuth();
  const shopId = user?.shopId ?? '';
  const shopName = user?.shopName ?? 'My Shop';

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({ totalProducts: 0, totalUnits: 0, availableUnits: 0, catalogValue: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Table
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');

  // Add form
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError]       = useState('');
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(20);

  // Name autocomplete
  const [nameSuggestions, setNameSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editTarget, setEditTarget]     = useState<Product | null>(null);
  const [editState, setEditState]       = useState<EditState>({ name: '', price: '', totalQty: '', availableQty: '', description: '', sku: '', hsnCode: '', sourceState: '', sourceDistrict: '', gauge: '', weight: '', purchasePrice: '', purchaseDate: '', tax: '', saleGstRate: '', transportationCost: '', lowStockAlertQty: '', mfgDate: '', expiryDate: '' });
  const [editErrors, setEditErrors]     = useState<Partial<Record<keyof EditState, string>>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editApiError, setEditApiError] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print barcodes modal
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // ── QZ Tray state ─────────────────────────────────────────────────────────
  type QzStatus = 'idle' | 'connecting' | 'connected' | 'error';
  const [qzStatus, setQzStatus] = useState<QzStatus>('idle');
  const [qzError, setQzError] = useState('');
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [qzPrinter, setQzPrinter] = useState<string>(() => {
    // Restore last-used printer from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('qz_printer') ?? '';
    }
    return '';
  });

  // Persist selected printer
  useEffect(() => {
    if (qzPrinter) localStorage.setItem('qz_printer', qzPrinter);
  }, [qzPrinter]);

  // Auto-connect to QZ Tray when the print modal opens
  useEffect(() => {
    if (!printTarget) return;
    if (qzIsConnected()) {
      setQzStatus('connected');
      qzGetPrinters().then(list => {
        setQzPrinters(list);
        // Pre-select saved printer or auto-detect Shreyans Barcode Printer
        setQzPrinter(prev => {
          if (prev && list.includes(prev)) return prev;
          const thermal = list.find(p =>
            /shreyans|barcode|thermal|zebra|brother.*ql|tsc|bixolon|xprinter/i.test(p)
          );
          return thermal ?? list[0] ?? prev;
        });
      }).catch(() => { });
      return;
    }
    setQzStatus('connecting');
    setQzError('');
    qzConnect()
      .then(() => {
        setQzStatus('connected');
        return qzGetPrinters();
      })
      .then(list => {
        setQzPrinters(list);
        setQzPrinter(prev => {
          if (prev && list.includes(prev)) return prev;
          const thermal = list.find(p =>
            /shreyans|barcode|thermal|zebra|brother.*ql|tsc|bixolon|xprinter/i.test(p)
          );
          return thermal ?? list[0] ?? prev;
        });
      })
      .catch((err: unknown) => {
        setQzStatus('error');
        setQzError(
          (err instanceof Error ? err.message : String(err)) ||
          'QZ Tray not running. Please install and start QZ Tray.',
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printTarget]);

  // ── QZ direct print ───────────────────────────────────────────────────────
  async function handlePrintLabels(baseUrl: string) {
    setIsPrinting(true);
    try {
      if (qzStatus === 'connected' && qzPrinter) {
        // ── Path A: QZ Tray direct print (no dialog) ──────────────────────
        const jsonUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}format=json`;
        const res = await fetch(jsonUrl, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch barcode data.');
        const data: { labels: { pngBase64: string }[] } = await res.json();
        await qzPrintLabels(qzPrinter, data.labels.map(l => l.pngBase64));
        setPrintTarget(null);
      } else {
        // ── Path B: iframe + OS print dialog (fallback) ───────────────────
        const res = await fetch(baseUrl, { credentials: 'include' });
        const html = await res.text();
        const iframe = document.createElement('iframe');
        iframe.style.cssText =
          'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
        if (!doc) throw new Error('Cannot access iframe document');
        doc.open(); doc.write(html); doc.close();
        const imgs = Array.from(doc.querySelectorAll<HTMLImageElement>('img'));
        await Promise.all(imgs.map(img => new Promise<void>(resolve => {
          if (img.complete) { resolve(); return; }
          img.onload = img.onerror = () => resolve();
        })));
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => { try { document.body.removeChild(iframe); } catch { /**/ } }, 5000);
        }, 300);
        setPrintTarget(null);
      }
    } catch (err) {
      console.error('[handlePrintLabels]', err);
      window.open(baseUrl, '_blank');
    } finally {
      setIsPrinting(false);
    }
  }

  async function handleQzReconnect() {
    setQzStatus('connecting');
    setQzError('');
    try {
      await qzDisconnect();
      await qzConnect();
      setQzStatus('connected');
      const list = await qzGetPrinters();
      setQzPrinters(list);
    } catch (err: unknown) {
      setQzStatus('error');
      setQzError(err instanceof Error ? err.message : 'Connection failed.');
    }
  }

  const sourceStateOptions = useMemo(
    () => Array.from(new Set([
      ...INDIAN_STATES_AND_UTS,
      ...products.map(product => product.sourceState?.trim()).filter((value): value is string => Boolean(value)),
    ])).sort((left, right) => left.localeCompare(right)),
    [products],
  );

  const sourceDistrictOptions = useMemo(() => {
    const selectedState = form.sourceState.trim().toLowerCase();
    return Array.from(
      new Set(
        products
          .filter(product => !selectedState || (product.sourceState ?? '').trim().toLowerCase() === selectedState)
          .map(product => product.sourceDistrict?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [form.sourceState, products]);

  const editSourceDistrictOptions = useMemo(() => {
    const selectedState = editState.sourceState.trim().toLowerCase();
    return Array.from(
      new Set(
        products
          .filter(product => !selectedState || (product.sourceState ?? '').trim().toLowerCase() === selectedState)
          .map(product => product.sourceDistrict?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [editState.sourceState, products]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  // ── Fetch products ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ shopId, page: String(page), limit: String(PAGE_SIZE), sort: sortKey, dir: sortDir, ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(expiryFilter !== 'all' ? { expiry: expiryFilter } : {}) });
      const res = await fetch(`/api/products?${params}`, { credentials: 'include' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? 'Failed to load products.'); }
      const data = await res.json();
      setProducts(data.products ?? []);
      setDefaultLowStockThreshold(data.settings?.lowStockThreshold ?? 20);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalCount(data.pagination?.total ?? 0);
      setStats(data.stats ?? { totalProducts: 0, totalUnits: 0, availableUnits: 0, catalogValue: 0 });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, page, sortKey, sortDir, debouncedSearch, expiryFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Name autocomplete ─────────────────────────────────────────────────────
  const fetchNameSuggestions = useCallback((query: string) => {
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    if (!query.trim()) { setNameSuggestions([]); setShowSuggestions(false); return; }
    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=8&sort=name&dir=asc`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setNameSuggestions(data.products ?? []);
        setShowSuggestions((data.products ?? []).length > 0);
      } catch { /* silent */ }
    }, 250);
  }, []);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined }));
    setApiError('');
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errors.name = 'Product name is required.';
    const qty = Number(form.quantity);
    if (!form.quantity || isNaN(qty) || qty < 1) errors.quantity = 'Enter a valid quantity (≥ 1).';
    const price = Number(form.price);
    if (!form.price || isNaN(price) || price < 0) errors.price = 'Enter a valid price.';
    if (!form.gauge.trim()) errors.gauge = 'Gauge is required.';
    if (!form.weight.trim()) errors.weight = 'Weight is required.';
    const purchasePrice = toOptionalNumber(form.purchasePrice);
    if (form.purchasePrice.trim() && (purchasePrice === null || purchasePrice < 0)) errors.purchasePrice = 'Enter a valid purchasing price.';
    const tax = toOptionalNumber(form.tax);
    if (form.tax.trim() && (tax === null || tax < 0)) errors.tax = 'Enter a valid tax amount.';
    if (form.saleGstRate.trim() && toOptionalRate(form.saleGstRate) === null) errors.saleGstRate = 'Enter a valid GST percentage.';
    const transportationCost = toOptionalNumber(form.transportationCost);
    if (form.transportationCost.trim() && (transportationCost === null || transportationCost < 0)) errors.transportationCost = 'Enter a valid transportation cost.';
    if (form.lowStockAlertQty.trim() && toOptionalThreshold(form.lowStockAlertQty) === null) errors.lowStockAlertQty = 'Enter a valid alert quantity.';
    if (form.skuMode === 'manual' && !form.sku.trim()) errors.sku = 'Enter a SKU or switch to Auto.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Add product ───────────────────────────────────────────────────────────
  const handleAddProduct = useCallback(async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setApiError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shopId,
          name: form.name.trim(),
          description: form.description.trim(),
          price:       Number(form.price),
          quantity:    Number(form.quantity),
          sku:         form.skuMode === 'manual' ? form.sku.trim() : '',
          hsnCode:     form.hsnCode.trim(),
          sourceState: form.sourceState.trim(),
          sourceDistrict: form.sourceDistrict.trim(),
          gauge:       form.gauge.trim(),
          weight:      form.weight.trim(),
          purchasePrice: toOptionalNumber(form.purchasePrice),
          purchaseDate: form.purchaseDate || null,
          tax:         toOptionalNumber(form.tax),
          saleGstRate: toOptionalRate(form.saleGstRate) ?? 0,
          transportationCost: toOptionalNumber(form.transportationCost),
          lowStockAlertQty: toOptionalThreshold(form.lowStockAlertQty),
          mfgDate:     form.mfgDate    || null,
          expiryDate:  form.expiryDate || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setApiError(body.error ?? 'Failed to create product.'); return; }
      setForm(EMPTY_FORM);
      setFormErrors({});
      setNameSuggestions([]);
      setShowSuggestions(false);
      setPrintTarget({
        productId: body.product._id,
        productName: body.product.name,
        sku: body.product.sku,
        qty: Number(form.quantity),
        totalQty: body.product.totalQty,
        price: body.product.price,
        barcodePrintUrl: body.barcodePrintUrl ?? `/api/products/${body.product._id}/barcodes`,
        restocked: body.restocked ?? false,
      });
      setPage(1); setSortKey('createdAt'); setSortDir('desc');
      fetchProducts();
    } catch { setApiError('Network error. Please try again.'); }
    finally { setIsSubmitting(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, fetchProducts, shopId]);

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (p: Product) => {
    setEditTarget(p);
    const toDateInput = (d?: string | null) => d ? new Date(d).toISOString().split('T')[0] : '';
    setEditState({
      name: p.name,
      price: String(p.price),
      totalQty: String(p.totalQty),
      availableQty: String(p.availableQty),
      description: p.description,
      sku: p.sku,
      hsnCode: p.hsnCode ?? '',
      sourceState: p.sourceState ?? '',
      sourceDistrict: p.sourceDistrict ?? '',
      gauge: p.gauge ?? '',
      weight: p.weight ?? '',
      purchasePrice: String(p.purchasePrice ?? ''),
      purchaseDate: p.purchaseDate ?? '',
      tax: String(p.tax ?? ''),
      saleGstRate: String(p.saleGstRate ?? ''),
      transportationCost: String(p.transportationCost ?? ''),
      lowStockAlertQty: String(p.lowStockAlertQty ?? ''),
      mfgDate: toDateInput(p.mfgDate),
      expiryDate: toDateInput(p.expiryDate),
    });
    setEditErrors({});
    setEditApiError('');
  };

  const validateEdit = (): boolean => {
    const errors: Partial<Record<keyof EditState, string>> = {};
    if (!editState.name.trim()) errors.name = 'Required.';
    const p = Number(editState.price);
    if (isNaN(p) || p < 0) errors.price = 'Invalid price.';
    const tq = Number(editState.totalQty);
    if (isNaN(tq) || tq < 0) errors.totalQty = 'Invalid.';
    const aq = Number(editState.availableQty);
    if (isNaN(aq) || aq < 0 || aq > tq) errors.availableQty = 'Must be ≤ total qty.';
    if (!editState.gauge.trim()) errors.gauge = 'Required.';
    if (!editState.weight.trim()) errors.weight = 'Required.';
    const purchasePrice = Number(editState.purchasePrice);
    if (isNaN(purchasePrice) || purchasePrice < 0) errors.purchasePrice = 'Invalid.';
    if (!editState.purchaseDate) errors.purchaseDate = 'Required.';
    const tax = Number(editState.tax);
    if (isNaN(tax) || tax < 0) errors.tax = 'Invalid.';
    if (editState.saleGstRate.trim() && toOptionalRate(editState.saleGstRate) === null) errors.saleGstRate = 'Invalid.';
    const transportationCost = Number(editState.transportationCost);
    if (isNaN(transportationCost) || transportationCost < 0) errors.transportationCost = 'Invalid.';
    if (editState.lowStockAlertQty.trim() && toOptionalThreshold(editState.lowStockAlertQty) === null) errors.lowStockAlertQty = 'Invalid.';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !validateEdit()) return;
    setIsSavingEdit(true);
    setEditApiError('');
    try {
      const res = await fetch(`/api/products/${editTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editState.name.trim(),
          description: editState.description.trim(),
          price: Number(editState.price),
          totalQty: Number(editState.totalQty),
          availableQty: Number(editState.availableQty),
          sku: editState.sku.trim(),
          hsnCode: editState.hsnCode.trim(),
          sourceState: editState.sourceState.trim(),
          sourceDistrict: editState.sourceDistrict.trim(),
          gauge: editState.gauge.trim(),
          weight: editState.weight.trim(),
          purchasePrice: Number(editState.purchasePrice),
          purchaseDate: editState.purchaseDate || null,
          tax: Number(editState.tax),
          saleGstRate: toOptionalRate(editState.saleGstRate) ?? 0,
          transportationCost: Number(editState.transportationCost),
          lowStockAlertQty: toOptionalThreshold(editState.lowStockAlertQty),
          mfgDate: editState.mfgDate || null,
          expiryDate: editState.expiryDate || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setEditApiError(body.error ?? 'Failed to update product.'); return; }
      setProducts(prev => prev.map(p => p._id === editTarget._id ? { ...p, ...body.product } : p));
      fetchProducts();
      setEditTarget(null);
    } catch { setEditApiError('Network error. Please try again.'); }
    finally { setIsSavingEdit(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const body = await res.json().catch(() => ({})); alert(body.error ?? 'Failed to delete product.'); return; }
      setDeleteTarget(null);
      const newCount = totalCount - 1;
      const newPages = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      if (page > newPages) setPage(newPages); else fetchProducts();
    } catch { alert('Network error. Please try again.'); }
    finally { setIsDeleting(false); }
  };

  const safePage = Math.min(page, Math.max(1, totalPages));

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-emerald-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-emerald-600' : 'text-slate-300'} />
    </span>
  );

  const outOfStock    = useMemo(() => products.filter(p => p.availableQty === 0).length, [products]);
  const lowStockCount = useMemo(() => products.filter(p => p.availableQty > 0 && p.availableQty <= (p.lowStockAlertQty ?? defaultLowStockThreshold)).length, [defaultLowStockThreshold, products]);
  const fmtValue = (n: number) => n >= 1_000_000 ? `₹${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `₹${(n / 1_000).toFixed(1)}k` : `₹${n.toFixed(2)}`;

  // Expiry helpers
  const now30 = useMemo(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), []);
  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const expiringSoonCount = useMemo(() => products.filter(p => { if (!p.expiryDate) return false; const d = new Date(p.expiryDate); return d >= todayStart && d <= now30; }).length, [products, now30, todayStart]);

  const getExpiryBadge = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    const d = new Date(expiryDate);
    if (d < todayStart) return { label: 'Expired', cls: 'bg-red-50 text-red-600 border-red-200' };
    if (d <= now30) return { label: `${Math.ceil((d.getTime() - todayStart.getTime()) / 86400000)}d`, cls: 'bg-amber-50 text-amber-600 border-amber-200' };
    return { label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }), cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  };

  return (
    <ShopAdminLayout activeRoute="/shop-admin/products">
      <div className="space-y-6 animate-fade-in">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Products</h1>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{shopName}</span>
            </div>
            <p className="text-sm text-slate-500">Add and manage products at your shop</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'My Products', value: stats.totalProducts, icon: 'CubeIcon', color: 'emerald', cls: 'text-slate-800', sub: 'In this shop' },
            { label: 'Low Stock', value: lowStockCount, icon: 'ExclamationTriangleIcon', color: 'amber', cls: 'text-amber-600', sub: 'Below threshold' },
            { label: 'Out of Stock', value: outOfStock, icon: 'XCircleIcon', color: 'red', cls: 'text-red-600', sub: 'Needs restocking' },
            { label: 'Expiring Soon', value: expiringSoonCount, icon: 'ClockIcon', color: 'orange', cls: 'text-orange-600', sub: 'Within 30 days' },
            { label: 'Stock Value', value: fmtValue(stats.catalogValue), icon: 'CurrencyRupeeIcon', color: 'emerald', cls: 'text-slate-800', sub: 'Current stock value' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 flex items-center justify-center`}>
                  <Icon name={card.icon} size={16} className={`text-${card.color}-600`} />
                </div>
              </div>
              {isLoading
                ? <div className="h-8 w-16 bg-slate-100 rounded animate-pulse mb-1" />
                : <p className={`text-3xl font-bold ${card.cls}`}>{card.value}</p>
              }
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Add Product Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Icon name="PlusCircleIcon" size={17} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Add New Product</h2>
              <p className="text-xs text-slate-400">Fill in the details below — product will be added to <span className="font-semibold text-emerald-600">{shopName}</span></p>
            </div>
          </div>

          <div className="px-6 py-5">
            {apiError && (
              <div className="mb-4 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 shrink-0" />{apiError}
              </div>
            )}

            {/* Row 1: Name, Price, Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Name with autocomplete */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input ref={nameInputRef} type="text" placeholder="e.g. Samsung 55″ QLED TV" value={form.name} autoComplete="off"
                    onChange={e => { setField('name', e.target.value); fetchNameSuggestions(e.target.value); }}
                    onFocus={() => { if (nameSuggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className={`${inputBase} ${formErrors.name ? 'border-red-300 focus:border-red-400' : ''}`} />
                  {showSuggestions && nameSuggestions.length > 0 && (
                    <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                      {nameSuggestions.map(s => (
                        <li key={s._id}
                          onMouseDown={() => {
                            setField('name', s.name);
                            if (s.description) setField('description', s.description);
                            setField('price', String(s.price));
                            setShowSuggestions(false); setNameSuggestions([]);
                            setTimeout(() => quantityInputRef.current?.focus(), 50);
                          }}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-emerald-50 cursor-pointer group transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-700 truncate">{s.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{s.sku}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xs font-semibold text-slate-600">₹{s.price.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">{s.totalQty} in stock</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {formErrors.name && <p className="mt-1 text-[11px] text-red-500">{formErrors.name}</p>}
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Price (₹, GST Included) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  className={`${inputBase} ${formErrors.price ? 'border-red-300 focus:border-red-400' : ''}`} />
                {formErrors.price && <p className="mt-1 text-[11px] text-red-500">{formErrors.price}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity (units) <span className="text-red-500">*</span></label>
                <input ref={quantityInputRef} type="number" min="1" step="1" placeholder="e.g. 100" value={form.quantity}
                  onChange={e => setField('quantity', e.target.value)}
                  className={`${inputBase} ${formErrors.quantity ? 'border-red-300 focus:border-red-400' : ''}`} />
                {formErrors.quantity && <p className="mt-1 text-[11px] text-red-500">{formErrors.quantity}</p>}
              </div>
            </div>

            {/* Row 2: Description, SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea rows={2} placeholder="Optional — size, colour, variant details…" value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  className={`${inputBase} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  SKU Code
                  <span className="ml-2 inline-flex rounded-lg overflow-hidden border border-slate-200 text-[10px] font-semibold">
                    <button type="button" onClick={() => setField('skuMode', 'auto')}
                      className={`px-2 py-0.5 transition-colors ${form.skuMode === 'auto' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Auto</button>
                    <button type="button" onClick={() => setField('skuMode', 'manual')}
                      className={`px-2 py-0.5 transition-colors ${form.skuMode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Manual</button>
                  </span>
                </label>
                {form.skuMode === 'auto' ? (
                  <div className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono select-none">Auto-generated on save</div>
                ) : (
                  <>
                    <input type="text" placeholder="e.g. MY-SKU-0042" value={form.sku}
                      onChange={e => setField('sku', e.target.value.toUpperCase())}
                      className={`${inputBase} font-mono ${formErrors.sku ? 'border-red-300 focus:border-red-400' : ''}`} />
                    {formErrors.sku && <p className="mt-1 text-[11px] text-red-500">{formErrors.sku}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Row 3: Gauge, Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Gauge <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 18 Gauge"
                  value={form.gauge}
                  onChange={e => setField('gauge', e.target.value)}
                  className={`${inputBase} ${formErrors.gauge ? 'border-red-300 focus:border-red-400' : ''}`}
                />
                {formErrors.gauge && <p className="mt-1 text-[11px] text-red-500">{formErrors.gauge}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Weight <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 450 gm"
                  value={form.weight}
                  onChange={e => setField('weight', e.target.value)}
                  className={`${inputBase} ${formErrors.weight ? 'border-red-300 focus:border-red-400' : ''}`}
                />
                {formErrors.weight && <p className="mt-1 text-[11px] text-red-500">{formErrors.weight}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">HSN Code <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. 732393"
                  value={form.hsnCode}
                  onChange={e => setField('hsnCode', e.target.value)}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source State <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={form.sourceState}
                  onChange={e => setField('sourceState', e.target.value)}
                  list="shopadmin-source-state-options"
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source District <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={form.sourceDistrict}
                  onChange={e => setField('sourceDistrict', e.target.value)}
                  list="shopadmin-source-district-options"
                  className={inputBase}
                />
              </div>
            </div>

            {/* Row 4: Purchase details */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Purchase Details</h3>
                  <p className="text-xs text-slate-400">Optional for shop admin — superadmin can complete missing cost details later</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purchasing Price (₹) <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.purchasePrice}
                    onChange={e => setField('purchasePrice', e.target.value)}
                    className={`${inputBase} ${formErrors.purchasePrice ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                  {formErrors.purchasePrice && <p className="mt-1 text-[11px] text-red-500">{formErrors.purchasePrice}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purchasing Date <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={e => setField('purchaseDate', e.target.value)}
                    className={`${inputBase} ${formErrors.purchaseDate ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                  {formErrors.purchaseDate && <p className="mt-1 text-[11px] text-red-500">{formErrors.purchaseDate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tax (₹) <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.tax}
                    onChange={e => setField('tax', e.target.value)}
                    className={`${inputBase} ${formErrors.tax ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                  {formErrors.tax && <p className="mt-1 text-[11px] text-red-500">{formErrors.tax}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Included GST (%) <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 18"
                    value={form.saleGstRate}
                    onChange={e => setField('saleGstRate', e.target.value)}
                    className={`${inputBase} ${formErrors.saleGstRate ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                  {formErrors.saleGstRate && <p className="mt-1 text-[11px] text-red-500">{formErrors.saleGstRate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Transportation Cost (₹) <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.transportationCost}
                    onChange={e => setField('transportationCost', e.target.value)}
                    className={`${inputBase} ${formErrors.transportationCost ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                  {formErrors.transportationCost && <p className="mt-1 text-[11px] text-red-500">{formErrors.transportationCost}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Low Stock Alert Qty <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={`Defaults to ${defaultLowStockThreshold}`}
                    value={form.lowStockAlertQty}
                    onChange={e => setField('lowStockAlertQty', e.target.value)}
                    className={`${inputBase} ${formErrors.lowStockAlertQty ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                  {formErrors.lowStockAlertQty && <p className="mt-1 text-[11px] text-red-500">{formErrors.lowStockAlertQty}</p>}
                </div>
              </div>
            </div>

            {/* Row 3: MFG Date, Expiry Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  MFG Date
                  <span className="ml-1.5 text-[10px] font-normal text-slate-400">(optional)</span>
                </label>
                <input type="date" value={form.mfgDate} onChange={e => setField('mfgDate', e.target.value)}
                  className={inputBase} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Expiry Date
                  <span className="ml-1.5 text-[10px] font-normal text-slate-400">(optional — skip for electronics, etc.)</span>
                </label>
                <input type="date" value={form.expiryDate} onChange={e => setField('expiryDate', e.target.value)}
                  className={`${inputBase} ${form.expiryDate && new Date(form.expiryDate) < new Date() ? 'border-red-300 focus:border-red-400' : ''}`} />
                {form.expiryDate && new Date(form.expiryDate) < new Date() && (
                  <p className="mt-1 text-[11px] text-red-500">Date is in the past — product may already be expired.</p>
                )}
              </div>
            </div>

            {/* Submit row */}
            <div className="flex items-center gap-3">
              <button onClick={handleAddProduct} disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
                {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon name="PlusIcon" size={16} className="text-white" />}
                Add Product
              </button>
              <button type="button" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setApiError(''); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                Clear
              </button>
              <p className="text-xs text-slate-400 ml-1">Product is locked to your shop only.</p>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Product List</h3>
              <p className="text-xs text-slate-400 mt-0.5">{isLoading ? 'Loading…' : `${totalCount} product${totalCount !== 1 ? 's' : ''} found`}</p>
            </div>
            {/* Expiry filter pills */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {([['all', 'All'], ['expiring-soon', '⏳ Expiring Soon'], ['expired', '🔴 Expired']] as [ExpiryFilter, string][]).map(([val, lbl]) => (
                <button key={val} onClick={() => { setExpiryFilter(val); setPage(1); }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${expiryFilter === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}>{lbl}</button>
              ))}
            </div>
            <div className="relative w-60">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Search name or SKU…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Icon name="XMarkIcon" size={13} />
                </button>
              )}
            </div>
            <button onClick={() => fetchProducts()} disabled={isLoading}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-40" title="Refresh">
              <Icon name="ArrowPathIcon" size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadError && (
            <div className="flex items-center gap-2.5 px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
              <Icon name="ExclamationCircleIcon" size={15} className="text-red-500 shrink-0" />{loadError}
              <button onClick={fetchProducts} className="ml-auto text-xs font-semibold underline">Retry</button>
            </div>
          )}

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {([
                    { key: 'sku', label: 'SKU', sortable: false },
                    { key: 'name', label: 'Product Name', sortable: true },
                    { key: 'price', label: 'Price', sortable: true },
                    { key: 'totalQty', label: 'Total Qty', sortable: true },
                    { key: 'availableQty', label: 'Available Qty', sortable: true },
                    { key: 'expiryDate', label: 'Expiry', sortable: true },
                    { key: 'createdAt', label: 'Added', sortable: true },
                    { key: 'actions', label: '', sortable: false },
                  ] as { key: string; label: string; sortable: boolean }[]).map(col => (
                    <th key={`th-${col.key}`}
                      onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''} ${col.key === 'sku' ? 'pl-5' : ''} ${col.key === 'name' ? 'min-w-[200px]' : ''}`}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && <SortIcon col={col.key as SortKey} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-full max-w-[120px]" /></td>
                      ))}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Icon name="CubeIcon" size={22} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">No products found</p>
                      <p className="text-xs text-slate-400">{search ? 'Try a different search term.' : 'Add your first product using the form above.'}</p>
                    </div>
                  </td></tr>
                ) : (
                  products.map(product => {
                    const effectiveThreshold = product.lowStockAlertQty ?? defaultLowStockThreshold;
                    const isLowStock = product.availableQty > 0 && product.availableQty <= effectiveThreshold;
                    const stockColor = product.availableQty === 0 ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600';
                    return (
                      <tr key={product._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="pl-5 pr-4 py-3">
                          <span className="text-[11px] font-mono text-slate-400">{product.sku}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                              <Icon name="CubeIcon" size={14} className="text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate max-w-[240px]">{product.name}</p>
                                {product.purchaseDetailsStatus === 'pending' && (
                                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    Details Pending
                                  </span>
                                )}
                              </div>
                              {product.description && <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{product.description}</p>}
                              {product.purchaseDetailsStatus === 'pending' && (
                                <p className="mt-0.5 text-[10px] text-amber-600 truncate max-w-[240px]">
                                  Missing: {(product.purchaseDetailsMissingFields ?? []).join(', ')}
                                </p>
                              )}
                              {(product.gauge || product.weight) && (
                                <p className="mt-0.5 text-[10px] text-slate-400 truncate max-w-[240px]">
                                  {[product.gauge, product.weight].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                          <div>₹{product.price.toFixed(2)}</div>
                          {(product.purchasePrice || product.tax || product.transportationCost) ? (
                            <div className="mt-0.5 text-[10px] text-slate-400 font-normal">
                              P: ₹{(product.purchasePrice ?? 0).toFixed(2)}{' · '}
                              T: ₹{(product.tax ?? 0).toFixed(2)}{' · '}
                              C: ₹{(product.transportationCost ?? 0).toFixed(2)}
                            </div>
                          ) : null}
                          <div className="mt-0.5 text-[10px] text-slate-400 font-normal">Included GST: {(product.saleGstRate ?? 0).toFixed(2)}%</div>
                          {product.hsnCode ? <div className="mt-0.5 text-[10px] text-slate-400 font-normal">HSN: {product.hsnCode}</div> : null}
                          {(product.sourceState || product.sourceDistrict) ? <div className="mt-0.5 text-[10px] text-slate-400 font-normal">Source: {[product.sourceDistrict, product.sourceState].filter(Boolean).join(', ')}</div> : null}
                          <div className="mt-0.5 text-[10px] text-slate-400 font-normal">Alert: {effectiveThreshold} unit{effectiveThreshold === 1 ? '' : 's'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 tabular-nums">{product.totalQty.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold tabular-nums ${stockColor}`}>{product.availableQty.toLocaleString()}</span>
                            {product.availableQty === 0 && <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Out</span>}
                            {isLowStock && <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">Low</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const badge = getExpiryBadge(product.expiryDate);
                            if (!badge) return <span className="text-xs text-slate-300">—</span>;
                            return <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(product.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all" title="Edit product">
                              <Icon name="PencilSquareIcon" size={15} />
                            </button>
                            <button onClick={() => setPrintTarget({ productId: product._id, productName: product.name, sku: product.sku, qty: product.totalQty, totalQty: product.totalQty, price: product.price, barcodePrintUrl: `/api/products/${product._id}/barcodes`, restocked: false })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all" title="Print barcodes">
                              <Icon name="PrinterIcon" size={15} />
                            </button>
                            <button onClick={() => setDeleteTarget(product)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Delete product">
                              <Icon name="TrashIcon" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Showing <span className="font-medium text-slate-600">{totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)}</span> of <span className="font-medium text-slate-600">{totalCount.toLocaleString()}</span> products
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1 || isLoading}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pg: number;
                if (totalPages <= 7) pg = i + 1;
                else if (safePage <= 4) pg = i + 1;
                else if (safePage >= totalPages - 3) pg = totalPages - 6 + i;
                else pg = safePage - 3 + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)} disabled={isLoading}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${safePage === pg ? 'bg-emerald-600 border-emerald-600 text-white' : 'text-slate-500 border-slate-200 hover:bg-white disabled:opacity-40'}`}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages || isLoading}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print Barcodes Modal ──────────────────────────────────────────────── */}
      {printTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Icon name="PrinterIcon" size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {printTarget.restocked ? 'Stock Updated — Print New Barcodes' : 'Product Added — Print Barcodes'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {printTarget.restocked ? `Total stock is now ${printTarget.totalQty} units` : 'Ready to print barcode labels'}
                  </p>
                </div>
              </div>
              <button onClick={() => setPrintTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Product info */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-slate-800">{printTarget.productName}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="font-mono">{printTarget.sku}</span>
                  <span>₹{printTarget.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Label count */}
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Icon name="TagIcon" size={16} className="text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700">
                  {printTarget.restocked
                    ? <><span className="font-bold">{printTarget.qty}</span> new label{printTarget.qty !== 1 ? 's' : ''} for units just added.<br /><span className="text-emerald-500 text-xs">({printTarget.totalQty} total units in stock)</span></>
                    : <><span className="font-bold">{printTarget.qty}</span> barcode label{printTarget.qty !== 1 ? 's' : ''} will be generated — one per unit.</>}
                </p>
              </div>

              {/* ── QZ Tray status block ─────────────────────────────────────── */}
              <div className={`rounded-xl border p-4 space-y-3 ${qzStatus === 'connected' ? 'bg-emerald-50 border-emerald-200' :
                  qzStatus === 'error' ? 'bg-red-50 border-red-200' :
                    qzStatus === 'connecting' ? 'bg-blue-50 border-blue-200' :
                      'bg-slate-50 border-slate-200'
                }`}>

                {/* Status row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {qzStatus === 'connecting' && (
                      <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
                    )}
                    {qzStatus === 'connected' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    )}
                    {qzStatus === 'error' && (
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    )}
                    {qzStatus === 'idle' && (
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    )}
                    <span className={`text-xs font-semibold ${qzStatus === 'connected' ? 'text-emerald-700' :
                        qzStatus === 'error' ? 'text-red-700' :
                          qzStatus === 'connecting' ? 'text-blue-700' :
                            'text-slate-600'
                      }`}>
                      {qzStatus === 'connected' ? 'QZ Tray connected' :
                        qzStatus === 'connecting' ? 'Connecting to QZ Tray…' :
                          qzStatus === 'error' ? 'QZ Tray not available' :
                            'QZ Tray'}
                    </span>
                  </div>
                  {(qzStatus === 'error' || qzStatus === 'idle') && (
                    <button
                      onClick={handleQzReconnect}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                    >
                      Retry
                    </button>
                  )}
                </div>

                {/* Error message */}
                {qzStatus === 'error' && qzError && (
                  <p className="text-xs text-red-600">{qzError}</p>
                )}

                {/* Not installed help */}
                {qzStatus === 'error' && (
                  <p className="text-xs text-slate-500">
                    QZ Tray must be running on this computer.{' '}
                    <a
                      href="https://qz.io/download/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      Download QZ Tray
                    </a>
                    , install it, then click Retry.
                  </p>
                )}

                {/* Printer selector when connected */}
                {qzStatus === 'connected' && qzPrinters.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-emerald-800">
                      Printer
                    </label>
                    <select
                      value={qzPrinter}
                      onChange={e => setQzPrinter(e.target.value)}
                      className="w-full text-xs border border-emerald-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      {qzPrinters.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-emerald-600">
                      Labels will print directly — no dialog, no PDF.
                    </p>
                  </div>
                )}

                {/* Connected but no printers found */}
                {qzStatus === 'connected' && qzPrinters.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No printers found. Make sure your Shreyans Barcode Printer is connected and its driver is installed.
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Each label contains a unique Code 128 barcode. Sized for 2″×1″ thermal paper.
              </p>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setPrintTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white transition-all"
              >
                Print Later
              </button>
              <button
                onClick={() => handlePrintLabels(printTarget.barcodePrintUrl)}
                disabled={isPrinting || qzStatus === 'connecting' || (qzStatus === 'connected' && !qzPrinter)}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {isPrinting ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Printing…</>
                ) : qzStatus === 'connected' ? (
                  <><Icon name="PrinterIcon" size={15} className="text-white" />Print Direct — {printTarget.qty} Label{printTarget.qty !== 1 ? 's' : ''}</>
                ) : (
                  <><Icon name="PrinterIcon" size={15} className="text-white" />Print {printTarget.qty} Label{printTarget.qty !== 1 ? 's' : ''} (via dialog)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Edit Product</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{editTarget.sku}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {editApiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <Icon name="ExclamationCircleIcon" size={14} className="text-red-500 shrink-0" />{editApiError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name <span className="text-red-500">*</span></label>
                <input type="text" value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                  className={`${inputBase} ${editErrors.name ? 'border-red-300' : ''}`} />
                {editErrors.name && <p className="mt-1 text-[11px] text-red-500">{editErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Price (₹, GST Included) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.01" value={editState.price} onChange={e => setEditState(s => ({ ...s, price: e.target.value }))}
                    className={`${inputBase} ${editErrors.price ? 'border-red-300' : ''}`} />
                  {editErrors.price && <p className="mt-1 text-[11px] text-red-500">{editErrors.price}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU Code</label>
                  <input type="text" value={editState.sku} onChange={e => setEditState(s => ({ ...s, sku: e.target.value.toUpperCase() }))}
                    className={`${inputBase} font-mono`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gauge <span className="text-red-500">*</span></label>
                  <input type="text" value={editState.gauge} onChange={e => setEditState(s => ({ ...s, gauge: e.target.value }))}
                    className={`${inputBase} ${editErrors.gauge ? 'border-red-300' : ''}`} />
                  {editErrors.gauge && <p className="mt-1 text-[11px] text-red-500">{editErrors.gauge}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Weight <span className="text-red-500">*</span></label>
                  <input type="text" value={editState.weight} onChange={e => setEditState(s => ({ ...s, weight: e.target.value }))}
                    className={`${inputBase} ${editErrors.weight ? 'border-red-300' : ''}`} />
                  {editErrors.weight && <p className="mt-1 text-[11px] text-red-500">{editErrors.weight}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Total Quantity <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="1" value={editState.totalQty} onChange={e => setEditState(s => ({ ...s, totalQty: e.target.value }))}
                    className={`${inputBase} ${editErrors.totalQty ? 'border-red-300' : ''}`} />
                  {editErrors.totalQty && <p className="mt-1 text-[11px] text-red-500">{editErrors.totalQty}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Available Qty <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="1" value={editState.availableQty} onChange={e => setEditState(s => ({ ...s, availableQty: e.target.value }))}
                    className={`${inputBase} ${editErrors.availableQty ? 'border-red-300' : ''}`} />
                  {editErrors.availableQty && <p className="mt-1 text-[11px] text-red-500">{editErrors.availableQty}</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Purchase Details</h4>
                  <p className="text-xs text-slate-400">Useful for utensil stock costing</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Purchasing Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={editState.purchasePrice} onChange={e => setEditState(s => ({ ...s, purchasePrice: e.target.value }))}
                      className={`${inputBase} ${editErrors.purchasePrice ? 'border-red-300' : ''}`} />
                    {editErrors.purchasePrice && <p className="mt-1 text-[11px] text-red-500">{editErrors.purchasePrice}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Purchasing Date <span className="text-red-500">*</span></label>
                    <input type="date" value={editState.purchaseDate} onChange={e => setEditState(s => ({ ...s, purchaseDate: e.target.value }))}
                      className={`${inputBase} ${editErrors.purchaseDate ? 'border-red-300' : ''}`} />
                    {editErrors.purchaseDate && <p className="mt-1 text-[11px] text-red-500">{editErrors.purchaseDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tax (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={editState.tax} onChange={e => setEditState(s => ({ ...s, tax: e.target.value }))}
                      className={`${inputBase} ${editErrors.tax ? 'border-red-300' : ''}`} />
                    {editErrors.tax && <p className="mt-1 text-[11px] text-red-500">{editErrors.tax}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">HSN Code <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="text" value={editState.hsnCode} onChange={e => setEditState(s => ({ ...s, hsnCode: e.target.value }))}
                      placeholder="e.g. 732393" className={inputBase} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Source State <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="text" value={editState.sourceState} onChange={e => setEditState(s => ({ ...s, sourceState: e.target.value }))}
                      placeholder="e.g. Maharashtra" list="shopadmin-source-state-options" className={inputBase} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Source District <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="text" value={editState.sourceDistrict} onChange={e => setEditState(s => ({ ...s, sourceDistrict: e.target.value }))}
                      placeholder="e.g. Pune" list="shopadmin-edit-source-district-options" className={inputBase} />
                  </div>
                  <div>

                  <datalist id="shopadmin-source-state-options">
                    {sourceStateOptions.map(state => <option key={state} value={state} />)}
                  </datalist>
                  <datalist id="shopadmin-source-district-options">
                    {sourceDistrictOptions.map(district => <option key={district} value={district} />)}
                  </datalist>
                  <datalist id="shopadmin-edit-source-district-options">
                    {editSourceDistrictOptions.map(district => <option key={district} value={district} />)}
                  </datalist>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Included GST (%) <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="number" min="0" max="100" step="0.01" value={editState.saleGstRate} onChange={e => setEditState(s => ({ ...s, saleGstRate: e.target.value }))}
                      className={`${inputBase} ${editErrors.saleGstRate ? 'border-red-300' : ''}`} />
                    {editErrors.saleGstRate && <p className="mt-1 text-[11px] text-red-500">{editErrors.saleGstRate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Transportation Cost (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={editState.transportationCost} onChange={e => setEditState(s => ({ ...s, transportationCost: e.target.value }))}
                      className={`${inputBase} ${editErrors.transportationCost ? 'border-red-300' : ''}`} />
                    {editErrors.transportationCost && <p className="mt-1 text-[11px] text-red-500">{editErrors.transportationCost}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Low Stock Alert Qty <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="number" min="0" step="1" value={editState.lowStockAlertQty} onChange={e => setEditState(s => ({ ...s, lowStockAlertQty: e.target.value }))}
                      placeholder={`Defaults to ${defaultLowStockThreshold}`} className={`${inputBase} ${editErrors.lowStockAlertQty ? 'border-red-300' : ''}`} />
                    {editErrors.lowStockAlertQty && <p className="mt-1 text-[11px] text-red-500">{editErrors.lowStockAlertQty}</p>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea rows={2} value={editState.description} onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                  className={`${inputBase} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    MFG Date
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">(optional)</span>
                  </label>
                  <input type="date" value={editState.mfgDate} onChange={e => setEditState(s => ({ ...s, mfgDate: e.target.value }))}
                    className={inputBase} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Expiry Date
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">(optional)</span>
                  </label>
                  <input type="date" value={editState.expiryDate} onChange={e => setEditState(s => ({ ...s, expiryDate: e.target.value }))}
                    className={`${inputBase} ${editState.expiryDate && new Date(editState.expiryDate) < new Date() ? 'border-red-300' : ''}`} />
                  {editState.expiryDate && new Date(editState.expiryDate) < new Date() && (
                    <p className="mt-1 text-[11px] text-amber-500">This product is already expired.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setEditTarget(null)} disabled={isSavingEdit}
                className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white transition-all">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSavingEdit}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all">
                {isSavingEdit ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon name="CheckIcon" size={15} className="text-white" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="ExclamationTriangleIcon" size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Delete Product</h3>
                  <p className="text-sm text-slate-500 mt-1">Are you sure you want to delete <span className="font-semibold text-slate-700">"{deleteTarget.name}"</span>? This cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white transition-all">Cancel</button>
              <button onClick={handleConfirmDelete} disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all">
                {isDeleting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon name="TrashIcon" size={15} className="text-white" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ShopAdminLayout>
  );
}
