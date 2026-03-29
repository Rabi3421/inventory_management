import type { HydratedDocument, Model, Types } from 'mongoose';
import { Schema, models, model } from 'mongoose';

/**
 * Every stock movement for every product is recorded here.
 * Think of it like a bank statement — each row is a transaction.
 *
 * Types:
 *   purchase   — new stock added (initial product creation)
 *   restock    — more units added to existing product
 *   sale       — units sold (deducted from availableQty)
 *   adjustment — manual correction (positive or negative qty)
 *   return     — units returned by customer
 */
export type LogType = 'purchase' | 'restock' | 'sale' | 'adjustment' | 'return';

export interface InventoryLog {
  shopId: string;        // which shop this log entry belongs to
  productId: Types.ObjectId;
  productName: string;   // denormalised for fast display
  productSku: string;    // denormalised for fast display
  type: LogType;
  qty: number;           // positive = stock in, negative = stock out
  balanceAfter: number;  // availableQty snapshot after this movement
  note: string;
  performedBy: string;   // user email / name
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLogSchema = new Schema<InventoryLog>(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: { type: String, required: true, trim: true },
    productSku:  { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['purchase', 'restock', 'sale', 'adjustment', 'return'],
      index: true,
    },
    qty: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: '' },
    performedBy: { type: String, trim: true, default: 'system' },
  },
  { timestamps: true },
);

// Compound index for fast per-product timeline queries
inventoryLogSchema.index({ productId: 1, createdAt: -1 });

export type InventoryLogDocument = HydratedDocument<InventoryLog>;

// Delete the cached model so shopId schema changes are always applied.
if (models.InventoryLog) {
  delete (models as Record<string, unknown>).InventoryLog;
}

export const InventoryLogModel = model<InventoryLog>('InventoryLog', inventoryLogSchema);
