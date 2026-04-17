import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseOptionalThreshold(value: unknown) {
  if (value === undefined) return { provided: false, value: null as number | null, invalid: false };
  if (value === null || value === '') return { provided: true, value: null as number | null, invalid: false };
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return { provided: true, value: null as number | null, invalid: true };
  return { provided: true, value: Math.floor(parsed), invalid: false };
}

function parseOptionalRate(value: unknown) {
  if (value === undefined) return { provided: false, value: null as number | null, invalid: false };
  if (value === null || value === '') return { provided: true, value: 0, invalid: false };
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return { provided: true, value: null as number | null, invalid: true };
  return { provided: true, value: Number(parsed.toFixed(2)), invalid: false };
}

function recalculatePurchaseDetails(updates: Record<string, unknown>, currentMissingFields: string[] = []) {
  const missing = new Set(currentMissingFields);

  if (Object.prototype.hasOwnProperty.call(updates, 'purchasePrice')) {
    const value = updates.purchasePrice;
    if (value === null || value === undefined || value === '') missing.add('purchasePrice');
    else missing.delete('purchasePrice');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'purchaseDate')) {
    const value = updates.purchaseDate;
    if (value === null || value === undefined || value === '') missing.add('purchaseDate');
    else missing.delete('purchaseDate');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'tax')) {
    const value = updates.tax;
    if (value === null || value === undefined || value === '') missing.add('tax');
    else missing.delete('tax');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'transportationCost')) {
    const value = updates.transportationCost;
    if (value === null || value === undefined || value === '') missing.add('transportationCost');
    else missing.delete('transportationCost');
  }

  const missingFields = Array.from(missing);
  updates.purchaseDetailsStatus = missingFields.length === 0 ? 'complete' : 'pending';
  updates.purchaseDetailsMissingFields = missingFields;
}

// ── PATCH /api/products/[id] ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const existingProduct = await ProductModel.findById(id).select('purchaseDetailsMissingFields');
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
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

    if (body.hsnCode !== undefined) {
      updates.hsnCode = String(body.hsnCode ?? '').trim();
    }

    if (body.sourceState !== undefined) {
      updates.sourceState = String(body.sourceState ?? '').trim();
    }

    if (body.sourceDistrict !== undefined) {
      updates.sourceDistrict = String(body.sourceDistrict ?? '').trim();
    }

    if (body.gauge !== undefined) {
      const gauge = String(body.gauge).trim();
      if (!gauge) return NextResponse.json({ error: 'Gauge cannot be empty.' }, { status: 400 });
      updates.gauge = gauge;
    }

    if (body.weight !== undefined) {
      const weight = String(body.weight).trim();
      if (!weight) return NextResponse.json({ error: 'Weight cannot be empty.' }, { status: 400 });
      updates.weight = weight;
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

    if (body.purchasePrice !== undefined) {
      if (body.purchasePrice === null || body.purchasePrice === '') {
        updates.purchasePrice = null;
      } else {
        const purchasePrice = Number(body.purchasePrice);
        if (isNaN(purchasePrice) || purchasePrice < 0) return NextResponse.json({ error: 'Invalid purchasing price.' }, { status: 400 });
        updates.purchasePrice = purchasePrice;
      }
    }

    if (body.purchaseDate !== undefined) {
      const purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
      if (purchaseDate && Number.isNaN(purchaseDate.getTime())) {
        return NextResponse.json({ error: 'Invalid purchasing date.' }, { status: 400 });
      }
      updates.purchaseDate = purchaseDate;
    }

    if (body.tax !== undefined) {
      if (body.tax === null || body.tax === '') {
        updates.tax = null;
      } else {
        const tax = Number(body.tax);
        if (isNaN(tax) || tax < 0) return NextResponse.json({ error: 'Invalid tax amount.' }, { status: 400 });
        updates.tax = tax;
      }
    }

    if (body.saleGstRate !== undefined) {
      const parsedRate = parseOptionalRate(body.saleGstRate);
      if (parsedRate.invalid) {
        return NextResponse.json({ error: 'Invalid included GST rate.' }, { status: 400 });
      }
      updates.saleGstRate = parsedRate.value;
    }

    if (body.transportationCost !== undefined) {
      if (body.transportationCost === null || body.transportationCost === '') {
        updates.transportationCost = null;
      } else {
        const transportationCost = Number(body.transportationCost);
        if (isNaN(transportationCost) || transportationCost < 0) return NextResponse.json({ error: 'Invalid transportation cost.' }, { status: 400 });
        updates.transportationCost = transportationCost;
      }
    }

    if (body.lowStockAlertQty !== undefined) {
      const parsedThreshold = parseOptionalThreshold(body.lowStockAlertQty);
      if (parsedThreshold.invalid) {
        return NextResponse.json({ error: 'Invalid low stock alert quantity.' }, { status: 400 });
      }
      updates.lowStockAlertQty = parsedThreshold.value;
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

    recalculatePurchaseDetails(updates, existingProduct.purchaseDetailsMissingFields ?? []);

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
        hsnCode: product.hsnCode ?? '',
        sourceState: product.sourceState ?? '',
        sourceDistrict: product.sourceDistrict ?? '',
        name: product.name,
        description: product.description,
        price: product.price,
        gauge: product.gauge ?? '',
        weight: product.weight ?? '',
        purchasePrice: product.purchasePrice ?? 0,
        purchaseDate: product.purchaseDate ?? null,
        tax: product.tax ?? 0,
        saleGstRate: product.saleGstRate ?? 0,
        transportationCost: product.transportationCost ?? 0,
        lowStockAlertQty: product.lowStockAlertQty ?? null,
        purchaseDetailsStatus: product.purchaseDetailsStatus ?? 'complete',
        purchaseDetailsMissingFields: product.purchaseDetailsMissingFields ?? [],
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
