'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Reorder Pending';

interface InventoryItem {
  _id:          string;
  sku:          string;
  name:         string;
  price:        number;
  totalQty:     number;
  availableQty: number;
  stockValue:   number;
  stockStatus:  string;
  lastMovedAt:  string;
  totalIn:      number;
  totalOut:     number;
  movementCount:number;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  'in-stock':  { label: 'In Stock',       className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  'low-stock': { label: 'Low Stock',      className: 'bg-amber-50 text-amber-700 border border-amber-200'       },
  'out-of-stock': { label: 'Out of Stock',className: 'bg-red-50 text-red-700 border border-red-200'             },
};

const ITEMS_OPTIONS = [10, 25, 50];
type SortKey = 'name' | 'price' | 'totalQty' | 'availableQty' | 'createdAt';

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
          <td className="pl-5 pr-3 py-3"><div className="w-4 h-4 bg-slate-100 rounded animate-pulse" /></td>
          <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded w-24 animate-pulse" /></td>
          <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded w-40 sm:w-48 animate-pulse" /></td>
          <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded w-12 animate-pulse" /></td>
          <td className="px-3 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded w-12 animate-pulse" /></td>
          <td className="px-3 py-3 hidden md:table-cell"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse" /></td>
          <td className="px-3 py-3 hidden md:table-cell"><div className="h-4 bg-slate-100 rounded w-20 animate-pulse" /></td>
          <td className="px-3 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse" /></td>
          <td className="px-3 py-3"><div className="h-5 bg-slate-100 rounded-full w-16 sm:w-20 animate-pulse" /></td>
          <td className="px-3 py-3 pr-5 hidden sm:table-cell" />
        </tr>
      ))}
    </>
  );
}

