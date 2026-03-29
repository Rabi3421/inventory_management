import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';

// ── helpers ────────────────────────────────────────────────────────────────────

function generateSKU(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SKU-${ts}-${rand}`;
}

/**
 * Derives a short alphabetic prefix from a product name for unit serial numbers.
 * e.g. "Steel Glass" → "SG", "Fogg Perfume" → "FP", "Samsung" → "SAM"
 */
function unitPrefix(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map(w => w[0]).join('').slice(0, 4);
  return (words[0] ?? 'P').slice(0, 4);
}

// ── GET /api/products ──────────────────────────────────────────────────────────
// Query params: search, page (default 1), limit (default 50), sort, dir

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search')?.trim() ?? '';
    const shopId = searchParams.get('shopId')?.trim() ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
    const sort = searchParams.get('sort') ?? 'createdAt';
    const dir = searchParams.get('dir') === 'asc' ? 1 : -1;

    const allowedSorts = ['name', 'price', 'totalQty', 'availableQty', 'createdAt'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

    const filter: Record<string, unknown> = {};
    if (shopId) filter.shopId = shopId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ [sortField]: dir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    // Stats — scoped to the same shopId filter (or global if no shopId)
    const statsFilter: Record<string, unknown> = shopId ? { shopId } : {};
    const [statsResult] = await ProductModel.aggregate([
      { $match: statsFilter },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$totalQty' },
          availableUnits: { $sum: '$availableQty' },
          catalogValue: { $sum: { $multiply: ['$price', '$availableQty'] } },
        },
      },
    ]);

    return NextResponse.json({
      products: products.map(p => ({
        _id: p._id.toString(),
        sku: p.sku,
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        totalQty: p.totalQty,
        availableQty: p.availableQty,
        createdAt: p.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: statsResult
        ? {
            totalProducts: statsResult.totalProducts,
            totalUnits: statsResult.totalUnits,
            availableUnits: statsResult.availableUnits,
            catalogValue: statsResult.catalogValue,
          }
        : { totalProducts: 0, totalUnits: 0, availableUnits: 0, catalogValue: 0 },
    });
  } catch (err) {
    console.error('[GET /api/products]', err);
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}

// ── POST /api/products ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const description = String(body.description ?? '').trim();
    const price = Number(body.price);
    const quantity = Math.floor(Number(body.quantity));
    const skuRaw = String(body.sku ?? '').trim().toUpperCase();
    const sku = skuRaw || generateSKU();
    const shopId = String(body.shopId ?? '').trim();

    if (!name) return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    if (!shopId) return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    if (isNaN(price) || price < 0) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
    if (isNaN(quantity) || quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1.' }, { status: 400 });

    // ── Upsert: if a product with the same name already exists in the same shop, add to its qty ──
    const existingByName = await ProductModel.findOne({
      shopId,
      name: { $regex: `^${name}$`, $options: 'i' },
    });

    if (existingByName) {
      const prevCounter = existingByName.unitCounter ?? existingByName.totalQty;
      // Atomically increment totals + counter
      existingByName.totalQty += quantity;
      existingByName.availableQty += quantity;
      existingByName.unitCounter = prevCounter + quantity;
      await existingByName.save();

      // Record restock movement in the inventory ledger
      await InventoryLogModel.create({
        shopId,
        productId: existingByName._id,
        productName: existingByName.name,
        productSku: existingByName.sku,
        type: 'restock',
        qty: quantity,
        balanceAfter: existingByName.availableQty,
        note: `Restocked ${quantity} unit${quantity !== 1 ? 's' : ''}`,
        performedBy: 'superadmin',
      });

      const prefix = unitPrefix(existingByName.name);
      const padWidth = String(existingByName.unitCounter).length;
      const unitBarcodes: string[] = Array.from({ length: quantity }, (_, i) =>
        `${prefix}-${String(prevCounter + i + 1).padStart(padWidth, '0')}`,
      );

      return NextResponse.json(
        {
          product: {
            _id: existingByName._id.toString(),
            sku: existingByName.sku,
            name: existingByName.name,
            description: existingByName.description,
            price: existingByName.price,
            totalQty: existingByName.totalQty,
            availableQty: existingByName.availableQty,
            createdAt: existingByName.createdAt,
          },
          unitBarcodes,
          barcodePrintUrl: `/api/products/${existingByName._id.toString()}/barcodes?from=${prevCounter + 1}`,
          restocked: true,
        },
        { status: 200 },
      );
    }

    // ── New product — check SKU uniqueness then create ─────────────────────────
    if (skuRaw) {
      const skuConflict = await ProductModel.findOne({ sku });
      if (skuConflict) {
        return NextResponse.json({ error: `SKU "${sku}" is already in use.` }, { status: 409 });
      }
    }

    const product = await ProductModel.create({
      shopId,
      sku,
      name,
      description,
      price,
      totalQty: quantity,
      availableQty: quantity,
      unitCounter: quantity,
    });

    // Record initial purchase in the inventory ledger
    await InventoryLogModel.create({
      shopId,
      productId: product._id,
      productName: product.name,
      productSku: product.sku,
      type: 'purchase',
      qty: quantity,
      balanceAfter: quantity,
      note: `Initial stock of ${quantity} unit${quantity !== 1 ? 's' : ''} added`,
      performedBy: 'superadmin',
    });

    const prefix = unitPrefix(product.name);
    const padWidth = String(quantity).length;
    const unitBarcodes: string[] = Array.from({ length: quantity }, (_, i) =>
      `${prefix}-${String(i + 1).padStart(padWidth, '0')}`,
    );

    return NextResponse.json(
      {
        product: {
          _id: product._id.toString(),
          sku: product.sku,
          name: product.name,
          description: product.description,
          price: product.price,
          totalQty: product.totalQty,
          availableQty: product.availableQty,
          createdAt: product.createdAt,
        },
        unitBarcodes,
        barcodePrintUrl: `/api/products/${product._id.toString()}/barcodes`,
        restocked: false,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error('[POST /api/products]', err);
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json({ error: 'A product with that SKU already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}
