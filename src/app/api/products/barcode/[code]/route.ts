import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { cleanupExpiredBillingReservations, getReservedQtyByOtherUsers } from '@/lib/billing/reservations';
import { ProductModel } from '@/lib/models/Product';

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * Derives the short barcode prefix from a product name.
 * Mirrors the same logic used in the barcodes generation route.
 * e.g. "Redmi Mobile Phone" → "RMP", "Samsung" → "SAM"
 */
function unitPrefix(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map(w => w[0]).join('').slice(0, 4);
  return (words[0] ?? 'P').slice(0, 4);
}

/**
 * GET /api/products/barcode/[code]
 * Looks up a product by scanned barcode value.
 *
 * Supports two barcode formats:
 *   1. Exact SKU match         — e.g. "RMP-001" stored as product.sku
 *   2. Per-unit serial code    — e.g. "RMP-15"  (prefix-unitNumber, as generated
 *      by the barcodes print route). Strips the trailing number, derives the
 *      prefix, then finds the product whose name generates that same prefix.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();

    const { code } = await context.params;
    const shopId = request.nextUrl.searchParams.get('shopId')?.trim() ?? '';
    const currentUserId = request.nextUrl.searchParams.get('currentUserId')?.trim() ?? '';

    if (!code) {
      return NextResponse.json({ error: 'Barcode code is required.' }, { status: 400 });
    }

    const decoded = decodeURIComponent(code).trim();
    const filter: Record<string, unknown> = {};
    if (shopId) filter.shopId = shopId;

    // ── Strategy 1: exact SKU match ─────────────────────────────────────────
    let product = await ProductModel.findOne({
      ...filter,
      sku: { $regex: `^${decoded}$`, $options: 'i' },
    }).lean();

    // ── Strategy 2: unit serial match (PREFIX-N format) ─────────────────────
    // If no SKU match, treat the code as a per-unit serial like "RMP-15":
    // strip the trailing "-<digits>" to get the prefix, then find the product
    // whose name yields that same prefix via unitPrefix().
    if (!product) {
      const prefixMatch = decoded.match(/^([A-Z0-9]+)-\d+$/i);
      if (prefixMatch) {
        const scannedPrefix = prefixMatch[1].toUpperCase();
        // Fetch all products for this shop (or all if no shopId) and find
        // the one whose name-derived prefix matches the scanned prefix.
        const candidates = await ProductModel.find(filter).lean();
        product = candidates.find(p => unitPrefix(p.name) === scannedPrefix) ?? null;
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found for this barcode.' }, { status: 404 });
    }

    let reservedByOthers = 0;
    let scannableQty = Number(product.availableQty ?? 0);

    if (shopId) {
      await cleanupExpiredBillingReservations(shopId);
      const reservedMap = await getReservedQtyByOtherUsers({
        shopId,
        productIds: [product._id.toString()],
        currentUserId,
      });
      reservedByOthers = reservedMap.get(product._id.toString()) ?? 0;
      scannableQty = Math.max(0, Number(product.availableQty ?? 0) - reservedByOthers);
    }

    return NextResponse.json({
      product: {
        _id:          product._id.toString(),
        sku:          product.sku,
        name:         product.name,
        description:  product.description ?? '',
        price:        product.price,
        saleGstRate:  product.saleGstRate ?? 0,
        availableQty: product.availableQty,
        scannableQty,
        reservedByOthers,
        shopId:       product.shopId,
      },
    });
  } catch (err) {
    console.error('[GET /api/products/barcode/:code]', err);
    return NextResponse.json({ error: 'Failed to look up product.' }, { status: 500 });
  }
}
