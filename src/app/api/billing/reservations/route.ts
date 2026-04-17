import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { BillingReservationModel } from '@/lib/models/BillingReservation';
import { ProductModel } from '@/lib/models/Product';
import { cleanupExpiredBillingReservations, getReservationExpiryDate, getReservedQtyByOtherUsers } from '@/lib/billing/reservations';

function toPositiveInteger(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const action = String(body.action ?? 'sync').trim();
    const shopId = String(body.shopId ?? '').trim();
    const userId = String(body.userId ?? '').trim();
    const userName = String(body.userName ?? '').trim();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (action !== 'sync') {
      return NextResponse.json({ error: 'Unsupported reservation action.' }, { status: 400 });
    }
    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    await cleanupExpiredBillingReservations(shopId);

    const normalizedItems = new Map<string, number>();
    for (const item of rawItems) {
      const productId = String(item?.productId ?? '').trim();
      const qty = toPositiveInteger(item?.qty);
      if (!productId || !mongoose.isValidObjectId(productId)) {
        return NextResponse.json({ error: `Invalid productId: ${productId || '(empty)'}` }, { status: 400 });
      }
      if (Number.isNaN(qty)) {
        return NextResponse.json({ error: `Invalid quantity for product ${productId}.` }, { status: 400 });
      }
      if (qty <= 0) continue;
      normalizedItems.set(productId, qty);
    }

    const requestedProductIds = Array.from(normalizedItems.keys());

    if (requestedProductIds.length === 0) {
      await BillingReservationModel.deleteMany({ shopId, userId });
      return NextResponse.json({ reservations: [] });
    }

    const [products, reservedByOtherUsers] = await Promise.all([
      ProductModel.find({
        _id: { $in: requestedProductIds.map(id => new mongoose.Types.ObjectId(id)) },
        shopId,
      }).lean(),
      getReservedQtyByOtherUsers({
        shopId,
        productIds: requestedProductIds,
        currentUserId: userId,
      }),
    ]);

    if (products.length !== requestedProductIds.length) {
      return NextResponse.json({ error: 'One or more products no longer exist in this shop.' }, { status: 404 });
    }

    const productById = new Map(products.map(product => [product._id.toString(), product]));
    const reservationRows: Array<{
      productId: string;
      qty: number;
      availableQty: number;
      reservedByOthers: number;
      scannableQty: number;
    }> = [];

    for (const [productId, qty] of normalizedItems.entries()) {
      const product = productById.get(productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${productId}` }, { status: 404 });
      }

      const otherReservedQty = reservedByOtherUsers.get(productId) ?? 0;
      const scannableQty = Math.max(0, Number(product.availableQty ?? 0) - otherReservedQty);

      if (qty > scannableQty) {
        return NextResponse.json({
          error: `"${product.name}" is already held on another counter. Available to scan now: ${scannableQty}.`,
          productId,
          scannableQty,
        }, { status: 409 });
      }

      reservationRows.push({
        productId,
        qty,
        availableQty: Number(product.availableQty ?? 0),
        reservedByOthers: otherReservedQty,
        scannableQty,
      });
    }

    const expiry = getReservationExpiryDate();
    await BillingReservationModel.deleteMany({
      shopId,
      userId,
      productId: { $nin: requestedProductIds },
    });

    await Promise.all(reservationRows.map(row => BillingReservationModel.findOneAndUpdate(
      { shopId, userId, productId: row.productId },
      {
        $set: {
          shopId,
          userId,
          productId: row.productId,
          userName,
          qty: row.qty,
          expiresAt: expiry,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    )));

    return NextResponse.json({ reservations: reservationRows, expiresAt: expiry.toISOString() });
  } catch (error) {
    console.error('[POST /api/billing/reservations]', error);
    return NextResponse.json({ error: 'Failed to sync billing reservations.' }, { status: 500 });
  }
}