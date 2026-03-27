import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';

/**
 * GET /api/inventory
 * Returns all products with live stock stats + last movement date.
 * Query params: search, status (in-stock|low-stock|out-of-stock), page, limit, sort, dir
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search  = searchParams.get('search')?.trim() ?? '';
    const status  = searchParams.get('status') ?? 'all';
    const page    = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit   = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)));
    const sort    = searchParams.get('sort') ?? 'createdAt';
    const dir     = searchParams.get('dir') === 'asc' ? 1 : -1;
    const allowedSorts = ['name', 'price', 'totalQty', 'availableQty', 'createdAt'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

    // Build filter
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku:  { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'out-of-stock')  filter.availableQty = 0;
    if (status === 'low-stock')     filter.$expr = { $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', 20] }] };
    if (status === 'in-stock')      filter.availableQty = { $gt: 20 };

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ [sortField]: dir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    // Aggregate stats from full collection (ignoring filter)
    const [statsResult] = await ProductModel.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits:    { $sum: '$totalQty' },
          availableUnits:{ $sum: '$availableQty' },
          catalogValue:  { $sum: { $multiply: ['$price', '$availableQty'] } },
          outOfStock:    { $sum: { $cond: [{ $eq: ['$availableQty', 0] }, 1, 0] } },
          lowStock:      { $sum: { $cond: [{ $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', 20] }] }, 1, 0] } },
        },
      },
    ]);

    // Fetch latest log per product for "last movement" info
    const productIds = products.map(p => p._id);
    const lastLogs = await InventoryLogModel.aggregate([
      { $match: { productId: { $in: productIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$productId',
          lastType:      { $first: '$type' },
          lastQty:       { $first: '$qty' },
          lastNote:      { $first: '$note' },
          lastMovedAt:   { $first: '$createdAt' },
          totalIn:       { $sum: { $cond: [{ $gt: ['$qty', 0] }, '$qty', 0] } },
          totalOut:      { $sum: { $cond: [{ $lt: ['$qty', 0] }, { $abs: '$qty' }, 0] } },
          movementCount: { $sum: 1 },
        },
      },
    ]);

    const logMap = new Map(lastLogs.map(l => [l._id.toString(), l]));

    const items = products.map(p => {
      const log = logMap.get(p._id.toString());
      const avail = p.availableQty;
      const stockStatus =
        avail === 0 ? 'out-of-stock' :
        avail <= 20 ? 'low-stock' : 'in-stock';

      return {
        _id:           p._id.toString(),
        sku:           p.sku,
        name:          p.name,
        description:   p.description ?? '',
        price:         p.price,
        totalQty:      p.totalQty,
        availableQty:  p.availableQty,
        stockValue:    p.price * p.availableQty,
        stockStatus,
        createdAt:     p.createdAt,
        updatedAt:     p.updatedAt,
        lastMovedAt:   log?.lastMovedAt  ?? p.createdAt,
        lastType:      log?.lastType     ?? 'purchase',
        lastQty:       log?.lastQty      ?? p.totalQty,
        lastNote:      log?.lastNote     ?? '',
        totalIn:       log?.totalIn      ?? p.totalQty,
        totalOut:      log?.totalOut     ?? 0,
        movementCount: log?.movementCount ?? 1,
      };
    });

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: statsResult
        ? {
            totalProducts:  statsResult.totalProducts,
            totalUnits:     statsResult.totalUnits,
            availableUnits: statsResult.availableUnits,
            catalogValue:   statsResult.catalogValue,
            outOfStock:     statsResult.outOfStock,
            lowStock:       statsResult.lowStock,
          }
        : { totalProducts: 0, totalUnits: 0, availableUnits: 0, catalogValue: 0, outOfStock: 0, lowStock: 0 },
    });
  } catch (err) {
    console.error('[GET /api/inventory]', err);
    return NextResponse.json({ error: 'Failed to fetch inventory.' }, { status: 500 });
  }
}
