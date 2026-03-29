import type { HydratedDocument, Model } from 'mongoose';
import { Schema, models, model } from 'mongoose';

export type ShopStatus = 'Active' | 'Inactive' | 'Suspended';

export interface Shop {
  name: string;
  location: string;
  manager: string;
  phone: string;
  status: ShopStatus;
  createdAt: Date;
  updatedAt: Date;
}

const shopSchema = new Schema<Shop>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    manager: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended'],
      required: true,
      default: 'Active',
      index: true,
    },
  },
  { timestamps: true },
);

export type ShopDocument = HydratedDocument<Shop>;

export const ShopModel =
  (models.Shop as Model<Shop>) || model<Shop>('Shop', shopSchema);
