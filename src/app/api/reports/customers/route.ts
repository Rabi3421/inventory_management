import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BillModel } from '@/lib/models/Bill';

type RangeKey = '30d' | '90d' | '1y' | 'all';
type GroupBy = 'day' | 'month' | 'year';

const RANGE_MS: Record<Exclude<RangeKey, 'all'>, number> = {
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
};

function money(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPeriodExpression(groupBy: GroupBy) {
  if (groupBy === 'day') return { format: '%Y-%m-%d', date: '$createdAt' };
  if (groupBy === 'year') return { format: '%Y', date: '$createdAt' };
  return { format: '%Y-%m', date: '$createdAt' };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const range = (searchParams.get('range') ?? '1y') as RangeKey;
    const groupBy = (searchParams.get('groupBy') ?? 'month') as GroupBy;
    const search = searchParams.get('search')?.trim() ?? '';
    const phone = searchParams.get('phone')?.trim() ?? '';

    const baseMatch: Record<string, unknown> = {
      customerPhone: { $exists: true, $ne: '' },
    };

    if (range !== 'all') {
      baseMatch.createdAt = {
        $gte: new Date(Date.now() - RANGE_MS[range as Exclude<RangeKey, 'all'>]),
      };
    }

    const periodExpr = getPeriodExpression(groupBy);
    const exactPhone = phone || (/^\d{7,15}$/.test(search) ? search : '');
    const searchRegex = search ? new RegExp(escapeRegex(search), 'i') : null;

    const [summaryRows, topCustomers, searchResults, customerSummaryRows, periodBreakdown, recentPurchases, favoriteProducts, shopBreakdown] = await Promise.all([
      BillModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$customerPhone',
            visitCount: { $sum: 1 },
            totalSpend: { $sum: '$total' },
          },
        },
        {
          $group: {
            _id: null,
            trackedCustomers: { $sum: 1 },
            repeatCustomers: {
              $sum: {
                $cond: [{ $gt: ['$visitCount', 1] }, 1, 0],
              },
            },
            totalVisits: { $sum: '$visitCount' },
            totalRevenue: { $sum: '$totalSpend' },
          },
        },
      ]),
      BillModel.aggregate([
        { $match: baseMatch },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$customerPhone',
            customerPhone: { $first: '$customerPhone' },
            customerName: { $first: '$customerName' },
            visitCount: { $sum: 1 },
            totalSpend: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            firstPurchaseAt: { $min: '$createdAt' },
            lastPurchaseAt: { $max: '$createdAt' },
          },
        },
        { $sort: { totalSpend: -1, lastPurchaseAt: -1 } },
        { $limit: 10 },
      ]),
      searchRegex
        ? BillModel.aggregate([
            {
              $match: {
                ...baseMatch,
                $or: [
                  { customerPhone: { $regex: searchRegex } },
                  { customerName: { $regex: searchRegex } },
                ],
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$customerPhone',
                customerPhone: { $first: '$customerPhone' },
                customerName: { $first: '$customerName' },
                visitCount: { $sum: 1 },
                totalSpend: { $sum: '$total' },
                averageOrderValue: { $avg: '$total' },
                firstPurchaseAt: { $min: '$createdAt' },
                lastPurchaseAt: { $max: '$createdAt' },
              },
            },
            { $sort: { totalSpend: -1, lastPurchaseAt: -1 } },
            { $limit: 8 },
          ])
        : Promise.resolve([]),
      exactPhone
        ? BillModel.aggregate([
            {
              $match: {
                ...baseMatch,
                customerPhone: exactPhone,
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$customerPhone',
                customerPhone: { $first: '$customerPhone' },
                customerName: { $first: '$customerName' },
                visitCount: { $sum: 1 },
                totalSpend: { $sum: '$total' },
                averageOrderValue: { $avg: '$total' },
                firstPurchaseAt: { $min: '$createdAt' },
                lastPurchaseAt: { $max: '$createdAt' },
              },
            },
          ])
        : Promise.resolve([]),
      exactPhone
        ? BillModel.aggregate([
            {
              $match: {
                ...baseMatch,
                customerPhone: exactPhone,
              },
            },
            {
              $group: {
                _id: {
                  period: { $dateToString: periodExpr },
                },
                billCount: { $sum: 1 },
                totalSpend: { $sum: '$total' },
              },
            },
            { $sort: { '_id.period': 1 } },
            {
              $project: {
                _id: 0,
                period: '$_id.period',
                billCount: 1,
                totalSpend: { $round: ['$totalSpend', 2] },
                averageSpend: {
                  $round: [
                    {
                      $cond: [
                        { $gt: ['$billCount', 0] },
                        { $divide: ['$totalSpend', '$billCount'] },
                        0,
                      ],
                    },
                    2,
                  ],
                },
              },
            },
          ])
        : Promise.resolve([]),
      exactPhone
        ? BillModel.aggregate([
            {
              $match: {
                ...baseMatch,
                customerPhone: exactPhone,
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 12 },
            {
              $lookup: {
                from: 'shops',
                let: { shopId: '$shopId' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: [{ $toString: '$_id' }, '$$shopId'] },
                    },
                  },
                  { $project: { name: 1 } },
                ],
                as: 'shop',
              },
            },
            { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                billId: { $toString: '$_id' },
                billNumber: 1,
                shopId: 1,
                shopName: { $ifNull: ['$shop.name', 'Unknown Shop'] },
                total: { $round: ['$total', 2] },
                itemCount: { $size: '$items' },
                createdAt: 1,
                customerName: 1,
                customerPhone: 1,
              },
            },
          ])
        : Promise.resolve([]),
      exactPhone
        ? BillModel.aggregate([
            {
              $match: {
                ...baseMatch,
                customerPhone: exactPhone,
              },
            },
            { $unwind: '$items' },
            {
              $group: {
                _id: {
                  productId: '$items.productId',
                  name: '$items.name',
                  sku: '$items.sku',
                },
                qty: { $sum: '$items.qty' },
                spend: { $sum: '$items.lineTotal' },
              },
            },
            { $sort: { spend: -1, qty: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                productId: '$_id.productId',
                name: '$_id.name',
                sku: '$_id.sku',
                qty: 1,
                spend: { $round: ['$spend', 2] },
              },
            },
          ])
        : Promise.resolve([]),
      exactPhone
        ? BillModel.aggregate([
            {
              $match: {
                ...baseMatch,
                customerPhone: exactPhone,
              },
            },
            {
              $group: {
                _id: '$shopId',
                visitCount: { $sum: 1 },
                totalSpend: { $sum: '$total' },
                lastPurchaseAt: { $max: '$createdAt' },
              },
            },
            {
              $lookup: {
                from: 'shops',
                let: { shopId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: [{ $toString: '$_id' }, '$$shopId'] },
                    },
                  },
                  { $project: { name: 1 } },
                ],
                as: 'shop',
              },
            },
            { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
            { $sort: { totalSpend: -1, visitCount: -1 } },
            {
              $project: {
                _id: 0,
                shopId: '$_id',
                shopName: { $ifNull: ['$shop.name', 'Unknown Shop'] },
                visitCount: 1,
                totalSpend: { $round: ['$totalSpend', 2] },
                lastPurchaseAt: 1,
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const summaryRow = summaryRows[0] as {
      trackedCustomers?: number;
      repeatCustomers?: number;
      totalVisits?: number;
      totalRevenue?: number;
    } | undefined;

    const summary = {
      trackedCustomers: Number(summaryRow?.trackedCustomers ?? 0),
      repeatCustomers: Number(summaryRow?.repeatCustomers ?? 0),
      totalVisits: Number(summaryRow?.totalVisits ?? 0),
      totalRevenue: money(Number(summaryRow?.totalRevenue ?? 0)),
      averageOrderValue: money(
        Number(summaryRow?.totalVisits ?? 0) > 0
          ? Number(summaryRow?.totalRevenue ?? 0) / Number(summaryRow?.totalVisits ?? 0)
          : 0,
      ),
    };

    const normalizeCustomer = (row: Record<string, unknown>) => ({
      customerPhone: String(row.customerPhone ?? row._id ?? ''),
      customerName: String(row.customerName ?? ''),
      visitCount: Number(row.visitCount ?? 0),
      totalSpend: money(Number(row.totalSpend ?? 0)),
      averageOrderValue: money(Number(row.averageOrderValue ?? 0)),
      firstPurchaseAt: row.firstPurchaseAt instanceof Date ? row.firstPurchaseAt.toISOString() : String(row.firstPurchaseAt ?? ''),
      lastPurchaseAt: row.lastPurchaseAt instanceof Date ? row.lastPurchaseAt.toISOString() : String(row.lastPurchaseAt ?? ''),
    });

    const customerSummary = customerSummaryRows[0] ? normalizeCustomer(customerSummaryRows[0] as Record<string, unknown>) : null;

    return NextResponse.json({
      range,
      groupBy,
      summary,
      topCustomers: (topCustomers as Record<string, unknown>[]).map(normalizeCustomer),
      searchResults: (searchResults as Record<string, unknown>[]).map(normalizeCustomer),
      customer: customerSummary
        ? {
            ...customerSummary,
            periodBreakdown: (periodBreakdown as Array<Record<string, unknown>>).map(row => ({
              period: String(row.period ?? ''),
              billCount: Number(row.billCount ?? 0),
              totalSpend: money(Number(row.totalSpend ?? 0)),
              averageSpend: money(Number(row.averageSpend ?? 0)),
            })),
            recentPurchases: (recentPurchases as Array<Record<string, unknown>>).map(row => ({
              billId: String(row.billId ?? ''),
              billNumber: String(row.billNumber ?? ''),
              shopId: String(row.shopId ?? ''),
              shopName: String(row.shopName ?? 'Unknown Shop'),
              total: money(Number(row.total ?? 0)),
              itemCount: Number(row.itemCount ?? 0),
              createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
              customerName: String(row.customerName ?? ''),
              customerPhone: String(row.customerPhone ?? ''),
            })),
            favoriteProducts: (favoriteProducts as Array<Record<string, unknown>>).map(row => ({
              productId: String(row.productId ?? ''),
              name: String(row.name ?? ''),
              sku: String(row.sku ?? ''),
              qty: Number(row.qty ?? 0),
              spend: money(Number(row.spend ?? 0)),
            })),
            shopBreakdown: (shopBreakdown as Array<Record<string, unknown>>).map(row => ({
              shopId: String(row.shopId ?? ''),
              shopName: String(row.shopName ?? 'Unknown Shop'),
              visitCount: Number(row.visitCount ?? 0),
              totalSpend: money(Number(row.totalSpend ?? 0)),
              lastPurchaseAt: row.lastPurchaseAt instanceof Date ? row.lastPurchaseAt.toISOString() : String(row.lastPurchaseAt ?? ''),
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('[GET /api/reports/customers]', error);
    return NextResponse.json({ error: 'Failed to fetch customer analytics.' }, { status: 500 });
  }
}
