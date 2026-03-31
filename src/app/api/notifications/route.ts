import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';

/**
 * GET /api/notifications?shopId=
 * Returns stock-alert notifications for a shop:
 *   - out-of-stock products  → severity "critical"
 *   - low-stock products (1–20 units) → severity "warning"
 * Sorted: out-of-stock first, then low-stock ordered by availableQty asc.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const shopId = request.nextUrl.searchParams.get('shopId')?.trim() ?? '';
    if (!shopId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Fetch out-of-stock products
    const outOfStock = await ProductModel.find({ shopId, availableQty: 0 })
      .select('_id name sku availableQty')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    // Fetch low-stock products (1–20 units)
    const lowStock = await ProductModel.find({
      shopId,
      availableQty: { $gt: 0, $lte: 20 },
    })
      .select('_id name sku availableQty')
      .sort({ availableQty: 1 })
      .limit(20)
      .lean();

    const notifications = [
      ...outOfStock.map(p => ({
        id: String(p._id),
        productId: String(p._id),
        severity: 'critical' as const,
        title: 'Out of Stock',
        message: `${p.name} (${p.sku}) has 0 units left`,
        productName: p.name,
        sku: p.sku,
        availableQty: p.availableQty,
      })),
      ...lowStock.map(p => ({
        id: String(p._id),
        productId: String(p._id),
        severity: 'warning' as const,
        title: 'Low Stock',
        message: `${p.name} (${p.sku}) has only ${p.availableQty} unit${p.availableQty === 1 ? '' : 's'} left`,
        productName: p.name,
        sku: p.sku,
        availableQty: p.availableQty,
      })),
    ];

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 });
  }
}
