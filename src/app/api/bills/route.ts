import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BillModel } from '@/lib/models/Bill';

/**
 * GET /api/bills
 * Returns paginated bill history for a shop.
 *
 * Query params:
 *   shopId   — required
 *   page     — default 1
 *   limit    — default 20, max 100
 *   search   — optional: matches billNumber, customerName, customerPhone
 *   dateFrom — optional ISO date string (inclusive start)
 *   dateTo   — optional ISO date string (inclusive end)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const shopId   = searchParams.get('shopId')?.trim() ?? '';
    const page     = Math.max(1, Number(searchParams.get('page')  ?? 1));
    const limit    = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
    const search   = searchParams.get('search')?.trim() ?? '';
    const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo   = searchParams.get('dateTo')?.trim()   ?? '';

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { shopId };

    if (search) {
      filter.$or = [
        { billNumber:     { $regex: search, $options: 'i' } },
        { customerName:   { $regex: search, $options: 'i' } },
        { customerPhone:  { $regex: search, $options: 'i' } },
        { performedBy:    { $regex: search, $options: 'i' } },
        { 'items.name':   { $regex: search, $options: 'i' } },
        { 'items.sku':    { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        // include the full dateTo day
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [bills, total] = await Promise.all([
      BillModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BillModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      bills: bills.map(b => ({
        _id:           b._id.toString(),
        billNumber:    b.billNumber,
        shopId:        b.shopId,
        items:         b.items,
        subtotal:      b.subtotal,
        total:         b.total,
        customerName:  b.customerName,
        customerPhone: b.customerPhone,
        performedBy:   b.performedBy,
        note:          b.note,
        createdAt:     b.createdAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/bills]', err);
    return NextResponse.json({ error: 'Failed to fetch bills.' }, { status: 500 });
  }
}
