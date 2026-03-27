'use client';
import React, { useState, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Reorder Pending';

interface InventoryItem {
  id: string;
  barcode: string;
  productName: string;
  category: string;
  quantity: number;
  threshold: number;
  shop: string;
  unitCost: number;
  lastUpdated: string;
  status: StockStatus;
}

const inventoryData: InventoryItem[] = [
  { id: 'inv-001', barcode: 'SKU-7829341', productName: 'Samsung 55" QLED TV (QN55Q80C)', category: 'Electronics', quantity: 2, threshold: 10, shop: 'Ajah', unitCost: 850, lastUpdated: '2026-03-26', status: 'Low Stock' },
  { id: 'inv-002', barcode: 'SKU-4412087', productName: 'Nike Air Max 270 — Men\'s Sz 42', category: 'Apparel', quantity: 0, threshold: 15, shop: 'Lekki', unitCost: 120, lastUpdated: '2026-03-25', status: 'Out of Stock' },
  { id: 'inv-003', barcode: 'SKU-9934512', productName: 'Indomie Noodles 70g Chicken (Carton)', category: 'Food & Bev', quantity: 4, threshold: 20, shop: 'Surulere', unitCost: 18, lastUpdated: '2026-03-26', status: 'Low Stock' },
  { id: 'inv-004', barcode: 'SKU-2281934', productName: 'Hisense 1.5HP Split AC R410A', category: 'Electronics', quantity: 47, threshold: 5, shop: 'Ikeja', unitCost: 620, lastUpdated: '2026-03-24', status: 'In Stock' },
  { id: 'inv-005', barcode: 'SKU-6671209', productName: 'Nestlé Milo 900g Tin', category: 'Food & Bev', quantity: 183, threshold: 30, shop: 'Yaba', unitCost: 9, lastUpdated: '2026-03-26', status: 'In Stock' },
  { id: 'inv-006', barcode: 'SKU-3341827', productName: 'iPhone 15 Pro Silicone Case', category: 'Electronics', quantity: 0, threshold: 8, shop: 'Yaba', unitCost: 35, lastUpdated: '2026-03-25', status: 'Out of Stock' },
  { id: 'inv-007', barcode: 'SKU-8812944', productName: 'Adidas Tiro 23 Training Shorts', category: 'Apparel', quantity: 64, threshold: 20, shop: 'VI', unitCost: 45, lastUpdated: '2026-03-23', status: 'In Stock' },
  { id: 'inv-008', barcode: 'SKU-1120438', productName: 'Dettol Antiseptic Liquid 1L', category: 'Health & Beauty', quantity: 6, threshold: 25, shop: 'Lekki', unitCost: 7, lastUpdated: '2026-03-26', status: 'Reorder Pending' },
  { id: 'inv-009', barcode: 'SKU-5569201', productName: 'Bosch Cordless Drill GSB 18V-55', category: 'Home & Garden', quantity: 18, threshold: 5, shop: 'Ikeja', unitCost: 210, lastUpdated: '2026-03-22', status: 'In Stock' },
  { id: 'inv-010', barcode: 'SKU-7734189', productName: 'Wilson Ultra 100 Tennis Racket', category: 'Sporting Goods', quantity: 3, threshold: 8, shop: 'VI', unitCost: 95, lastUpdated: '2026-03-26', status: 'Low Stock' },
  { id: 'inv-011', barcode: 'SKU-4489023', productName: 'LG 32" Full HD Monitor 32MN500M', category: 'Electronics', quantity: 29, threshold: 8, shop: 'Ajah', unitCost: 280, lastUpdated: '2026-03-25', status: 'In Stock' },
  { id: 'inv-012', barcode: 'SKU-9901234', productName: 'Nivea Men Deep Impact Deodorant 150ml', category: 'Health & Beauty', quantity: 88, threshold: 40, shop: 'Surulere', unitCost: 4, lastUpdated: '2026-03-24', status: 'In Stock' },
];

const statusConfig: Record<StockStatus, { label: string; className: string }> = {
  'In Stock': { label: 'In Stock', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  'Low Stock': { label: 'Low Stock', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'Out of Stock': { label: 'Out of Stock', className: 'bg-red-50 text-red-700 border border-red-200' },
  'Reorder Pending': { label: 'Reorder Pending', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
};

type SortKey = keyof Pick<InventoryItem, 'productName' | 'category' | 'quantity' | 'shop' | 'status' | 'lastUpdated'>;
type SortDir = 'asc' | 'desc';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function InventoryTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'All'>('All');
  const [shopFilter, setShopFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const shops = useMemo(() => ['All', ...Array.from(new Set(inventoryData.map(i => i.shop))).sort()], []);

  const filtered = useMemo(() => {
    let data = [...inventoryData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        i =>
          i.productName.toLowerCase().includes(q) ||
          i.barcode.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') data = data.filter(i => i.status === statusFilter);
    if (shopFilter !== 'All') data = data.filter(i => i.shop === shopFilter);
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, statusFilter, shopFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map(i => i.id)));
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon
        name="ChevronUpIcon"
        size={10}
        className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'}
      />
      <Icon
        name="ChevronDownIcon"
        size={10}
        className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'}
      />
    </span>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Table header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-800">Inventory Overview</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {filtered.length} products · {inventoryData.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length} need attention
          </p>
        </div>

        {/* Search */}
        <div className="relative w-56">
          <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, barcodes…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as StockStatus | 'All'); setCurrentPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        >
          <option value="All">All Statuses</option>
          {Object.keys(statusConfig).map(s => (
            <option key={`status-opt-${s}`} value={s}>{s}</option>
          ))}
        </select>

        {/* Shop filter */}
        <select
          value={shopFilter}
          onChange={e => { setShopFilter(e.target.value); setCurrentPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        >
          {shops.map(s => (
            <option key={`shop-opt-${s}`} value={s}>{s === 'All' ? 'All Shops' : s}</option>
          ))}
        </select>

        <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all">
          <Icon name="ArrowDownTrayIcon" size={13} className="text-slate-400" />
          Export CSV
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 animate-slide-up">
          <span className="text-xs font-semibold text-indigo-700">
            {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5">
              <Icon name="ArrowPathIcon" size={12} />
              Bulk Reorder
            </button>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5">
              <Icon name="ArrowsRightLeftIcon" size={12} />
              Transfer Stock
            </button>
            <button className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1.5">
              <Icon name="TrashIcon" size={12} />
              Delete
            </button>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="text-xs text-slate-400 hover:text-slate-600 ml-2"
            >
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
                <input
                  type="checkbox"
                  checked={selectedRows.size === paginated.length && paginated.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                />
              </th>
              {([
                { key: 'barcode', label: 'Barcode', sortable: false },
                { key: 'productName', label: 'Product Name', sortable: true },
                { key: 'category', label: 'Category', sortable: true },
                { key: 'quantity', label: 'Qty', sortable: true },
                { key: 'threshold', label: 'Threshold', sortable: false },
                { key: 'shop', label: 'Shop', sortable: true },
                { key: 'unitCost', label: 'Unit Cost', sortable: false },
                { key: 'lastUpdated', label: 'Last Updated', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
                { key: 'actions', label: '', sortable: false },
              ] as { key: string; label: string; sortable: boolean }[]).map(col => (
                <th
                  key={`th-${col.key}`}
                  onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                  className={`
                    px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap
                    ${col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''}
                    ${col.key === 'productName' ? 'min-w-[220px]' : ''}
                  `}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key as SortKey} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon name="ArchiveBoxXMarkIcon" size={24} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">No products found</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      No inventory items match your current search or filter criteria. Try adjusting the filters above.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((item, rowIdx) => {
                const isSelected = selectedRows.has(item.id);
                const statusCfg = statusConfig[item.status];
                const stockPct = item.threshold > 0 ? Math.min((item.quantity / item.threshold) * 100, 100) : 100;
                const stockBarColor = item.status === 'Out of Stock' ? 'bg-red-500' : item.status === 'Low Stock' ? 'bg-amber-500' : item.status === 'Reorder Pending' ? 'bg-blue-500' : 'bg-emerald-500';

                return (
                  <tr
                    key={item.id}
                    className={`
                      group transition-colors duration-100
                      ${isSelected ? 'bg-indigo-50/60' : rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'}
                    `}
                  >
                    <td className="pl-5 pr-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.barcode}
                      </span>
                    </td>
                    <td className="px-3 py-3 min-w-[220px]">
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[220px]" title={item.productName}>
                        {item.productName}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`font-tabular font-semibold text-sm ${item.quantity === 0 ? 'text-red-600' : item.quantity <= item.threshold ? 'text-amber-600' : 'text-slate-800'}`}>
                          {item.quantity.toLocaleString()}
                        </span>
                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stockBarColor}`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-tabular text-xs text-slate-400">{item.threshold}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Icon name="BuildingStorefrontIcon" size={12} className="text-slate-400" />
                        {item.shop}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-tabular text-xs text-slate-600">₹{item.unitCost.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-slate-400 font-tabular">
                        {new Date(item.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 pr-5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
                          title="View product details"
                        >
                          <Icon name="EyeIcon" size={14} />
                        </button>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                          title="Edit product"
                        >
                          <Icon name="PencilSquareIcon" size={14} />
                        </button>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
                          title="Delete product — this cannot be undone"
                        >
                          <Icon name="TrashIcon" size={14} />
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
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700">{filtered.length}</span> products
            </span>
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                  <option key={`ipp-${opt}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="First page"
            >
              <Icon name="ChevronDoubleLeftIcon" size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Previous page"
            >
              <Icon name="ChevronLeftIcon" size={13} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => setCurrentPage(page)}
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                    ${currentPage === page
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next page"
            >
              <Icon name="ChevronRightIcon" size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Last page"
            >
              <Icon name="ChevronDoubleRightIcon" size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}