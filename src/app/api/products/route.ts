import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { cleanupExpiredBillingReservations, getReservedQtyByOtherUsers } from '@/lib/billing/reservations';
import { ProductModel } from '@/lib/models/Product';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { SettingsModel } from '@/lib/models/Settings';

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

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeOptionalThreshold(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function normalizeOptionalRate(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return null;
  return Number(parsed.toFixed(2));
}

function getPurchaseDetailsState(input: {
  purchasePrice: number | null;
  purchaseDate: Date | null;
  tax: number | null;
  transportationCost: number | null;
}) {
  const missingFields: string[] = [];
  if (input.purchasePrice === null) missingFields.push('purchasePrice');
  if (input.purchaseDate === null) missingFields.push('purchaseDate');
  if (input.tax === null) missingFields.push('tax');
  if (input.transportationCost === null) missingFields.push('transportationCost');

  return {
    purchaseDetailsStatus: missingFields.length === 0 ? 'complete' as const : 'pending' as const,
    purchaseDetailsMissingFields: missingFields,
  };
}

// ── GET /api/products ──────────────────────────────────────────────────────────
// Query params: search, page (default 1), limit (default 50), sort, dir

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search')?.trim() ?? '';
    const shopId = searchParams.get('shopId')?.trim() ?? '';
    const currentUserId = searchParams.get('currentUserId')?.trim() ?? '';
    const sourceState = searchParams.get('sourceState')?.trim() ?? '';
    const sourceDistrict = searchParams.get('sourceDistrict')?.trim() ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
    const sort = searchParams.get('sort') ?? 'createdAt';
    const dir = searchParams.get('dir') === 'asc' ? 1 : -1;
    const expiryFilter = searchParams.get('expiry') ?? 'all'; // all | expiring-soon | expired
    const purchaseDetailsStatus = searchParams.get('purchaseDetailsStatus')?.trim() ?? 'all';

    const allowedSorts = ['name', 'price', 'totalQty', 'availableQty', 'createdAt', 'expiryDate'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

    const filter: Record<string, unknown> = {};
    if (shopId) filter.shopId = shopId;
    if (sourceState) filter.sourceState = { $regex: sourceState, $options: 'i' };
    if (sourceDistrict) filter.sourceDistrict = { $regex: sourceDistrict, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { hsnCode: { $regex: search, $options: 'i' } },
        { sourceState: { $regex: search, $options: 'i' } },
        { sourceDistrict: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (expiryFilter === 'expired')      filter.expiryDate = { $ne: null, $lt: now };
    if (expiryFilter === 'expiring-soon') filter.expiryDate = { $ne: null, $gte: now, $lte: in30Days };
    if (purchaseDetailsStatus === 'pending' || purchaseDetailsStatus === 'complete') {
      filter.purchaseDetailsStatus = purchaseDetailsStatus;
    }

    const [products, total, settings] = await Promise.all([
      ProductModel.find(filter)
        .sort({ [sortField]: dir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
      SettingsModel.findOne({}).lean(),
    ]);

    let reservedByOtherUsers = new Map<string, number>();
    if (shopId && currentUserId && products.length > 0) {
      await cleanupExpiredBillingReservations(shopId);
      reservedByOtherUsers = await getReservedQtyByOtherUsers({
        shopId,
        productIds: products.map(product => product._id.toString()),
        currentUserId,
      });
    }

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
        hsnCode: p.hsnCode ?? '',
        sourceState: p.sourceState ?? '',
        sourceDistrict: p.sourceDistrict ?? '',
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        totalQty: p.totalQty,
        availableQty: p.availableQty,
        scannableQty: Math.max(0, Number(p.availableQty ?? 0) - (reservedByOtherUsers.get(p._id.toString()) ?? 0)),
        reservedByOthers: reservedByOtherUsers.get(p._id.toString()) ?? 0,
        gauge: p.gauge ?? '',
        weight: p.weight ?? '',
        purchasePrice: p.purchasePrice ?? 0,
        purchaseDate: p.purchaseDate ?? null,
        tax: p.tax ?? 0,
        saleGstRate: p.saleGstRate ?? 0,
        transportationCost: p.transportationCost ?? 0,
        lowStockAlertQty: p.lowStockAlertQty ?? null,
        purchaseDetailsStatus: p.purchaseDetailsStatus ?? 'complete',
        purchaseDetailsMissingFields: p.purchaseDetailsMissingFields ?? [],
        mfgDate: p.mfgDate ?? null,
        expiryDate: p.expiryDate ?? null,
        createdAt: p.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      settings: {
        lowStockThreshold: settings?.lowStockThreshold ?? 20,
      },
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
    const hsnCode = String(body.hsnCode ?? '').trim();
    const sourceState = String(body.sourceState ?? '').trim();
    const sourceDistrict = String(body.sourceDistrict ?? '').trim();
    const shopId = String(body.shopId ?? '').trim();
    const gauge = String(body.gauge ?? '').trim();
    const weight = String(body.weight ?? '').trim();
    const purchasePrice = normalizeOptionalNumber(body.purchasePrice);
    const purchaseDate = normalizeOptionalDate(body.purchaseDate);
    const tax = normalizeOptionalNumber(body.tax);
    const saleGstRate = normalizeOptionalRate(body.saleGstRate);
    const transportationCost = normalizeOptionalNumber(body.transportationCost);
    const lowStockAlertQty = normalizeOptionalThreshold(body.lowStockAlertQty);
    const mfgDate    = body.mfgDate    ? new Date(body.mfgDate)    : null;
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    const purchaseDetailsState = getPurchaseDetailsState({ purchasePrice, purchaseDate, tax, transportationCost });

    if (!name) return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    if (!shopId) return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    if (isNaN(price) || price < 0) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
    if (isNaN(quantity) || quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1.' }, { status: 400 });
    if (!gauge) return NextResponse.json({ error: 'Gauge is required.' }, { status: 400 });
    if (!weight) return NextResponse.json({ error: 'Weight is required.' }, { status: 400 });
    if (purchasePrice !== null && purchasePrice < 0) return NextResponse.json({ error: 'Invalid purchasing price.' }, { status: 400 });
    if (body.purchaseDate && !purchaseDate) return NextResponse.json({ error: 'Invalid purchasing date.' }, { status: 400 });
    if (tax !== null && tax < 0) return NextResponse.json({ error: 'Invalid tax amount.' }, { status: 400 });
    if (body.saleGstRate !== undefined && saleGstRate === null && body.saleGstRate !== '' && body.saleGstRate !== null) {
      return NextResponse.json({ error: 'Invalid included GST rate.' }, { status: 400 });
    }
    if (transportationCost !== null && transportationCost < 0) return NextResponse.json({ error: 'Invalid transportation cost.' }, { status: 400 });
    if (body.lowStockAlertQty !== undefined && lowStockAlertQty === null && body.lowStockAlertQty !== '' && body.lowStockAlertQty !== null) {
      return NextResponse.json({ error: 'Invalid low stock alert quantity.' }, { status: 400 });
    }

    // ── Upsert: if a product with the same name already exists in the same shop, add to its qty ──
    const existingByName = await ProductModel.findOne({
      shopId,
      name: { $regex: `^${name}$`, $options: 'i' },
    });

    if (existingByName) {
      const prevCounter = existingByName.unitCounter ?? existingByName.totalQty;
      if (hsnCode) {
        existingByName.hsnCode = hsnCode;
      }
      if (sourceState) {
        existingByName.sourceState = sourceState;
      }
      if (sourceDistrict) {
        existingByName.sourceDistrict = sourceDistrict;
      }
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
            hsnCode: existingByName.hsnCode ?? '',
            sourceState: existingByName.sourceState ?? '',
            sourceDistrict: existingByName.sourceDistrict ?? '',
            name: existingByName.name,
            description: existingByName.description,
            price: existingByName.price,
            gauge: existingByName.gauge ?? '',
            weight: existingByName.weight ?? '',
            purchasePrice: existingByName.purchasePrice ?? 0,
            purchaseDate: existingByName.purchaseDate ?? null,
            tax: existingByName.tax ?? 0,
            saleGstRate: existingByName.saleGstRate ?? 0,
            transportationCost: existingByName.transportationCost ?? 0,
            lowStockAlertQty: existingByName.lowStockAlertQty ?? null,
            purchaseDetailsStatus: existingByName.purchaseDetailsStatus ?? 'complete',
            purchaseDetailsMissingFields: existingByName.purchaseDetailsMissingFields ?? [],
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
      hsnCode,
      sourceState,
      sourceDistrict,
      name,
      description,
      price,
      gauge,
      weight,
      purchasePrice: purchasePrice ?? 0,
      purchaseDate,
      tax: tax ?? 0,
      saleGstRate: saleGstRate ?? 0,
      transportationCost: transportationCost ?? 0,
      lowStockAlertQty,
      purchaseDetailsStatus: purchaseDetailsState.purchaseDetailsStatus,
      purchaseDetailsMissingFields: purchaseDetailsState.purchaseDetailsMissingFields,
      totalQty: quantity,
      availableQty: quantity,
      unitCounter: quantity,
      mfgDate,
      expiryDate,
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
