import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { getUserFromAccessToken } from '@/lib/auth/session';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';

/**
 * GET /api/shop-admin/dashboard
 * Returns KPI, weekly activity chart, category chart, and stock alerts
 * ALL scoped to the logged-in shop admin's shopId.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const authUser = await getUserFromAccessToken(accessToken);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const shopId = authUser.shopId;
    if (!shopId) {
      return NextResponse.json({ error: 'No shop assigned to this user.' }, { status: 403 });
    }

    await connectToDatabase();

    // Start of this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of 7 days ago (for weekly chart)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [kpiAgg, alertProducts, weeklyLogs, catAgg] = await Promise.all([
      // 1. KPI aggregation scoped to this shop
      ProductModel.aggregate([
        { $match: { shopId } },
        {
          $group: {
            _id: null,
            totalSKUs:      { $sum: 1 },
            totalUnits:     { $sum: '$totalQty' },
            availableUnits: { $sum: '$availableQty' },
            totalValue:     { $sum: { $multiply: ['$price', '$availableQty'] } },
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
              $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0] },
            },
          },
        },
      ]),

      // 2. Stock alerts — low/out products for this shop
      ProductModel.find({ shopId, availableQty: { $lte: 20 } })
        .sort({ availableQty: 1 })
        .limit(10)
        .lean(),

      // 3. Weekly log entries grouped by day (last 7 days)
      InventoryLogModel.aggregate([
        {
          $match: {
            shopId,
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              day:  { $dayOfMonth: '$createdAt' },
              month:{ $month: '$createdAt' },
              year: { $year: '$createdAt' },
              type: '$type',
            },
            total: { $sum: '$qty' },
          },
        },
      ]),

      // 4. Category chart — price bucket breakdown for this shop
      ProductModel.aggregate([
        { $match: { shopId } },
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
      ]),
    ]);

    // ── Build weekly chart (last 7 days with day labels) ────────────────────
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = new Map<string, { sold: number; restocked: number }>();

    // Seed all 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      weeklyMap.set(key, { sold: 0, restocked: 0 });
    }

    for (const entry of weeklyLogs) {
      const key = `${entry._id.year}-${entry._id.month}-${entry._id.day}`;
      if (!weeklyMap.has(key)) continue;
      const slot = weeklyMap.get(key)!;
      if (entry._id.type === 'sale' || entry._id.type === 'adjustment') {
        slot.sold += entry.total;
      } else if (entry._id.type === 'restock') {
        slot.restocked += entry.total;
      }
    }

    const weeklyChart = Array.from(weeklyMap.entries()).map(([key, val]) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return { day: DAY_LABELS[date.getDay()], sold: val.sold, restocked: val.restocked };
    });

    // ── Category chart ───────────────────────────────────────────────────────
    const catLabels = ['< ₹20', '₹20–50', '₹50–150', '₹150–500', '₹500–2k', '₹2k+'];
    const catColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const categoryChart = catAgg
      .map((b, i) => ({
        name:  catLabels[i] ?? `Range ${i + 1}`,
        value: b.units  ?? 0,
        stock: b.value  ?? 0,
        color: catColors[i % catColors.length],
      }))
      .filter(c => c.value > 0);

    // ── KPI ──────────────────────────────────────────────────────────────────
    const kpi = kpiAgg[0] ?? {
      totalSKUs: 0, totalUnits: 0, availableUnits: 0,
      totalValue: 0, lowStock: 0, outOfStock: 0, thisMonth: 0,
    };

    // ── Stock alerts ─────────────────────────────────────────────────────────
    const stockAlerts = alertProducts.map(p => ({
      _id:       p._id.toString(),
      sku:       p.sku,
      name:      p.name,
      qty:       p.availableQty,
      threshold: 20,
      status:    p.availableQty === 0 ? 'out' : 'low',
    }));

    return NextResponse.json({
      shopId,
      shopName: authUser.shopName ?? '',
      kpi: {
        totalSKUs:      kpi.totalSKUs,
        totalUnits:     kpi.totalUnits,
        availableUnits: kpi.availableUnits,
        totalValue:     kpi.totalValue,
        lowStock:       kpi.lowStock,
        outOfStock:     kpi.outOfStock,
        thisMonth:      kpi.thisMonth,
      },
      weeklyChart,
      categoryChart,
      stockAlerts,
    });
  } catch (err) {
    console.error('[GET /api/shop-admin/dashboard]', err);
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 });
  }
}
