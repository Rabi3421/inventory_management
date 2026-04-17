import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { BillModel } from '@/lib/models/Bill';
import { BillReturnModel } from '@/lib/models/BillReturn';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { ProductModel } from '@/lib/models/Product';

function money(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReturnNumber() {
  return `RET-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const shopId = searchParams.get('shopId')?.trim() ?? '';
    const performedByUserId = searchParams.get('performedByUserId')?.trim() ?? '';
    const search = searchParams.get('search')?.trim() ?? '';
    const limit = Math.min(25, Math.max(1, Number(searchParams.get('limit') ?? 12)));

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }

    const returnFilter: Record<string, unknown> = { shopId };
    if (performedByUserId) {
      returnFilter.performedByUserId = performedByUserId;
    }

    if (search) {
      const regex = { $regex: escapeRegex(search), $options: 'i' };
      returnFilter.$or = [
        { returnNumber: regex },
        { billNumber: regex },
        { customerPhone: regex },
        { customerName: regex },
        { 'items.name': regex },
        { 'items.sku': regex },
      ];
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [returns, totalReturns, summaryRows, todayRows, matchingBills] = await Promise.all([
      BillReturnModel.find(returnFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      BillReturnModel.countDocuments(returnFilter),
      BillReturnModel.aggregate([
        { $match: returnFilter },
        {
          $group: {
            _id: null,
            totalRefundAmount: { $sum: '$totalRefund' },
            totalReturnedItems: { $sum: { $sum: '$items.qty' } },
          },
        },
      ]),
      BillReturnModel.aggregate([
        {
          $match: {
            ...returnFilter,
            createdAt: { $gte: startOfToday },
          },
        },
        {
          $group: {
            _id: null,
            todayRefundAmount: { $sum: '$totalRefund' },
            todayReturnedItems: { $sum: { $sum: '$items.qty' } },
            todayReturns: { $sum: 1 },
          },
        },
      ]),
      search
        ? BillModel.find({
            shopId,
            $or: [
              { billNumber: { $regex: escapeRegex(search), $options: 'i' } },
              { customerPhone: { $regex: escapeRegex(search), $options: 'i' } },
              { customerName: { $regex: escapeRegex(search), $options: 'i' } },
            ],
          })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
        : Promise.resolve([]),
    ]);

    const summary = {
      totalReturns,
      totalRefundAmount: money(Number(summaryRows[0]?.totalRefundAmount ?? 0)),
      totalReturnedItems: Number(summaryRows[0]?.totalReturnedItems ?? 0),
      todayReturns: Number(todayRows[0]?.todayReturns ?? 0),
      todayRefundAmount: money(Number(todayRows[0]?.todayRefundAmount ?? 0)),
      todayReturnedItems: Number(todayRows[0]?.todayReturnedItems ?? 0),
    };

    return NextResponse.json({
      returns: returns.map(entry => ({
        _id: entry._id.toString(),
        returnNumber: entry.returnNumber,
        billId: entry.billId,
        billNumber: entry.billNumber,
        shopId: entry.shopId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        reason: entry.reason,
        note: entry.note,
        performedBy: entry.performedBy,
        performedByUserId: entry.performedByUserId ?? '',
        performedByRole: entry.performedByRole ?? '',
        items: entry.items.map(item => ({
          productId: item.productId,
          sku: item.sku,
          hsnCode: item.hsnCode ?? '',
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
        })),
        subtotal: entry.subtotal,
        gstAmount: entry.gstAmount,
        totalRefund: entry.totalRefund,
        createdAt: entry.createdAt.toISOString(),
      })),
      matchingBills: matchingBills.map(bill => ({
        _id: bill._id.toString(),
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        total: bill.total,
        itemCount: bill.items.reduce((sum, item) => sum + item.qty, 0),
        createdAt: bill.createdAt.toISOString(),
      })),
      summary,
    });
  } catch (error) {
    console.error('[GET /api/returns]', error);
    return NextResponse.json({ error: 'Failed to fetch return data.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const shopId = String(body.shopId ?? '').trim();
    const billId = String(body.billId ?? '').trim();
    const performedBy = String(body.performedBy ?? 'shop-admin').trim();
    const performedByUserId = String(body.performedByUserId ?? '').trim();
    const performedByRole = String(body.performedByRole ?? '').trim();
    const reason = String(body.reason ?? '').trim();
    const note = String(body.note ?? '').trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required.' }, { status: 400 });
    }
    if (!billId || !mongoose.isValidObjectId(billId)) {
      return NextResponse.json({ error: 'Valid billId is required.' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'Return reason is required.' }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Select at least one product to return.' }, { status: 400 });
    }

    const bill = await BillModel.findOne({ _id: billId, shopId }).lean();
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found for this shop.' }, { status: 404 });
    }

    const billItemsByProduct = new Map(bill.items.map(item => [item.productId, item]));
    const productIds = new Set<string>();
    const requestedItems = new Map<string, number>();

    for (const item of items) {
      const productId = String(item.productId ?? '').trim();
      const qty = Number(item.qty ?? 0);
      if (!productId || !billItemsByProduct.has(productId)) {
        return NextResponse.json({ error: `Invalid bill item selected: ${productId}` }, { status: 400 });
      }
      if (!Number.isFinite(qty) || qty < 1) {
        return NextResponse.json({ error: `Return quantity must be at least 1 for product ${productId}.` }, { status: 400 });
      }
      if (requestedItems.has(productId)) {
        return NextResponse.json({ error: 'Duplicate return items are not allowed.' }, { status: 400 });
      }
      requestedItems.set(productId, qty);
      productIds.add(productId);
    }

    const previousReturns = await BillReturnModel.find({ billId, shopId }).lean();
    const returnedQtyByProduct = new Map<string, number>();
    for (const prev of previousReturns) {
      for (const item of prev.items) {
        returnedQtyByProduct.set(item.productId, (returnedQtyByProduct.get(item.productId) ?? 0) + item.qty);
      }
    }

    const productDocs = await ProductModel.find({
      _id: { $in: Array.from(productIds).map(id => new mongoose.Types.ObjectId(id)) },
      shopId,
    });
    const productMap = new Map(productDocs.map(product => [product._id.toString(), product]));

    if (productMap.size !== productIds.size) {
      return NextResponse.json({ error: 'One or more products no longer exist in this shop.' }, { status: 404 });
    }

    const now = new Date();
    const returnItems: Array<{
      productId: string;
      sku: string;
      hsnCode: string;
      name: string;
      qty: number;
      unitPrice: number;
      lineTotal: number;
      gstRate: number;
      gstAmount: number;
    }> = [];

    for (const [productId, qty] of requestedItems.entries()) {
      const billItem = billItemsByProduct.get(productId)!;
      const alreadyReturnedQty = returnedQtyByProduct.get(productId) ?? 0;
      const remainingQty = billItem.qty - alreadyReturnedQty;
      if (qty > remainingQty) {
        return NextResponse.json({
          error: `Only ${remainingQty} unit(s) of ${billItem.name} can still be returned from this bill.`,
        }, { status: 422 });
      }

      const product = productMap.get(productId)!;
      product.availableQty += qty;
      await product.save();

      const lineTotal = money(billItem.unitPrice * qty);
      const gstRate = Math.max(0, Math.min(100, Number(billItem.gstRate ?? 0)));
      const gstAmount = gstRate > 0 ? money((lineTotal * gstRate) / (100 + gstRate)) : 0;

      await InventoryLogModel.create({
        shopId,
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        type: 'return',
        qty,
        balanceAfter: product.availableQty,
        note: note || `Customer return — Bill ${bill.billNumber}`,
        performedBy,
        createdAt: now,
      });

      returnItems.push({
        productId,
        sku: billItem.sku,
        hsnCode: String(billItem.hsnCode ?? '').trim(),
        name: billItem.name,
        qty,
        unitPrice: billItem.unitPrice,
        lineTotal,
        gstRate,
        gstAmount,
      });
    }

    const totalRefund = money(returnItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const gstAmount = money(returnItems.reduce((sum, item) => sum + item.gstAmount, 0));
    const subtotal = money(totalRefund - gstAmount);

    const createdReturn = await BillReturnModel.create({
      returnNumber: buildReturnNumber(),
      billId,
      billNumber: bill.billNumber,
      shopId,
      items: returnItems,
      subtotal,
      gstAmount,
      totalRefund,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      reason,
      note,
      performedBy,
      performedByUserId,
      performedByRole,
      createdAt: now,
    });

    return NextResponse.json({
      returnRecord: {
        _id: createdReturn._id.toString(),
        returnNumber: createdReturn.returnNumber,
        billId: createdReturn.billId,
        billNumber: createdReturn.billNumber,
        shopId: createdReturn.shopId,
        customerName: createdReturn.customerName,
        customerPhone: createdReturn.customerPhone,
        items: createdReturn.items,
        subtotal: createdReturn.subtotal,
        gstAmount: createdReturn.gstAmount,
        totalRefund: createdReturn.totalRefund,
        reason: createdReturn.reason,
        note: createdReturn.note,
        performedBy: createdReturn.performedBy,
        performedByUserId: createdReturn.performedByUserId ?? '',
        performedByRole: createdReturn.performedByRole ?? '',
        createdAt: createdReturn.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/returns]', error);
    return NextResponse.json({ error: 'Failed to process product return.' }, { status: 500 });
  }
}
