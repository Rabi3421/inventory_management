import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { BillModel } from '@/lib/models/Bill';
import { BillReturnModel } from '@/lib/models/BillReturn';

function money(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ billId: string }> },
) {
  try {
    await connectToDatabase();

    const { billId } = await context.params;
    const shopId = request.nextUrl.searchParams.get('shopId')?.trim() ?? '';

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }
    if (!billId || !mongoose.isValidObjectId(billId)) {
      return NextResponse.json({ error: 'Valid billId is required.' }, { status: 400 });
    }

    const [bill, returns] = await Promise.all([
      BillModel.findOne({ _id: billId, shopId }).lean(),
      BillReturnModel.find({ billId, shopId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    }

    const returnedQtyByProduct = new Map<string, number>();
    for (const entry of returns) {
      for (const item of entry.items) {
        returnedQtyByProduct.set(item.productId, (returnedQtyByProduct.get(item.productId) ?? 0) + item.qty);
      }
    }

    return NextResponse.json({
      bill: {
        _id: bill._id.toString(),
        billNumber: bill.billNumber,
        shopId: bill.shopId,
        subtotal: bill.subtotal,
        gstAmount: bill.gstAmount,
        total: bill.total,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        note: bill.note,
        performedBy: bill.performedBy,
        createdAt: bill.createdAt.toISOString(),
        items: bill.items.map(item => {
          const returnedQty = returnedQtyByProduct.get(item.productId) ?? 0;
          const remainingQty = Math.max(0, item.qty - returnedQty);
          return {
            productId: item.productId,
            sku: item.sku,
            hsnCode: item.hsnCode ?? '',
            name: item.name,
            qty: item.qty,
            returnedQty,
            remainingQty,
            unitPrice: item.unitPrice,
            lineTotal: money(item.lineTotal),
            gstRate: Number(item.gstRate ?? 0),
            gstAmount: money(Number(item.gstAmount ?? 0)),
          };
        }),
      },
      returnHistory: returns.map(entry => ({
        _id: entry._id.toString(),
        returnNumber: entry.returnNumber,
        billId: entry.billId,
        billNumber: entry.billNumber,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        reason: entry.reason,
        note: entry.note,
        performedBy: entry.performedBy,
        subtotal: money(entry.subtotal),
        gstAmount: money(entry.gstAmount),
        totalRefund: money(entry.totalRefund),
        createdAt: entry.createdAt.toISOString(),
        items: entry.items.map(item => ({
          productId: item.productId,
          sku: item.sku,
          hsnCode: item.hsnCode ?? '',
          name: item.name,
          qty: item.qty,
          unitPrice: money(item.unitPrice),
          gstRate: Number(item.gstRate ?? 0),
          gstAmount: money(Number(item.gstAmount ?? 0)),
          lineTotal: money(item.lineTotal),
        })),
      })),
    });
  } catch (error) {
    console.error('[GET /api/returns/bill/:billId]', error);
    return NextResponse.json({ error: 'Failed to fetch bill return details.' }, { status: 500 });
  }
}
