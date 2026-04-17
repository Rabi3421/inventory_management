import type { HydratedDocument, Types } from 'mongoose';
import { Schema, model, models } from 'mongoose';

export interface BillingReservation {
  _id: Types.ObjectId;
  shopId: string;
  productId: string;
  userId: string;
  userName: string;
  qty: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billingReservationSchema = new Schema<BillingReservation>(
  {
    shopId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      default: '',
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

billingReservationSchema.index({ shopId: 1, productId: 1, userId: 1 }, { unique: true });
billingReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type BillingReservationDocument = HydratedDocument<BillingReservation>;

if (models.BillingReservation) {
  delete (models as Record<string, unknown>).BillingReservation;
}

export const BillingReservationModel = model<BillingReservation>('BillingReservation', billingReservationSchema);
