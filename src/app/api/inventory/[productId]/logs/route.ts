import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import type { LogType } from '@/lib/models/InventoryLog';

interface RouteContext {
  params: Promise<{ productId: string }>;
}

/**
 * GET /api/inventory/[productId]/logs
 * Returns the full movement ledger (bank-statement style) for one product.
 * Sorted newest-first. Supports pagination via page/limit.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { productId } = await context.params;

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const page  = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 50)));

    const [product, logs, total] = await Promise.all([
      ProductModel.findById(productId).lean(),
      InventoryLogModel.find({ productId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryLogModel.countDocuments({ productId }),
    ]);

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        _id:          product._id.toString(),
        sku:          product.sku,
        name:         product.name,
        price:        product.price,
        totalQty:     product.totalQty,
        availableQty: product.availableQty,
      },
      logs: logs.map(l => ({
        _id:          l._id.toString(),
        type:         l.type,
        qty:          l.qty,
        balanceAfter: l.balanceAfter,
        note:         l.note,
        performedBy:  l.performedBy,
        createdAt:    l.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/inventory/:productId/logs]', err);
    return NextResponse.json({ error: 'Failed to fetch logs.' }, { status: 500 });
  }
}

/**
 * POST /api/inventory/[productId]/logs
 * Manually record a stock movement (adjustment, sale, return).
 * Body: { type, qty, note }
 *   type — 'sale' | 'adjustment' | 'return'
 *   qty  — positive for in, negative for out (for 'sale' can be positive, will be negated)
 *   note — optional description
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { productId } = await context.params;

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const body = await request.json();
    const type  = String(body.type ?? '').trim() as LogType;
    const qty   = Number(body.qty);
    const note  = String(body.note ?? '').trim();

    const allowedTypes: LogType[] = ['sale', 'adjustment', 'return'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'type must be sale, adjustment, or return.' }, { status: 400 });
    }
    if (isNaN(qty) || qty === 0) {
      return NextResponse.json({ error: 'qty must be a non-zero number.' }, { status: 400 });
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // For sales, qty is deducted; for returns/positive adjustments, qty is added
    const delta = type === 'sale' ? -Math.abs(qty) : qty;
    const newAvailable = product.availableQty + delta;

    if (newAvailable < 0) {
      return NextResponse.json(
        { error: `Cannot deduct ${Math.abs(delta)} units — only ${product.availableQty} available.` },
        { status: 422 },
      );
    }

    product.availableQty = newAvailable;
    if (delta > 0) product.totalQty += delta; // returns/positive adjustments increase total too
    await product.save();

    const log = await InventoryLogModel.create({
      shopId:       product.shopId,
      productId:    product._id,
      productName:  product.name,
      productSku:   product.sku,
      type,
      qty:          delta,
      balanceAfter: newAvailable,
      note:         note || `Manual ${type}`,
      performedBy:  'superadmin',
    });

    return NextResponse.json(
      {
        log: {
          _id:          log._id.toString(),
          type:         log.type,
          qty:          log.qty,
          balanceAfter: log.balanceAfter,
          note:         log.note,
          createdAt:    log.createdAt,
        },
        product: {
          _id:          product._id.toString(),
          availableQty: product.availableQty,
          totalQty:     product.totalQty,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/inventory/:productId/logs]', err);
    return NextResponse.json({ error: 'Failed to record movement.' }, { status: 500 });
  }
}
