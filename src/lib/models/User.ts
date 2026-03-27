import type { HydratedDocument, Model } from 'mongoose';
import { Schema, models, model } from 'mongoose';
import type { AppRole } from '@/lib/auth/routes';

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  shopId?: string | null;
  shopName?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'shopadmin', 'shop_admin'],
      required: true,
      index: true,
    },
    shopId: {
      type: String,
      trim: true,
    },
    shopName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export type UserDocument = HydratedDocument<User>;

export const UserModel = (models.User as Model<User>) || model<User>('User', userSchema);