export default function InventoryTable() {
  const router = useRouter();
  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey]     = useState<SortKey>('createdAt');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exporting, setExporting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true); setError('');
    const params = new URLSearchParams({
      search, status: statusFilter, page: String(currentPage),
      limit: String(itemsPerPage), sort: sortKey, dir: sortDir,
    });
    try {
      const res  = await fetch(`/api/inventory?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
      setPagination(data.pagination ?? { page: 1, limit: itemsPerPage, total: 0, totalPages: 1 });
    } catch {
      setError('Failed to load inventory. Retrying…');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentPage, itemsPerPage, sortKey, sortDir]);

  useEffect(() => {
    const id = setTimeout(fetchItems, search ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchItems, search]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res  = await fetch('/api/reports?range=30d&export=inventory');
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const cd   = res.headers.get('Content-Disposition') ?? '';
      const fn   = cd.match(/filename="([^"]+)"/)?.[1] ?? 'inventory.csv';
      a.href = url; a.download = fn; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const toggleRow = (id: string) => setSelectedRows(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selectedRows.size === items.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(items.map(i => i._id)));
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  const needAttention = useMemo(() => items.filter(i => i.stockStatus !== 'in-stock').length, [items]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">Inventory Overview</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? <span className="inline-block w-32 h-3 bg-slate-100 rounded animate-pulse" /> : `${pagination.total} products · ${needAttention} need attention`}
            </p>
          </div>
          <button onClick={handleExportCSV} disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all disabled:opacity-50 shrink-0 ml-2">
            <Icon name="ArrowDownTrayIcon" size={13} className={`text-slate-400 ${exporting ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search products, SKUs…" value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2 sm:px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shrink-0">
            <option value="all">All</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-600">
          <Icon name="ExclamationTriangleIcon" size={13} />
          {error}
          <button onClick={fetchItems} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-50 border-b border-indigo-100">
          <span className="text-xs font-semibold text-indigo-700">{selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5">
              <Icon name="ArrowPathIcon" size={12} />Bulk Reorder
            </button>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5">
              <Icon name="ArrowsRightLeftIcon" size={12} />Transfer Stock
            </button>
            <button onClick={() => setSelectedRows(new Set())} className="text-xs text-slate-400 hover:text-slate-600 ml-2">
              <Icon name="XMarkIcon" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="w-10 pl-5 pr-3 py-3 text-left">
                <input type="checkbox" checked={!loading && selectedRows.size === items.length && items.length > 0}
                  onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30" />
              </th>
              {([
                { key: 'sku',          label: 'SKU',          sortable: false, hide: '' },
                { key: 'name',         label: 'Product Name', sortable: true,  hide: '' },
                { key: 'availableQty', label: 'Available',    sortable: true,  hide: '' },
                { key: 'totalQty',     label: 'Total Qty',    sortable: true,  hide: 'hidden lg:table-cell' },
                { key: 'price',        label: 'Unit Price',   sortable: true,  hide: 'hidden md:table-cell' },
                { key: 'stockValue',   label: 'Stock Value',  sortable: false, hide: 'hidden md:table-cell' },
                { key: 'lastMovedAt',  label: 'Last Moved',   sortable: false, hide: 'hidden lg:table-cell' },
                { key: 'stockStatus',  label: 'Status',       sortable: false, hide: '' },
                { key: 'actions',      label: '',             sortable: false, hide: 'hidden sm:table-cell' },
              ] as { key: string; label: string; sortable: boolean; hide: string }[]).map(col => (
                <th key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                  className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap
                    ${col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''}
                    ${col.key === 'name' ? 'min-w-[160px] sm:min-w-[200px]' : ''}
                    ${col.hide}`}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key as SortKey} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <TableSkeleton rows={itemsPerPage} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon name="ArchiveBoxXMarkIcon" size={24} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">No products found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search or filter.</p>
                    {search || statusFilter !== 'all' ? (
                      <button onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        className="text-xs text-indigo-600 hover:underline">Clear filters</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : items.map((item, rowIdx) => {
              const isSelected  = selectedRows.has(item._id);
              const statusCfg   = statusConfig[item.stockStatus] ?? statusConfig['in-stock'];
              const stockPct    = item.totalQty > 0 ? Math.min((item.availableQty / item.totalQty) * 100, 100) : 0;
              const barColor    = item.stockStatus === 'out-of-stock' ? 'bg-red-500' : item.stockStatus === 'low-stock' ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <tr key={item._id}
                  className={`group transition-colors duration-100 ${isSelected ? 'bg-indigo-50/60' : rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'}`}>
                  <td className="pl-5 pr-3 py-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleRow(item._id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30" />
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.sku}</span>
                  </td>
                  <td className="px-3 py-3 min-w-[160px] sm:min-w-[200px]">
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[180px] sm:max-w-[220px]" title={item.name}>{item.name}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`font-tabular font-semibold text-sm ${item.availableQty === 0 ? 'text-red-600' : item.availableQty <= 20 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {item.availableQty.toLocaleString('en-IN')}
                      </span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${stockPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="font-tabular text-xs text-slate-500">{item.totalQty.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="font-tabular text-xs text-slate-600">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="font-tabular text-xs text-slate-600 font-medium">
                      ₹{item.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="text-xs text-slate-400 font-tabular">
                      {new Date(item.lastMovedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 pr-5 hidden sm:table-cell">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button onClick={() => router.push('/dashboard/products')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View product">
                        <Icon name="EyeIcon" size={14} />
                      </button>
                      <button onClick={() => router.push('/dashboard/inventory')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title="View inventory logs">
                        <Icon name="PencilSquareIcon" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500">
            <span>
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{pagination.total}</span>
            </span>
            <div className="flex items-center gap-1">
              <span>Rows:</span>
              <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                {ITEMS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[
              { icon: 'ChevronDoubleLeftIcon',  fn: () => setCurrentPage(1),                                 disabled: currentPage === 1 },
              { icon: 'ChevronLeftIcon',         fn: () => setCurrentPage(p => Math.max(1, p - 1)),          disabled: currentPage === 1 },
              { icon: 'ChevronRightIcon',        fn: () => setCurrentPage(p => Math.min(pagination.totalPages, p + 1)), disabled: currentPage === pagination.totalPages },
              { icon: 'ChevronDoubleRightIcon',  fn: () => setCurrentPage(pagination.totalPages),             disabled: currentPage === pagination.totalPages },
            ].map(({ icon, fn, disabled }, i) => {
              // Insert page numbers between prev/next arrows
              if (i === 2) {
                const pages: number[] = [];
                const tp = pagination.totalPages;
                for (let j = 0; j < Math.min(5, tp); j++) {
                  let p: number;
                  if (tp <= 5) p = j + 1;
                  else if (currentPage <= 3) p = j + 1;
                  else if (currentPage >= tp - 2) p = tp - 4 + j;
                  else p = currentPage - 2 + j;
                  pages.push(p);
                }
                return (
                  <React.Fragment key="pages">
                    {pages.map(p => (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                          ${currentPage === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={fn} disabled={disabled}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={13} />
                    </button>
                  </React.Fragment>
                );
              }
              return (
                <button key={icon} onClick={fn} disabled={disabled}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={13} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
