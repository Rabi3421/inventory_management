import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { ShopModel } from '@/lib/models/Shop';

/**
 * GET /api/dashboard
 * Returns all data needed to render the dashboard in a single request:
 *  - kpi:           aggregate stats (SKUs, units, stock value, alerts, shops)
 *  - shopwiseChart: per-shop breakdown (name, inStock, lowStock, outOfStock)
 *  - categoryChart: placeholder — products don't have category, use SKU ranges
 *  - stockAlerts:   products where availableQty <= 20 (low or out), max 10
 *  - recentActivity: last 10 inventory log entries
 */
export async function GET() {
  try {
    await connectToDatabase();

    // ── Run all aggregations in parallel ──────────────────────────────────────
    const [kpiAgg, shopAgg, shopCountAgg, alertProducts, recentLogs] =
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
                    { $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', 20] }] },
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
              inStock:    { $sum: { $cond: [{ $gt: ['$availableQty', 20] }, '$availableQty', 0] } },
              lowStock:   { $sum: { $cond: [{ $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', 20] }] }, '$availableQty', 0] } },
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
        ProductModel.find({ availableQty: { $lte: 20 } })
          .sort({ availableQty: 1 })
          .limit(10)
          .lean(),

        // 5. Recent activity — last 10 inventory log entries
        InventoryLogModel.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
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
      threshold:  20,
      status:     p.availableQty === 0 ? 'out' : 'low',
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
    });
  } catch (err) {
    console.error('[GET /api/dashboard]', err);
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 });
  }
}
