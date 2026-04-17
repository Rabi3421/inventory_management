import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { SettingsModel } from '@/lib/models/Settings';

/**
 * GET /api/notifications?shopId=
 * Returns stock-alert notifications for a shop:
 *   - out-of-stock products  → severity "critical"
 *   - low-stock products (1–threshold units) → severity "warning"
 * Sorted: out-of-stock first, then low-stock ordered by availableQty asc.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const shopId = request.nextUrl.searchParams.get('shopId')?.trim() ?? '';
    if (!shopId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const settings = await SettingsModel.findOne({}).lean();
    const defaultThreshold = settings?.lowStockThreshold ?? 20;

    const outOfStock = await ProductModel.find({ shopId, availableQty: 0 })
      .select('_id name sku availableQty lowStockAlertQty')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const lowStock = await ProductModel.find({
      shopId,
      $expr: {
        $and: [
          { $gt: ['$availableQty', 0] },
          { $lte: ['$availableQty', { $ifNull: ['$lowStockAlertQty', defaultThreshold] }] },
        ],
      },
    })
      .select('_id name sku availableQty lowStockAlertQty')
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
        effectiveLowStockThreshold: p.lowStockAlertQty ?? defaultThreshold,
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
