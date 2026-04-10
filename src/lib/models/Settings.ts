import type { HydratedDocument, Model } from 'mongoose';
import { Schema, models, model } from 'mongoose';

export interface AppSettings {
  // General
  orgName: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  language: string;
  // Inventory thresholds
  lowStockThreshold: number;
  autoRestockSuggestion: boolean;
  // Notifications
  notifLowStockEmail: boolean;
  notifOutOfStockEmail: boolean;
  notifWeeklyReport: boolean;
  notifNewUserAlert: boolean;
  notifShopSyncError: boolean;
  notifRestockApproved: boolean;
  // Security
  secTwoFactor: boolean;
  secSessionTimeout: boolean;
  secIpWhitelist: boolean;
  secAuditLog: boolean;
  // GST / Tax
  gstEnabled: boolean;
  gstRate: number;          // default rate %, e.g. 0 / 5 / 12 / 18 / 28
  // Shop-admin preferences
  shopOpenTime: string;
  shopCloseTime: string;
  autoLowStockAlerts: boolean;
  autoRestockRequest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<AppSettings>(
  {
    orgName:              { type: String, default: 'श्री राम स्टोर्स' },
    currency:             { type: String, default: 'INR' },
    timezone:             { type: String, default: 'Asia/Kolkata' },
    dateFormat:           { type: String, default: 'DD/MM/YYYY' },
    language:             { type: String, default: 'English (US)' },
    lowStockThreshold:    { type: Number, default: 20 },
    autoRestockSuggestion:{ type: Boolean, default: true },
    notifLowStockEmail:   { type: Boolean, default: true },
    notifOutOfStockEmail: { type: Boolean, default: true },
    notifWeeklyReport:    { type: Boolean, default: true },
    notifNewUserAlert:    { type: Boolean, default: false },
    notifShopSyncError:   { type: Boolean, default: true },
    notifRestockApproved: { type: Boolean, default: false },
    secTwoFactor:         { type: Boolean, default: false },
    secSessionTimeout:    { type: Boolean, default: false },
    secIpWhitelist:       { type: Boolean, default: false },
    secAuditLog:          { type: Boolean, default: true },
    gstEnabled:           { type: Boolean, default: false },
    gstRate:              { type: Number,  default: 0, min: 0, max: 100 },
    shopOpenTime:         { type: String,  default: '08:00' },
    shopCloseTime:        { type: String,  default: '20:00' },
    autoLowStockAlerts:   { type: Boolean, default: true },
    autoRestockRequest:   { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type SettingsDocument = HydratedDocument<AppSettings>;

export const SettingsModel =
  (models.Settings as Model<AppSettings>) || model<AppSettings>('Settings', settingsSchema);
