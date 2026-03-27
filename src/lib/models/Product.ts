import type { HydratedDocument, Model } from 'mongoose';
import { Schema, models, model } from 'mongoose';

export interface Product {
  sku: string;
  name: string;
  description: string;
  price: number;
  totalQty: number;
  availableQty: number;
  unitCounter: number;  // highest unit serial number issued so far
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<Product>(
  {
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
  },
  {
    timestamps: true,
  },
);

export type ProductDocument = HydratedDocument<Product>;

export const ProductModel =
  (models.Product as Model<Product>) || model<Product>('Product', productSchema);
