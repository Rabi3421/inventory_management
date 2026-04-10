import type { HydratedDocument, Types } from 'mongoose';
import { Schema, models, model } from 'mongoose';

/**
 * A Bill is a permanent record of a completed sale transaction.
 * One Bill is created per checkout and stores the full receipt snapshot:
 * line items, totals, customer details, and who performed the sale.
 */

export interface BillItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  balanceAfter: number;
}

export interface Bill {
  _id: Types.ObjectId;
  billNumber: string;
  shopId: string;
  items: BillItem[];
  subtotal: number;
  gstRate: number;      // percentage, e.g. 5 / 12 / 18 / 28 / 0
  gstAmount: number;    // subtotal * gstRate / 100
  total: number;        // subtotal + gstAmount
  customerName: string;
  customerPhone: string;
  performedBy: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const billItemSchema = new Schema<BillItem>(
  {
    productId:    { type: String, required: true },
    sku:          { type: String, required: true, trim: true },
    name:         { type: String, required: true, trim: true },
    qty:          { type: Number, required: true, min: 1 },
    unitPrice:    { type: Number, required: true, min: 0 },
    lineTotal:    { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const billSchema = new Schema<Bill>(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    shopId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    items: {
      type: [billItemSchema],
      required: true,
    },
    subtotal:   { type: Number, required: true, min: 0 },
    gstRate:    { type: Number, required: true, min: 0, default: 0 },
    gstAmount:  { type: Number, required: true, min: 0, default: 0 },
    total:      { type: Number, required: true, min: 0 },
    customerName:  { type: String, trim: true, default: '' },
    customerPhone: { type: String, trim: true, default: '' },
    performedBy:   { type: String, trim: true, default: 'shop-admin' },
    note:          { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

// Compound index for fast shop bill listing sorted by date
billSchema.index({ shopId: 1, createdAt: -1 });

export type BillDocument = HydratedDocument<Bill>;

if (models.Bill) {
  delete (models as Record<string, unknown>).Bill;
}

export const BillModel = model<Bill>('Bill', billSchema);
