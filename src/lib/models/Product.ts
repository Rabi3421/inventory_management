import type { HydratedDocument, Model } from 'mongoose';
import { Schema, models, model } from 'mongoose';

export interface Product {
  shopId: string;        // which shop this product belongs to
  sku: string;
  hsnCode?: string;
  sourceState?: string;
  sourceDistrict?: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  unitCounter: number;  // highest unit serial number issued so far
  gauge?: string;
  weight?: string;
  purchasePrice?: number;
  purchaseDate?: Date | null;
  tax?: number;
  saleGstRate?: number;
  transportationCost?: number;
  lowStockAlertQty?: number | null;
  purchaseDetailsStatus: 'complete' | 'pending';
  purchaseDetailsMissingFields: string[];
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
    hsnCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    sourceState: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    sourceDistrict: {
      type: String,
      trim: true,
      default: '',
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
    gauge: {
      type: String,
      trim: true,
      default: '',
    },
    weight: {
      type: String,
      trim: true,
      default: '',
    },
    purchasePrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    tax: {
      type: Number,
      min: 0,
      default: 0,
    },
    saleGstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    transportationCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    lowStockAlertQty: {
      type: Number,
      min: 0,
      default: null,
    },
    purchaseDetailsStatus: {
      type: String,
      enum: ['complete', 'pending'],
      default: 'complete',
      index: true,
    },
    purchaseDetailsMissingFields: {
      type: [String],
      default: [],
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
