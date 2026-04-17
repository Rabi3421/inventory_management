import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { BillModel } from '@/lib/models/Bill';
import { ShopModel } from '@/lib/models/Shop';
import { SettingsModel } from '@/lib/models/Settings';
import { getInventoryStockStatus } from '@/lib/inventory/thresholds';

/**
 * GET /api/dashboard
 * Returns all data needed to render the dashboard in a single request:
 *  - kpi:           aggregate stats (SKUs, units, stock value, alerts, shops)
 *  - shopwiseChart: per-shop breakdown (name, inStock, lowStock, outOfStock)
 *  - categoryChart: placeholder — products don't have category, use SKU ranges
 *  - stockAlerts:   products below their effective threshold (low or out), max 10
 *  - recentActivity: last 10 inventory log entries
 *  - salesVelocity: fast/slow selling products from sales data over the range
 *  - sellThrough:   aggregate sell-through and conversion metrics
 *  - agingAlerts:   products that have stalled or not sold recently
 *  - categoryVelocity: price-band proxy breakdown for fast/slow selling categories
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') === '7d' || searchParams.get('range') === '90d' ? searchParams.get('range')! : '30d';
    const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const settings = await SettingsModel.findOne({}).lean();
    const defaultThreshold = settings?.lowStockThreshold ?? 20;
    const thresholdExpr = { $ifNull: ['$lowStockAlertQty', defaultThreshold] };
    const salesWindowStart = new Date();
    salesWindowStart.setHours(0, 0, 0, 0);
    salesWindowStart.setDate(salesWindowStart.getDate() - (rangeDays - 1));

    // ── Run all aggregations in parallel ──────────────────────────────────────
    const [kpiAgg, shopAgg, shopCountAgg, alertProducts, recentLogs, salesAgg, products] =
      await Promise.all([
        // 1. Global KPI aggregation
        ProductModel.aggregate([
          {
            $group: {
              _id: null,
              totalSKUs:    { $sum: 1 },
              totalUnits:   { $sum: '$totalQty' },
              availableUnits:{ $sum: '$availableQty' },
              totalValue:   { $sum: { $multiply: ['$price', '$availableQty'] } },
              lowStock: {
                $sum: {
                  $cond: [
                    { $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', thresholdExpr] }] },
                    1, 0,
                  ],
                },
              },
              outOfStock: { $sum: { $cond: [{ $eq: ['$availableQty', 0] }, 1, 0] } },
              thisMonth: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                    1, 0,
                  ],
                },
              },
            },
          },
        ]),

        // 2. Per-shop inventory breakdown — group products by shopId
        ProductModel.aggregate([
          {
            $group: {
              _id: '$shopId',
              inStock:    { $sum: { $cond: [{ $gt: ['$availableQty', thresholdExpr] }, '$availableQty', 0] } },
              lowStock:   { $sum: { $cond: [{ $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', thresholdExpr] }] }, '$availableQty', 0] } },
              outOfStock: { $sum: { $cond: [{ $eq: ['$availableQty', 0] }, 1, 0] } },
            },
          },
        ]),

        // 3. Shop count (active vs total)
        ShopModel.aggregate([
          {
            $group: {
              _id: null,
              total:  { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
            },
          },
        ]),

        // 4. Stock alerts — products needing attention (low + out)
        ProductModel.find({
          $or: [
            { availableQty: 0 },
            {
              $expr: {
                $and: [
                  { $gt: ['$availableQty', 0] },
                  { $lte: ['$availableQty', thresholdExpr] },
                ],
              },
            },
          ],
        })
          .sort({ availableQty: 1 })
          .limit(10)
          .lean(),

        // 5. Recent activity — last 10 inventory log entries
        InventoryLogModel.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        // 6. Sales velocity — products sold within the selected range
        BillModel.aggregate([
          { $match: { createdAt: { $gte: salesWindowStart } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              productName: { $first: '$items.name' },
              sku: { $first: '$items.sku' },
              soldQty: { $sum: '$items.qty' },
              revenue: { $sum: '$items.lineTotal' },
              saleCount: { $sum: 1 },
              lastSoldAt: { $max: '$createdAt' },
            },
          },
        ]),

        // 7. Current product snapshot for merging sales velocity with stock info
        ProductModel.find({}, {
          name: 1,
          sku: 1,
          price: 1,
          availableQty: 1,
          lowStockAlertQty: 1,
          totalQty: 1,
          createdAt: 1,
        }).lean(),
      ]);

    // ── Real shops for shopwise chart ──────────────────────────────────────────
    const shops = await ShopModel.find({ status: 'Active' }).sort({ name: 1 }).lean();

    // Build a lookup: shopId → product stats from the per-shop aggregation
    const shopStatsMap = new Map(shopAgg.map((s: { _id: string; inStock: number; lowStock: number; outOfStock: number }) => [s._id, s]));

    let shopwiseChart: { shop: string; inStock: number; lowStock: number; outOfStock: number }[] = [];

    if (shops.length > 0) {
      shopwiseChart = shops.map(shop => {
        const id = shop._id.toString();
        const s = shopStatsMap.get(id) ?? { inStock: 0, lowStock: 0, outOfStock: 0 };
        return {
          shop: shop.name,
          inStock:    s.inStock    ?? 0,
          lowStock:   s.lowStock   ?? 0,
          outOfStock: s.outOfStock ?? 0,
        };
      });
    } else {
      // Fallback: nothing to show
      shopwiseChart = [];
    }

    // ── Category chart — bucket by price range as proxy ───────────────────────
    const catAgg = await ProductModel.aggregate([
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 20, 50, 150, 500, 2000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            units: { $sum: '$availableQty' },
            value: { $sum: { $multiply: ['$price', '$availableQty'] } },
          },
        },
      },
    ]);

    const catLabels  = ['< ₹20', '₹20–50', '₹50–150', '₹150–500', '₹500–2k', '₹2k+'];
    const catColors  = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const categoryChart = catAgg.map((b, i) => ({
      name:  catLabels[i] ?? `Range ${i + 1}`,
      value: b.units  ?? 0,
      stock: b.value  ?? 0,
      color: catColors[i % catColors.length],
    })).filter(c => c.value > 0);

    // ── KPI block ─────────────────────────────────────────────────────────────
    const kpi = kpiAgg[0] ?? {
      totalSKUs: 0, totalUnits: 0, availableUnits: 0,
      totalValue: 0, lowStock: 0, outOfStock: 0, thisMonth: 0,
    };
    const shopCounts = shopCountAgg[0] ?? { total: 0, active: 0 };

    // ── Alerts ────────────────────────────────────────────────────────────────
    const stockAlerts = alertProducts.map(p => ({
      _id:        p._id.toString(),
      sku:        p.sku,
      name:       p.name,
      qty:        p.availableQty,
      threshold:  p.lowStockAlertQty ?? defaultThreshold,
      status:     getInventoryStockStatus({
        availableQty: p.availableQty,
        lowStockAlertQty: p.lowStockAlertQty ?? null,
      }, defaultThreshold) === 'out-of-stock' ? 'out' : 'low',
    }));

    // ── Recent activity ───────────────────────────────────────────────────────
    const recentActivity = recentLogs.map(log => ({
      _id:         log._id.toString(),
      productName: log.productName,
      productSku:  log.productSku,
      type:        log.type,
      qty:         log.qty,
      note:        log.note,
      performedBy: log.performedBy,
      createdAt:   log.createdAt,
    }));

    const salesMap = new Map(
      (salesAgg as Array<{
        _id: string;
        productName: string;
        sku: string;
        soldQty: number;
        revenue: number;
        saleCount: number;
        lastSoldAt: Date;
      }>).map(row => [row._id, row]),
    );

    const velocityRows = (products as Array<{
      _id: { toString(): string };
      name: string;
      sku: string;
      price: number;
      availableQty: number;
        lowStockAlertQty?: number | null;
      totalQty: number;
      createdAt: Date;
    }>).map(product => {
      const key = product._id.toString();
      const sales = salesMap.get(key);
      const soldQty = sales?.soldQty ?? 0;
      const revenue = sales?.revenue ?? 0;
      const saleCount = sales?.saleCount ?? 0;
      const remainingQty = Math.max(0, product.availableQty ?? 0);
      const totalMoved = soldQty + remainingQty;
      const sellThroughRate = totalMoved > 0 ? parseFloat(((soldQty / totalMoved) * 100).toFixed(2)) : 0;
      const velocityPerDay = parseFloat((soldQty / rangeDays).toFixed(2));
      const ageDays = Math.max(1, Math.ceil((Date.now() - new Date(product.createdAt).getTime()) / 86_400_000));
      const lastSoldAt = sales?.lastSoldAt ?? null;
      const daysSinceLastSold = lastSoldAt ? Math.max(0, Math.ceil((Date.now() - new Date(lastSoldAt).getTime()) / 86_400_000)) : ageDays;

      return {
        _id: key,
        name: product.name,
        sku: product.sku,
        price: product.price,
        availableQty: product.availableQty,
        totalQty: product.totalQty,
        soldQty,
        revenue: parseFloat(revenue.toFixed(2)),
        saleCount,
        velocityPerDay,
        lastSoldAt,
        ageDays,
        sellThroughRate,
        daysSinceLastSold,
      };
    });

    const fastSellingProducts = [...velocityRows]
      .sort((a, b) => b.soldQty - a.soldQty || b.revenue - a.revenue || b.ageDays - a.ageDays)
      .filter(p => p.soldQty > 0)
      .slice(0, 5);

    const slowSellingProducts = [...velocityRows]
      .sort((a, b) => a.soldQty - b.soldQty || a.ageDays - b.ageDays || a.revenue - b.revenue)
      .slice(0, 5);

    const productsWithSales = velocityRows.filter(p => p.soldQty > 0).length;
    const unsoldProducts = velocityRows.length - productsWithSales;

    const agingAlerts = [...velocityRows]
      .filter(p => p.availableQty > 0 && (p.daysSinceLastSold >= 30 || (p.soldQty === 0 && p.ageDays >= 14)))
      .sort((a, b) => b.daysSinceLastSold - a.daysSinceLastSold || b.availableQty - a.availableQty)
      .slice(0, 6)
      .map(product => ({
        ...product,
        agingLevel: product.daysSinceLastSold >= 90 || (product.soldQty === 0 && product.ageDays >= 60)
          ? 'critical'
          : product.daysSinceLastSold >= 45 || (product.soldQty === 0 && product.ageDays >= 30)
            ? 'warning'
            : 'watch',
      }));

    const priceBandLabels = [
      { name: '< ₹20', min: 0, max: 20 },
      { name: '₹20–50', min: 20, max: 50 },
      { name: '₹50–150', min: 50, max: 150 },
      { name: '₹150–500', min: 150, max: 500 },
      { name: '₹500–2k', min: 500, max: 2000 },
      { name: '₹2k+', min: 2000, max: Number.POSITIVE_INFINITY },
    ];

    const categoryVelocity = priceBandLabels.map((band) => {
      const productsInBand = velocityRows.filter(p => p.price >= band.min && p.price < band.max);
      const soldQty = productsInBand.reduce((sum, p) => sum + p.soldQty, 0);
      const revenue = productsInBand.reduce((sum, p) => sum + p.revenue, 0);
      const totalAvailable = productsInBand.reduce((sum, p) => sum + p.availableQty, 0);
      const totalStock = productsInBand.reduce((sum, p) => sum + p.totalQty, 0);
      const sellThroughRate = soldQty + totalAvailable > 0 ? parseFloat(((soldQty / (soldQty + totalAvailable)) * 100).toFixed(2)) : 0;
      return {
        name: band.name,
        productCount: productsInBand.length,
        soldQty,
        revenue: parseFloat(revenue.toFixed(2)),
        availableQty: totalAvailable,
        totalQty: totalStock,
        sellThroughRate,
      };
    }).filter(row => row.productCount > 0);

    const avgSellThrough = velocityRows.length > 0
      ? parseFloat((velocityRows.reduce((sum, p) => sum + p.sellThroughRate, 0) / velocityRows.length).toFixed(2))
      : 0;
    const fastSellThroughCount = velocityRows.filter(p => p.sellThroughRate >= 60).length;
    const slowSellThroughCount = velocityRows.filter(p => p.sellThroughRate > 0 && p.sellThroughRate < 25).length;

    return NextResponse.json({
      kpi: {
        totalSKUs:      kpi.totalSKUs,
        totalUnits:     kpi.totalUnits,
        availableUnits: kpi.availableUnits,
        totalValue:     kpi.totalValue,
        lowStock:       kpi.lowStock,
        outOfStock:     kpi.outOfStock,
        thisMonth:      kpi.thisMonth,
        activeShops:    shopCounts.active,
        totalShops:     shopCounts.total,
      },
      shopwiseChart,
      categoryChart,
      stockAlerts,
      recentActivity,
      salesVelocity: {
        range,
        rangeDays,
        totalSoldUnits: velocityRows.reduce((sum, p) => sum + p.soldQty, 0),
        productsWithSales,
        unsoldProducts,
        avgSellThrough,
        fastSellThroughCount,
        slowSellThroughCount,
        fastSellingProducts,
        slowSellingProducts,
        agingAlerts,
        categoryVelocity,
      },
    });
  } catch (err) {
    console.error('[GET /api/dashboard]', err);
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 });
  }
}
