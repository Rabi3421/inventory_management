import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PATCH /api/products/[id] ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      updates.name = name;
    }

    if (body.description !== undefined) {
      updates.description = String(body.description).trim();
    }

    if (body.price !== undefined) {
      const price = Number(body.price);
      if (isNaN(price) || price < 0) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
      updates.price = price;
    }

    if (body.totalQty !== undefined) {
      const tq = Math.floor(Number(body.totalQty));
      if (isNaN(tq) || tq < 0) return NextResponse.json({ error: 'Invalid total quantity.' }, { status: 400 });
      updates.totalQty = tq;
    }

    if (body.availableQty !== undefined) {
      const aq = Math.floor(Number(body.availableQty));
      if (isNaN(aq) || aq < 0) return NextResponse.json({ error: 'Invalid available quantity.' }, { status: 400 });
      updates.availableQty = aq;
    }

    if (body.sku !== undefined) {
      const sku = String(body.sku).trim().toUpperCase();
      if (sku) {
        // Ensure SKU not taken by a different product
        const conflict = await ProductModel.findOne({ sku, _id: { $ne: id } });
        if (conflict) {
          return NextResponse.json({ error: `SKU "${sku}" is already used by another product.` }, { status: 409 });
        }
        updates.sku = sku;
      }
    }

    if (body.mfgDate !== undefined) {
      updates.mfgDate = body.mfgDate ? new Date(body.mfgDate) : null;
    }

    if (body.expiryDate !== undefined) {
      updates.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        _id: product._id.toString(),
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        totalQty: product.totalQty,
        availableQty: product.availableQty,
        mfgDate: product.mfgDate ?? null,
        expiryDate: product.expiryDate ?? null,
        createdAt: product.createdAt,
      },
    });
  } catch (err) {
    console.error('[PATCH /api/products/:id]', err);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}

// ── DELETE /api/products/[id] ─────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/products/:id]', err);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}
