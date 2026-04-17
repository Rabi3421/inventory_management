import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';
import { ShopModel } from '@/lib/models/Shop';
import { hashPassword } from '@/lib/auth/password';

/**
 * GET /api/users
 * Returns all users (passwordHash excluded) with KPI counts and the shops list.
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search')?.trim() ?? '';
    const role   = searchParams.get('role')   ?? 'All';
    const status = searchParams.get('status') ?? 'All';

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role !== 'All') {
      // 'superadmin' | 'shopadmin' | 'billingcounter'
      filter.role = role;
    }
    if (status === 'Active')    filter.isActive = true;
    if (status === 'Suspended') filter.isActive = false;

    const [users, shops] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).select('-passwordHash').lean(),
      ShopModel.find({}).sort({ name: 1 }).select('_id name status').lean(),
    ]);

    // KPI aggregation across ALL users (not just filtered)
    const [kpi] = await UserModel.aggregate([
      {
        $group: {
          _id:        null,
          total:      { $sum: 1 },
          active:     { $sum: { $cond: ['$isActive', 1, 0] } },
          superadmin: { $sum: { $cond: [{ $eq: ['$role', 'superadmin'] }, 1, 0] } },
          shopadmin:  { $sum: { $cond: [{ $in:  ['$role', ['shopadmin', 'shop_admin']] }, 1, 0] } },
          billingcounter: { $sum: { $cond: [{ $eq: ['$role', 'billingcounter'] }, 1, 0] } },
        },
      },
    ]);

    const items = users.map(u => ({
      _id:        u._id.toString(),
      name:       u.name,
      email:      u.email,
      role:       u.role,
      shopId:     u.shopId    ?? null,
      shopName:   u.shopName  ?? null,
      isActive:   u.isActive,
      lastLoginAt:u.lastLoginAt ?? null,
      createdAt:  u.createdAt,
      updatedAt:  u.updatedAt,
      // computed initials
      initials: u.name.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? '').join(''),
    }));

    return NextResponse.json({
      items,
      kpi: kpi ?? { total: 0, active: 0, superadmin: 0, shopadmin: 0, billingcounter: 0 },
      shops: shops.map(s => ({ _id: s._id.toString(), name: s.name, status: s.status })),
    });
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Create a new user with a hashed password.
 * Body: { name, email, role, shopId, shopName, password }
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { name, email, role, shopId, shopName, password } = body;

    if (!name?.trim())     return NextResponse.json({ error: 'Name is required.' },     { status: 400 });
    if (!email?.trim())    return NextResponse.json({ error: 'Email is required.' },    { status: 400 });
    if (!password)         return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    if (!['superadmin', 'shopadmin', 'billingcounter'].includes(role))
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });

    const existing = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (existing) return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });

    const user = await UserModel.create({
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      role,
      shopId:       shopId   ?? null,
      shopName:     shopName ?? null,
      isActive:     true,
    });

    return NextResponse.json({
      user: {
        _id:      user._id.toString(),
        name:     user.name,
        email:    user.email,
        role:     user.role,
        shopId:   user.shopId   ?? null,
        shopName: user.shopName ?? null,
        isActive: user.isActive,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}
