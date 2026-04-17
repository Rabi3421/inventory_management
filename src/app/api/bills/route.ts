import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BillModel } from '@/lib/models/Bill';

/**
 * GET /api/bills
 * Returns paginated bill history for a shop.
 *
 * Query params:
 *   shopId    — required
 *   page      — default 1
 *   limit     — default 20, max 100
 *   search    — optional: matches billNumber, customerName, customerPhone
 *   performedByUserId — optional exact employee filter
 *   dateFrom  — optional ISO date string (inclusive start)
 *   dateTo    — optional ISO date string (inclusive end)
 *   gstSummary — if "true", returns GST aggregation instead of bill list
 *   groupBy   — "day" (default) or "month", used when gstSummary=true
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const shopId     = searchParams.get('shopId')?.trim() ?? '';
    const performedByUserId = searchParams.get('performedByUserId')?.trim() ?? '';
    const dateFrom   = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo     = searchParams.get('dateTo')?.trim()   ?? '';
    const gstSummary = searchParams.get('gstSummary') === 'true';
    const groupBy    = searchParams.get('groupBy') === 'month' ? 'month' : 'day';

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }

    // ── GST Summary aggregation ──────────────────────────────────────────────
    if (gstSummary) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchStage: Record<string, any> = { shopId };
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          matchStage.createdAt.$lte = end;
        }
      }

      const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

      const rows = await BillModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id:          { $dateToString: { format: dateFormat, date: '$createdAt' } },
            gstCollected: { $sum: '$gstAmount' },
            revenue:      { $sum: '$total' },
            subtotal:     { $sum: '$subtotal' },
            billCount:    { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id:          0,
            period:       '$_id',
            gstCollected: { $round: ['$gstCollected', 2] },
            revenue:      { $round: ['$revenue', 2] },
            subtotal:     { $round: ['$subtotal', 2] },
            billCount:    1,
          },
        },
      ]);

      // Totals across the entire period
      const totals = rows.reduce(
        (acc, r) => ({
          gstCollected: parseFloat((acc.gstCollected + r.gstCollected).toFixed(2)),
          revenue:      parseFloat((acc.revenue      + r.revenue).toFixed(2)),
          subtotal:     parseFloat((acc.subtotal     + r.subtotal).toFixed(2)),
          billCount:    acc.billCount + r.billCount,
        }),
        { gstCollected: 0, revenue: 0, subtotal: 0, billCount: 0 },
      );

      return NextResponse.json({ rows, totals, groupBy });
    }

    // ── Paginated bill list ──────────────────────────────────────────────────
    const page    = Math.max(1, Number(searchParams.get('page')  ?? 1));
    const limit   = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
    const search  = searchParams.get('search')?.trim() ?? '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { shopId };

    if (performedByUserId) {
      filter.performedByUserId = performedByUserId;
    }

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
        gstRate:       b.gstRate   ?? 0,
        gstAmount:     b.gstAmount ?? 0,
        total:         b.total,
        customerName:  b.customerName,
        customerPhone: b.customerPhone,
        performedBy:   b.performedBy,
        performedByUserId: b.performedByUserId ?? '',
        performedByRole: b.performedByRole ?? '',
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

