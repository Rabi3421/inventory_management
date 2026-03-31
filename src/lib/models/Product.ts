import type { HydratedDocument, Model } from 'mongoose';
import { Schema, models, model } from 'mongoose';

export interface Product {
  shopId: string;        // which shop this product belongs to
  sku: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  unitCounter: number;  // highest unit serial number issued so far
  mfgDate?: Date | null;
  expiryDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<Product>(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    availableQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unitCounter: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    mfgDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type ProductDocument = HydratedDocument<Product>;

// Delete the cached model so that schema changes (e.g. new fields like shopId)
// are always picked up after a hot-reload instead of using the stale cached schema.
if (models.Product) {
  delete (models as Record<string, unknown>).Product;
}

export const ProductModel = model<Product>('Product', productSchema);
