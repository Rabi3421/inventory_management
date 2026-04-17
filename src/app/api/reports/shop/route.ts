import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { SettingsModel } from '@/lib/models/Settings';
import { getInventoryStockStatus } from '@/lib/inventory/thresholds';

/**
 * GET /api/reports/shop
 *
 * Query params:
 *   shopId  — (required) shop to scope all data to
 *   range   — '7d' | '30d' | '90d' | '1y'  (default '30d')
 *   export  — 'inventory' | 'stock'          (triggers CSV download)
 *
 * Returns:
 *   kpi               — catalogValue, totalUnits, availableUnits, totalProducts, outOfStock, lowStock
 *   monthlyMovement   — [{ month, stockIn, stockOut, sales, restocks, txCount }]
 *   stockStatus       — [{ name, value, color }]
 *   topProducts       — top 8 products by stock value for this shop
 *   movementByType    — [{ type, count, totalQty }]
 *   recentActivity    — last 10 log entries for this shop
 *   dailyMovement     — [{ date, stockIn, stockOut }] for short ranges
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const settings = await SettingsModel.findOne({}).lean();
    const defaultThreshold = settings?.lowStockThreshold ?? 20;
    const thresholdExpr = { $ifNull: ['$lowStockAlertQty', defaultThreshold] };

    const { searchParams } = request.nextUrl;
    const shopId     = searchParams.get('shopId')?.trim() ?? '';
    const range      = (searchParams.get('range') ?? '30d') as '7d' | '30d' | '90d' | '1y';
    const exportType = searchParams.get('export');

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    // ── Date range ────────────────────────────────────────────────────────────
    const rangeMs: Record<string, number> = {
      '7d':  7   * 24 * 60 * 60 * 1000,
      '30d': 30  * 24 * 60 * 60 * 1000,
      '90d': 90  * 24 * 60 * 60 * 1000,
      '1y':  365 * 24 * 60 * 60 * 1000,
    };
    const sinceDate = new Date(Date.now() - (rangeMs[range] ?? rangeMs['30d']));

    // ── CSV exports ───────────────────────────────────────────────────────────
    if (exportType === 'inventory') {
      const products = await ProductModel.find({ shopId }).sort({ name: 1 }).lean();
      const rows = [
        ['SKU', 'Product Name', 'Price (₹)', 'Total Qty', 'Available Qty', 'Stock Value (₹)', 'Status'],
        ...products.map(p => {
          const statusKey = getInventoryStockStatus({
            availableQty: p.availableQty,
            lowStockAlertQty: p.lowStockAlertQty ?? null,
          }, defaultThreshold);
          const status = statusKey === 'out-of-stock' ? 'Out of Stock' : statusKey === 'low-stock' ? 'Low Stock' : 'In Stock';
          return [p.sku, `"${p.name}"`, p.price, p.totalQty, p.availableQty, (p.price * p.availableQty).toFixed(2), status];
        }),
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory-${shopId}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (exportType === 'stock') {
      // Get all product _ids for this shop first
      const shopProductIds = await ProductModel.find({ shopId }).distinct('_id');
      const logs = await InventoryLogModel.find({
        productId: { $in: shopProductIds },
        createdAt: { $gte: sinceDate },
      }).sort({ createdAt: -1 }).lean();
      const rows = [
        ['Date', 'Product', 'SKU', 'Type', 'Qty', 'Balance After', 'Note', 'Performed By'],
        ...logs.map(l => [
          new Date(l.createdAt).toISOString().slice(0, 10),
          `"${l.productName}"`, l.productSku, l.type, l.qty, l.balanceAfter, `"${l.note}"`, `"${l.performedBy}"`,
        ]),
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="stock-movements-${shopId}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // ── Get shop product IDs for log joins ─────────────────────────────────
    const shopProductIds = await ProductModel.find({ shopId }).distinct('_id');

    // ── Run all aggregations in parallel ──────────────────────────────────────
    const [
      kpiResult,
      topProducts,
      monthlyMovement,
      movementByType,
      recentActivity,
      dailyMovement,
    ] = await Promise.all([

      // 1. KPI — product stats for this shop
      ProductModel.aggregate([
        { $match: { shopId } },
        {
          $group: {
            _id: null,
            catalogValue:   { $sum: { $multiply: ['$price', '$availableQty'] } },
            totalUnits:     { $sum: '$totalQty' },
            availableUnits: { $sum: '$availableQty' },
            totalProducts:  { $sum: 1 },
            outOfStock:     { $sum: { $cond: [{ $eq: ['$availableQty', 0] }, 1, 0] } },
            lowStock:       { $sum: { $cond: [{ $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', thresholdExpr] }] }, 1, 0] } },
          },
        },
      ]),

      // 2. Top 8 products by stock value for this shop
      ProductModel.aggregate([
        { $match: { shopId, availableQty: { $gt: 0 } } },
        { $project: { name: 1, sku: 1, price: 1, availableQty: 1, stockValue: { $multiply: ['$price', '$availableQty'] } } },
        { $sort: { stockValue: -1 } },
        { $limit: 8 },
      ]),

      // 3. Monthly movement — last 6 months, scoped to shop products
      InventoryLogModel.aggregate([
        {
          $match: {
            productId: { $in: shopProductIds },
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              year:  { $year:  '$createdAt' },
              month: { $month: '$createdAt' },
            },
            stockIn:  { $sum: { $cond: [{ $gt: ['$qty', 0] }, '$qty', 0] } },
            stockOut: { $sum: { $cond: [{ $lt: ['$qty', 0] }, { $abs: '$qty' }, 0] } },
            sales:    { $sum: { $cond: [{ $eq: ['$type', 'sale'] }, { $abs: '$qty' }, 0] } },
            restocks: { $sum: { $cond: [{ $in: ['$type', ['restock', 'purchase']] }, '$qty', 0] } },
            txCount:  { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // 4. Movement by type within date range
      InventoryLogModel.aggregate([
        { $match: { productId: { $in: shopProductIds }, createdAt: { $gte: sinceDate } } },
        {
          $group: {
            _id: '$type',
            count:    { $sum: 1 },
            totalQty: { $sum: { $abs: '$qty' } },
          },
        },
      ]),

      // 5. Recent activity — last 10 log entries for this shop
      InventoryLogModel.find({ productId: { $in: shopProductIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // 6. Daily movement
      InventoryLogModel.aggregate([
        { $match: { productId: { $in: shopProductIds }, createdAt: { $gte: sinceDate } } },
        {
          $group: {
            _id: {
              year:  { $year:  '$createdAt' },
              month: { $month: '$createdAt' },
              day:   { $dayOfMonth: '$createdAt' },
            },
            stockIn:  { $sum: { $cond: [{ $gt: ['$qty', 0] }, '$qty', 0] } },
            stockOut: { $sum: { $cond: [{ $lt: ['$qty', 0] }, { $abs: '$qty' }, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    // ── Format monthly data ───────────────────────────────────────────────────
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const monthSlots: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSlots.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_NAMES[d.getMonth()] });
    }
    const monthMap = new Map(
      (monthlyMovement as { _id: { year: number; month: number }; stockIn: number; stockOut: number; sales: number; restocks: number; txCount: number }[]).map(m =>
        [`${m._id.year}-${m._id.month}`, m]
      )
    );
    const formattedMonthly = monthSlots.map(slot => {
      const key  = `${slot.year}-${slot.month}`;
      const data = monthMap.get(key);
      return {
        month:    slot.label,
        stockIn:  data?.stockIn  ?? 0,
        stockOut: data?.stockOut ?? 0,
        sales:    data?.sales    ?? 0,
        restocks: data?.restocks ?? 0,
        txCount:  data?.txCount  ?? 0,
      };
    });

    // ── Format daily data ─────────────────────────────────────────────────────
    const formattedDaily = (dailyMovement as { _id: { year: number; month: number; day: number }; stockIn: number; stockOut: number }[]).map(d => ({
      date:     `${d._id.day}/${d._id.month}`,
      stockIn:  d.stockIn,
      stockOut: d.stockOut,
    }));

    // ── Stock status breakdown ────────────────────────────────────────────────
    const kpi = kpiResult[0] ?? {
      catalogValue: 0, totalUnits: 0, availableUnits: 0,
      totalProducts: 0, outOfStock: 0, lowStock: 0,
    };
    const inStockCount = kpi.totalProducts - kpi.outOfStock - kpi.lowStock;
    const stockStatus = [
      { name: 'In Stock',     value: Math.max(0, inStockCount), color: '#10b981' },
      { name: 'Low Stock',    value: kpi.lowStock,              color: '#f59e0b' },
      { name: 'Out of Stock', value: kpi.outOfStock,            color: '#ef4444' },
    ];

    // ── Format top products ───────────────────────────────────────────────────
    const formattedTopProducts = (topProducts as { name: string; sku: string; price: number; availableQty: number; stockValue: number }[]).map(p => ({
      name:         p.name,
      sku:          p.sku,
      price:        p.price,
      availableQty: p.availableQty,
      stockValue:   p.stockValue,
    }));

    // ── Format movement by type ───────────────────────────────────────────────
    const formattedMovementByType = (movementByType as { _id: string; count: number; totalQty: number }[]).map(m => ({
      type:     m._id,
      count:    m.count,
      totalQty: m.totalQty,
    }));

    // ── Format recent activity ────────────────────────────────────────────────
    const formattedRecentActivity = recentActivity.map(l => ({
      _id:          l._id.toString(),
      productName:  l.productName,
      productSku:   l.productSku,
      type:         l.type,
      qty:          l.qty,
      balanceAfter: l.balanceAfter,
      note:         l.note,
      performedBy:  l.performedBy,
      createdAt:    l.createdAt,
    }));

    return NextResponse.json({
      kpi: {
        catalogValue:   kpi.catalogValue,
        totalUnits:     kpi.totalUnits,
        availableUnits: kpi.availableUnits,
        totalProducts:  kpi.totalProducts,
        outOfStock:     kpi.outOfStock,
        lowStock:       kpi.lowStock,
      },
      monthlyMovement:  formattedMonthly,
      stockStatus,
      topProducts:      formattedTopProducts,
      movementByType:   formattedMovementByType,
      recentActivity:   formattedRecentActivity,
      dailyMovement:    formattedDaily,
    });

  } catch (err) {
    console.error('[GET /api/reports/shop]', err);
    return NextResponse.json({ error: 'Failed to fetch shop report data.' }, { status: 500 });
  }
}
