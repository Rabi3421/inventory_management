import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BillModel } from '@/lib/models/Bill';

type RangeKey = '7d' | '30d' | '90d' | '1y' | 'all';

const RANGE_MS: Record<Exclude<RangeKey, 'all'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
};

function money(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const range = (searchParams.get('range') ?? '30d') as RangeKey;
    const shopId = searchParams.get('shopId')?.trim() ?? '';
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';

    const matchStage: Record<string, unknown> = {};
    if (shopId) matchStage.shopId = shopId;
    if (range !== 'all') {
      matchStage.createdAt = {
        $gte: new Date(Date.now() - RANGE_MS[range as Exclude<RangeKey, 'all'>]),
      };
    }

    const rows = await BillModel.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productId: { $first: '$items.productId' },
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          soldQty: { $sum: '$items.qty' },
          revenue: { $sum: { $subtract: ['$items.lineTotal', { $ifNull: ['$items.gstAmount', 0] }] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: '$_id' }, '$$productId'] },
              },
            },
            {
              $project: {
                name: 1,
                sku: 1,
                price: 1,
                purchasePrice: 1,
                tax: 1,
                transportationCost: 1,
                availableQty: 1,
                shopId: 1,
              },
            },
          ],
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'shops',
          let: { shopId: '$product.shopId' },
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
        $addFields: {
          effectiveName: { $ifNull: ['$product.name', '$name'] },
          effectiveSku: { $ifNull: ['$product.sku', '$sku'] },
          unitCost: {
            $add: [
              { $ifNull: ['$product.purchasePrice', 0] },
              { $ifNull: ['$product.tax', 0] },
              { $ifNull: ['$product.transportationCost', 0] },
            ],
          },
        },
      },
      {
        $addFields: {
          cost: { $multiply: ['$unitCost', '$soldQty'] },
          profit: { $subtract: ['$revenue', { $multiply: ['$unitCost', '$soldQty'] }] },
          averageSalePrice: {
            $cond: [{ $gt: ['$soldQty', 0] }, { $divide: ['$revenue', '$soldQty'] }, 0],
          },
          margin: {
            $cond: [
              { $gt: ['$revenue', 0] },
              {
                $multiply: [
                  { $divide: [{ $subtract: ['$revenue', { $multiply: ['$unitCost', '$soldQty'] }] }, '$revenue'] },
                  100,
                ],
              },
              0,
            ],
          },
          stockLeft: { $ifNull: ['$product.availableQty', 0] },
          shopName: { $ifNull: ['$shop.name', 'Unknown Shop'] },
        },
      },
      { $sort: { profit: -1 } },
    ]);

    const normalizedRows = rows.map((row: Record<string, unknown>) => ({
      productId: String(row._id ?? row.productId ?? ''),
      name: String(row.effectiveName ?? row.name ?? 'Unknown Product'),
      sku: String(row.effectiveSku ?? row.sku ?? ''),
      shopName: String(row.shopName ?? 'Unknown Shop'),
      soldQty: Number(row.soldQty ?? 0),
      revenue: money(Number(row.revenue ?? 0)),
      unitCost: money(Number(row.unitCost ?? 0)),
      cost: money(Number(row.cost ?? 0)),
      profit: money(Number(row.profit ?? 0)),
      margin: money(Number(row.margin ?? 0)),
      averageSalePrice: money(Number(row.averageSalePrice ?? 0)),
      stockLeft: Number(row.stockLeft ?? 0),
    }));

    const summary = normalizedRows.reduce(
      (acc, row) => {
        acc.totalRevenue += row.revenue;
        acc.totalCost += row.cost;
        acc.totalProfit += row.profit;
        acc.soldQty += row.soldQty;
        acc.productCount += 1;
        if (row.profit >= 0) acc.profitableCount += 1;
        else acc.lossCount += 1;
        return acc;
      },
      {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        soldQty: 0,
        productCount: 0,
        profitableCount: 0,
        lossCount: 0,
        averageMargin: 0,
      },
    );

    summary.totalRevenue = money(summary.totalRevenue);
    summary.totalCost = money(summary.totalCost);
    summary.totalProfit = money(summary.totalProfit);
    summary.averageMargin = money(summary.totalRevenue > 0 ? (summary.totalProfit / summary.totalRevenue) * 100 : 0);

    const topProduct = normalizedRows[0] ?? null;

    if (format === 'csv') {
      const header = ['Product', 'SKU', 'Shop', 'Sold Qty', 'Avg Sale Price', 'Unit Cost', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Stock Left'];
      const lines = [
        header.join(','),
        ...normalizedRows.map(row => [
          `"${row.name}"`,
          `"${row.sku}"`,
          `"${row.shopName}"`,
          row.soldQty,
          row.averageSalePrice.toFixed(2),
          row.unitCost.toFixed(2),
          row.revenue.toFixed(2),
          row.cost.toFixed(2),
          row.profit.toFixed(2),
          row.margin.toFixed(2),
          row.stockLeft,
        ].join(',')),
      ];

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="profit-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      range,
      summary: {
        ...summary,
        topProduct,
      },
      rows: normalizedRows,
    });
  } catch (err) {
    console.error('[GET /api/reports/profit]', err);
    return NextResponse.json({ error: 'Failed to fetch profit data.' }, { status: 500 });
  }
}
