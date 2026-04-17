import { NextRequest, NextResponse } from 'next/server';
import { hashPasswordBcrypt } from '@/lib/auth/password';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';

function isAuthorized(request: NextRequest, secret?: string) {
  if (process.env.NODE_ENV !== 'production' && !secret) {
    return true;
  }

  const headerSecret = request.headers.get('x-seed-secret');
  return Boolean(secret && headerSecret === secret);
}

export async function POST(request: NextRequest) {
  const seedSecret = process.env.AUTH_SEED_SECRET;
  if (!isAuthorized(request, seedSecret)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  try {
    await connectToDatabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Cannot reach the database. Ensure your IP is whitelisted in MongoDB Atlas and the connection string is correct.',
        detail: message,
      },
      { status: 503 }
    );
  }

  const usersCount = await UserModel.countDocuments();
  if (usersCount > 0) {
    const users = await UserModel.find({}, { name: 1, email: 1, role: 1, shopName: 1 }).lean();
    return NextResponse.json({
      created: false,
      message: 'Users already exist.',
      users,
    });
  }

  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? 'SuperAdmin2026!';
  const shopAdminPassword = process.env.SEED_SHOP_ADMIN_PASSWORD ?? 'ShopAdmin2026!';
  const billingCounterPassword = process.env.SEED_BILLING_COUNTER_PASSWORD ?? 'BillingCounter2026!';

  const [superadmin, shopadmin, billingCounter] = await UserModel.create([
    {
      name: process.env.SEED_SUPERADMIN_NAME ?? 'Owner Admin',
      email: (process.env.SEED_SUPERADMIN_EMAIL ?? 'owner@shopinventory.com').toLowerCase(),
      passwordHash: hashPasswordBcrypt(superadminPassword),
      role: 'superadmin',
      isActive: true,
    },
    {
      name: process.env.SEED_SHOP_ADMIN_NAME ?? 'Lekki Shop Admin',
      email: (process.env.SEED_SHOP_ADMIN_EMAIL ?? 'lekki@shopinventory.com').toLowerCase(),
      passwordHash: hashPasswordBcrypt(shopAdminPassword),
      role: 'shopadmin',
      shopId: process.env.SEED_SHOP_ADMIN_SHOP_ID ?? 'lekki-branch',
      shopName: process.env.SEED_SHOP_ADMIN_SHOP_NAME ?? 'Lekki Branch',
      isActive: true,
    },
    {
      name: process.env.SEED_BILLING_COUNTER_NAME ?? 'Lekki Billing Counter',
      email: (process.env.SEED_BILLING_COUNTER_EMAIL ?? 'counter@shopinventory.com').toLowerCase(),
      passwordHash: hashPasswordBcrypt(billingCounterPassword),
      role: 'billingcounter',
      shopId: process.env.SEED_BILLING_COUNTER_SHOP_ID ?? process.env.SEED_SHOP_ADMIN_SHOP_ID ?? 'lekki-branch',
      shopName: process.env.SEED_BILLING_COUNTER_SHOP_NAME ?? process.env.SEED_SHOP_ADMIN_SHOP_NAME ?? 'Lekki Branch',
      isActive: true,
    },
  ]);

  return NextResponse.json({
    created: true,
    users: [
      { name: superadmin.name, email: superadmin.email, role: superadmin.role },
      { name: shopadmin.name, email: shopadmin.email, role: shopadmin.role, shopName: shopadmin.shopName },
      { name: billingCounter.name, email: billingCounter.email, role: billingCounter.role, shopName: billingCounter.shopName },
    ],
    credentials: {
      superadmin: { email: superadmin.email, password: superadminPassword },
      shopadmin: { email: shopadmin.email, password: shopAdminPassword },
      billingcounter: { email: billingCounter.email, password: billingCounterPassword },
    },
  });
}
