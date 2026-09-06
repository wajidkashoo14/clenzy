import { z } from 'zod';

/**
 * See docs/DATABASE.md "settings" — the exact field list the owner can
 * change without a deploy. A single document; cached in the API process
 * with a 60s TTL since it's read on nearly every request once consumed.
 *
 * NOTE: this schema is a faithful implementation of DATABASE.md's field
 * list. It does not yet replace the hardcoded PRICING_DEFAULTS/SLOT_DEFAULTS
 * constants that checkout/cart/slots currently read — see the comments on
 * those constants in apps/api/src/config/. Wiring live settings into the
 * pricing/slot engines is a separate, higher-risk change to already-shipped
 * financial code and was deliberately left out of this pass.
 */

const dayHoursSchema = z
  .object({
    open: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, 'must be HH:MM'),
    close: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, 'must be HH:MM'),
  })
  .nullable();

export const businessHoursSchema = z.object({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
});
export type BusinessHours = z.infer<typeof businessHoursSchema>;

export const maintenanceModeSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(500).optional(),
});
export type MaintenanceMode = z.infer<typeof maintenanceModeSchema>;

export const settingsSchema = z.object({
  /** Paise. */
  minOrderValue: z.number().int().nonnegative(),
  /** Paise. */
  deliveryFee: z.number().int().nonnegative(),
  /** Paise. */
  freeDeliveryThreshold: z.number().int().nonnegative(),
  /** e.g. 0.4 = +40% surcharge on express-eligible items. */
  expressMultiplier: z.number().nonnegative(),
  /** Paise — the minimum express surcharge regardless of order size. */
  expressMinCharge: z.number().int().nonnegative(),
  /** Paise. */
  codMaxOrderValue: z.number().int().nonnegative(),
  /** HH:MM, 24h, Asia/Kolkata. */
  sameDayCutoffTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'sameDayCutoffTime must be HH:MM'),
  recleanWindowHours: z.number().int().positive(),
  priceRevisionApprovalThresholdPercent: z.number().nonnegative().max(100),
  maxReschedules: z.number().int().nonnegative(),
  defaultTurnaroundHours: z.number().int().positive(),
  businessHours: businessHoursSchema,
  supportPhone: z.string().trim().min(1),
  supportWhatsapp: z.string().trim().min(1),
  supportEmail: z.string().trim().email(),
  gstNumber: z.string().trim().max(20).optional(),
  gstEnabled: z.boolean(),
  maintenanceMode: maintenanceModeSchema,
});
export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsInputSchema = settingsSchema.partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;

/** `GET /content/settings/public` per docs/API_SPEC.md §9 — "fees, hours, support contacts" only. */
export const publicSettingsSchema = settingsSchema.pick({
  minOrderValue: true,
  deliveryFee: true,
  freeDeliveryThreshold: true,
  expressMultiplier: true,
  expressMinCharge: true,
  sameDayCutoffTime: true,
  businessHours: true,
  supportPhone: true,
  supportWhatsapp: true,
  supportEmail: true,
  gstEnabled: true,
  maintenanceMode: true,
});
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
