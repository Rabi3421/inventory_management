import type { HydratedDocument, Types } from 'mongoose';
import { Schema, model, models } from 'mongoose';

export interface BillReturnItem {
  productId: string;
  sku: string;
  hsnCode?: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
}

export interface BillReturn {
  _id: Types.ObjectId;
  returnNumber: string;
  billId: string;
  billNumber: string;
  shopId: string;
  items: BillReturnItem[];
  subtotal: number;
  gstAmount: number;
  totalRefund: number;
  customerName: string;
  customerPhone: string;
  reason: string;
  note: string;
  performedBy: string;
  performedByUserId?: string;
  performedByRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billReturnItemSchema = new Schema<BillReturnItem>(
  {
    productId: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0, max: 100, default: 0 },
    gstAmount: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const billReturnSchema = new Schema<BillReturn>(
  {
    returnNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    billId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    billNumber: {
      type: String,
      required: true,
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
      type: [billReturnItemSchema],
      required: true,
      default: [],
    },
    subtotal: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0, default: 0 },
    totalRefund: { type: Number, required: true, min: 0 },
    customerName: { type: String, trim: true, default: '' },
    customerPhone: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    performedBy: { type: String, trim: true, default: 'shop-admin' },
    performedByUserId: { type: String, trim: true, default: '' },
    performedByRole: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

billReturnSchema.index({ shopId: 1, createdAt: -1 });
billReturnSchema.index({ billId: 1, createdAt: -1 });

export type BillReturnDocument = HydratedDocument<BillReturn>;

if (models.BillReturn) {
  delete (models as Record<string, unknown>).BillReturn;
}

export const BillReturnModel = model<BillReturn>('BillReturn', billReturnSchema);
