import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';

/**
 * POST /api/migrate
 * One-time migration: assigns shopId to all products (and their logs) that
 * were created before the shopId field was introduced.
 *
 * Body: { shopId: string }  — the target shop _id to assign to all orphaned documents.
 *
 * Optional Body: { productIds: string[] } — if provided, only migrate those
 * specific product IDs instead of all orphaned products.
 *
 * Only available in non-production or with the AUTH_SEED_SECRET header.
 */
export async function POST(request: NextRequest) {
  // Guard: only allow in dev or with the seed secret
  const secret = process.env.AUTH_SEED_SECRET;
  if (process.env.NODE_ENV === 'production' && secret) {
    const headerSecret = request.headers.get('x-seed-secret');
    if (headerSecret !== secret) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
  }

  try {
    await connectToDatabase();

    const body = await request.json();
    const shopId = String(body.shopId ?? '').trim();
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }

    // Build the filter — either target specific product IDs or all without shopId
    const productFilter: Record<string, unknown> =
      productIds.length > 0
        ? { _id: { $in: productIds } }
        : { $or: [{ shopId: { $exists: false } }, { shopId: '' }, { shopId: null }] };

    const productResult = await ProductModel.updateMany(
      productFilter,
      { $set: { shopId } },
    );

    // Also migrate orphaned InventoryLog entries for those products
    const logFilter: Record<string, unknown> =
      productIds.length > 0
        ? { productId: { $in: productIds } }
        : { $or: [{ shopId: { $exists: false } }, { shopId: '' }, { shopId: null }] };

    const logResult = await InventoryLogModel.updateMany(
      logFilter,
      { $set: { shopId } },
    );

    return NextResponse.json({
      success: true,
      productsUpdated: productResult.modifiedCount,
      logsUpdated: logResult.modifiedCount,
      shopId,
    });
  } catch (err) {
    console.error('[POST /api/migrate]', err);
    return NextResponse.json({ error: 'Migration failed.' }, { status: 500 });
  }
}

/**
 * GET /api/migrate
 * Returns all products that are missing a shopId (orphaned).
 */
export async function GET() {
  try {
    await connectToDatabase();

    const orphaned = await ProductModel.find({
      $or: [{ shopId: { $exists: false } }, { shopId: '' }, { shopId: null }],
    })
      .select('_id sku name totalQty availableQty createdAt')
      .lean();

    return NextResponse.json({
      count: orphaned.length,
      products: orphaned.map(p => ({
        _id: p._id.toString(),
        sku: p.sku,
        name: p.name,
        totalQty: p.totalQty,
        availableQty: p.availableQty,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error('[GET /api/migrate]', err);
    return NextResponse.json({ error: 'Failed to fetch orphaned products.' }, { status: 500 });
  }
}
