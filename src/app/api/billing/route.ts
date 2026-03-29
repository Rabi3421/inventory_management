import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';

/**
 * POST /api/billing
 * Processes a sale for multiple items at once (a cart checkout).
 *
 * Body:
 * {
 *   shopId:      string,
 *   items:       Array<{ productId: string; qty: number }>,
 *   performedBy: string,           // user name / email
 *   note?:       string,           // optional receipt note
 *   billNumber?: string,           // optional bill reference
 * }
 *
 * Returns: receipt data with item breakdown, totals, and updated stock levels.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body        = await request.json();
    const shopId      = String(body.shopId ?? '').trim();
    const items       = Array.isArray(body.items) ? body.items : [];
    const performedBy = String(body.performedBy ?? 'shop-admin').trim();
    const note        = String(body.note ?? '').trim();
    const billNumber  = String(body.billNumber ?? `BILL-${Date.now()}`).trim();

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    // Validate item structure
    for (const item of items) {
      if (!item.productId || !mongoose.isValidObjectId(item.productId)) {
        return NextResponse.json({ error: `Invalid productId: ${item.productId}` }, { status: 400 });
      }
      if (!item.qty || Number(item.qty) < 1) {
        return NextResponse.json({ error: `qty must be at least 1 for product ${item.productId}` }, { status: 400 });
      }
    }

    const productIds = items.map((i: { productId: string }) => new mongoose.Types.ObjectId(i.productId));

    // Load all products in one query
    const products = await ProductModel.find({
      _id:    { $in: productIds },
      shopId,
    });

    if (products.length !== items.length) {
      return NextResponse.json({
        error: 'One or more products not found in this shop.',
      }, { status: 404 });
    }

    // Build a lookup map
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Pre-check stock availability for all items before mutating anything
    for (const item of items) {
      const product = productMap.get(item.productId);
      const qty     = Number(item.qty);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });
      }
      if (product.availableQty < qty) {
        return NextResponse.json({
          error: `Insufficient stock for "${product.name}". Available: ${product.availableQty}, requested: ${qty}.`,
        }, { status: 422 });
      }
    }

    // Process each item — deduct stock and create inventory log
    const receiptItems: {
      productId:    string;
      sku:          string;
      name:         string;
      qty:          number;
      unitPrice:    number;
      lineTotal:    number;
      balanceAfter: number;
    }[] = [];

    const now = new Date();

    for (const item of items) {
      const product   = productMap.get(item.productId)!;
      const qty       = Number(item.qty);
      const newAvailable = product.availableQty - qty;

      product.availableQty = newAvailable;
      await product.save();

      await InventoryLogModel.create({
        shopId,
        productId:   product._id,
        productName: product.name,
        productSku:  product.sku,
        type:        'sale',
        qty:         -qty,
        balanceAfter: newAvailable,
        note:        note || `Sale — Bill ${billNumber}`,
        performedBy,
        createdAt:   now,
      });

      receiptItems.push({
        productId:    product._id.toString(),
        sku:          product.sku,
        name:         product.name,
        qty,
        unitPrice:    product.price,
        lineTotal:    product.price * qty,
        balanceAfter: newAvailable,
      });
    }

    const subtotal = receiptItems.reduce((s, i) => s + i.lineTotal, 0);

    return NextResponse.json(
      {
        receipt: {
          billNumber,
          shopId,
          items: receiptItems,
          subtotal,
          total: subtotal,     // extend here if you add tax/discount later
          performedBy,
          note,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/billing]', err);
    return NextResponse.json({ error: 'Failed to process billing.' }, { status: 500 });
  }
}
