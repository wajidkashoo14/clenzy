import { Schema, model } from 'mongoose';

/**
 * See docs/DATABASE.md "settings" — single document, key-value, so the owner
 * can change business rules without a deploy. Always looked up by the fixed
 * `_id: 'singleton'` so there is exactly one document, ever.
 *
 * Defaults below are PLACEHOLDERS pulled from docs/PROJECT_REQUIREMENTS.md
 * §7 and apps/web/src/content/brand.ts — not owner-confirmed. See the
 * disclaimer on those sources; nothing here should be presented as a real
 * business commitment.
 */
export interface DayHours {
  open: string;
  close: string;
}

export interface SettingsDocument {
  _id: string;
  minOrderValue: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  expressMultiplier: number;
  expressMinCharge: number;
  codMaxOrderValue: number;
  sameDayCutoffTime: string;
  recleanWindowHours: number;
  priceRevisionApprovalThresholdPercent: number;
  maxReschedules: number;
  defaultTurnaroundHours: number;
  businessHours: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours | null>;
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  gstNumber?: string;
  gstEnabled: boolean;
  maintenanceMode: { enabled: boolean; message?: string };
  updatedAt: Date;
}

export const SETTINGS_ID = 'singleton';

export const SETTINGS_DEFAULTS: Omit<SettingsDocument, '_id' | 'updatedAt'> = {
  minOrderValue: 29_900,
  deliveryFee: 4_900,
  freeDeliveryThreshold: 49_900,
  expressMultiplier: 0.4,
  expressMinCharge: 9_900,
  codMaxOrderValue: 500_000,
  sameDayCutoffTime: '16:00',
  recleanWindowHours: 72,
  priceRevisionApprovalThresholdPercent: 10,
  maxReschedules: 2,
  defaultTurnaroundHours: 48,
  businessHours: {
    mon: { open: '09:00', close: '20:00' },
    tue: { open: '09:00', close: '20:00' },
    wed: { open: '09:00', close: '20:00' },
    thu: { open: '09:00', close: '20:00' },
    fri: { open: '09:00', close: '20:00' },
    sat: { open: '09:00', close: '20:00' },
    sun: null,
  },
  supportPhone: '+91 90000 00000',
  supportWhatsapp: '+91 90000 00000',
  supportEmail: 'hello@clenzy.in',
  gstNumber: undefined,
  gstEnabled: false,
  maintenanceMode: { enabled: false, message: undefined },
};

const dayHoursSchema = new Schema<DayHours>(
  { open: { type: String, required: true }, close: { type: String, required: true } },
  { _id: false },
);

const settingsSchema = new Schema<SettingsDocument>(
  {
    _id: { type: String, default: SETTINGS_ID },
    minOrderValue: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    freeDeliveryThreshold: { type: Number, required: true },
    expressMultiplier: { type: Number, required: true },
    expressMinCharge: { type: Number, required: true },
    codMaxOrderValue: { type: Number, required: true },
    sameDayCutoffTime: { type: String, required: true },
    recleanWindowHours: { type: Number, required: true },
    priceRevisionApprovalThresholdPercent: { type: Number, required: true },
    maxReschedules: { type: Number, required: true },
    defaultTurnaroundHours: { type: Number, required: true },
    businessHours: {
      mon: { type: dayHoursSchema, default: null },
      tue: { type: dayHoursSchema, default: null },
      wed: { type: dayHoursSchema, default: null },
      thu: { type: dayHoursSchema, default: null },
      fri: { type: dayHoursSchema, default: null },
      sat: { type: dayHoursSchema, default: null },
      sun: { type: dayHoursSchema, default: null },
    },
    supportPhone: { type: String, required: true },
    supportWhatsapp: { type: String, required: true },
    supportEmail: { type: String, required: true },
    gstNumber: { type: String },
    gstEnabled: { type: Boolean, required: true, default: false },
    maintenanceMode: {
      enabled: { type: Boolean, required: true, default: false },
      message: { type: String },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true }, _id: false },
);

export const Settings = model<SettingsDocument>('Settings', settingsSchema);
