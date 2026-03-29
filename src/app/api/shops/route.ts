import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ShopModel } from '@/lib/models/Shop';
import { ProductModel } from '@/lib/models/Product';
import { UserModel } from '@/lib/models/User';

/**
 * GET /api/shops
 * Returns all shops with computed stats injected from the products collection
 * and the assigned shop-admin user name.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status') ?? 'All';

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name:     { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { manager:  { $regex: search, $options: 'i' } },
      ];
    }
    if (status !== 'All') filter.status = status;

    const shops = await ShopModel.find(filter).sort({ createdAt: -1 }).lean();

    // Aggregate inventory stats PER SHOP — each shop only sees its own products
    const shopIds = shops.map(s => s._id.toString());
    const perShopStats = await ProductModel.aggregate([
      { $match: { shopId: { $in: shopIds } } },
      {
        $group: {
          _id: '$shopId',
          totalSKUs:      { $sum: 1 },
          totalStock:     { $sum: '$totalQty' },
          availableStock: { $sum: '$availableQty' },
          totalValue:     { $sum: { $multiply: ['$price', '$availableQty'] } },
          lowStockCount:  {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$availableQty', 0] }, { $lte: ['$availableQty', 20] }] },
                1, 0,
              ],
            },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$availableQty', 0] }, 1, 0] },
          },
        },
      },
    ]);

    // Build a quick lookup map  shopId → stats
    const statsMap = new Map(
      perShopStats.map(s => [s._id, s]),
    );

    const emptyStats = {
      totalSKUs: 0, totalStock: 0, availableStock: 0,
      totalValue: 0, lowStockCount: 0, outOfStockCount: 0,
    };

    // Fetch all shop-admin users to show manager info
    const shopAdmins = await UserModel.find({
      role: { $in: ['shopadmin', 'shop_admin'] },
      isActive: true,
    }).lean();

    const shopAdminMap = new Map(shopAdmins.map(u => [u.shopId, u]));

    const items = shops.map(shop => {
      const id = shop._id.toString();
      const admin = shopAdminMap.get(id);
      const shopStats = statsMap.get(id) ?? emptyStats;
      return {
        _id:            id,
        name:           shop.name,
        location:       shop.location,
        manager:        shop.manager,
        phone:          shop.phone,
        status:         shop.status,
        createdAt:      shop.createdAt,
        updatedAt:      shop.updatedAt,
        // Per-shop inventory stats
        totalSKUs:      shopStats.totalSKUs,
        totalStock:     shopStats.totalStock,
        availableStock: shopStats.availableStock,
        totalValue:     shopStats.totalValue,
        lowStockAlerts: shopStats.lowStockCount,
        outOfStock:     shopStats.outOfStockCount,
        // Linked shop admin
        adminName:  admin?.name  ?? null,
        adminEmail: admin?.email ?? null,
      };
    });

    // KPI counts for the header cards
    const [kpi] = await ShopModel.aggregate([
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          active:    { $sum: { $cond: [{ $eq: ['$status', 'Active']    }, 1, 0] } },
          inactive:  { $sum: { $cond: [{ $eq: ['$status', 'Inactive']  }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'Suspended'] }, 1, 0] } },
        },
      },
    ]);

    return NextResponse.json({
      items,
      kpi: kpi ?? { total: 0, active: 0, inactive: 0, suspended: 0 },
    });
  } catch (err) {
    console.error('[GET /api/shops]', err);
    return NextResponse.json({ error: 'Failed to fetch shops.' }, { status: 500 });
  }
}

/**
 * POST /api/shops
 * Create a new shop.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { name, location, manager, phone, status } = body;

    if (!name?.trim())     return NextResponse.json({ error: 'Shop name is required.' },  { status: 400 });
    if (!location?.trim()) return NextResponse.json({ error: 'Location is required.' },   { status: 400 });
    if (!manager?.trim())  return NextResponse.json({ error: 'Manager name is required.' },{ status: 400 });

    const existing = await ShopModel.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) return NextResponse.json({ error: 'A shop with this name already exists.' }, { status: 409 });

    const shop = await ShopModel.create({
      name:     name.trim(),
      location: location.trim(),
      manager:  manager.trim(),
      phone:    phone?.trim() ?? '',
      status:   status ?? 'Active',
    });

    return NextResponse.json({ shop }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/shops]', err);
    return NextResponse.json({ error: 'Failed to create shop.' }, { status: 500 });
  }
}
