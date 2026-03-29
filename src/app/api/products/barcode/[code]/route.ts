import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/products/barcode/[code]
 * Looks up a product by its SKU (used as the barcode value).
 * Used by the billing page when a barcode is scanned.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();

    const { code } = await context.params;
    const shopId = request.nextUrl.searchParams.get('shopId')?.trim() ?? '';

    if (!code) {
      return NextResponse.json({ error: 'Barcode code is required.' }, { status: 400 });
    }

    const filter: Record<string, unknown> = {
      sku: { $regex: `^${decodeURIComponent(code)}$`, $options: 'i' },
    };
    if (shopId) filter.shopId = shopId;

    const product = await ProductModel.findOne(filter).lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found for this barcode.' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        _id:          product._id.toString(),
        sku:          product.sku,
        name:         product.name,
        description:  product.description ?? '',
        price:        product.price,
        availableQty: product.availableQty,
        shopId:       product.shopId,
      },
    });
  } catch (err) {
    console.error('[GET /api/products/barcode/:code]', err);
    return NextResponse.json({ error: 'Failed to look up product.' }, { status: 500 });
  }
}
