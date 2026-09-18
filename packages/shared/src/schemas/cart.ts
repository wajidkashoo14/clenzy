import { z } from 'zod';

/** See docs/API_SPEC.md §5 — POST /cart/estimate. */

export const cartLineInputSchema = z.object({
  serviceItemId: z.string().trim().min(1),
  quantity: z.number().int().positive().max(999),
});
export type CartLineInput = z.infer<typeof cartLineInputSchema>;

export const cartEstimateInputSchema = z.object({
  items: z.array(cartLineInputSchema).max(200),
  areaId: z.string().trim().min(1).optional(),
  couponCode: z.string().trim().max(50).optional(),
  isExpress: z.boolean().optional(),
});
export type CartEstimateInput = z.infer<typeof cartEstimateInputSchema>;

export const cartEstimateLineSchema = z.object({
  serviceItemId: z.string(),
  name: z.string(),
  unit: z.enum(['piece', 'kg', 'sqft', 'set', 'pair']),
  quantity: z.number().int(),
  /** Paise, per unit, after tiered/express pricing is resolved. */
  unitPrice: z.number().int(),
  /** Paise — `unitPrice * quantity`. */
  lineTotal: z.number().int(),
});
export type CartEstimateLine = z.infer<typeof cartEstimateLineSchema>;

export const cartEstimateResultSchema = z.object({
  items: z.array(cartEstimateLineSchema),
  /** Paise. Sum of line totals, before express surcharge/delivery/tax. */
  itemsSubtotal: z.number().int(),
  /** Paise. Always 0 unless `isExpress` and at least one line has no per-item express price. */
  expressSurcharge: z.number().int(),
  /** Paise. */
  deliveryFee: z.number().int(),
  /** Paise. Always 0 — coupons aren't built yet (later phase). */
  couponDiscount: z.number().int(),
  /** Paise. Sum of each line's tax at its own `taxRatePercent`. */
  taxTotal: z.number().int(),
  /** Paise. itemsSubtotal + expressSurcharge + deliveryFee + taxTotal - couponDiscount. */
  grandTotal: z.number().int(),
  /** Paise. Placeholder default per docs/PROJECT_REQUIREMENTS.md §7 — not yet owner-confirmed or admin-configurable. */
  minOrderValue: z.number().int(),
  meetsMinimumOrder: z.boolean(),
  isExpress: z.boolean(),
});
export type CartEstimateResult = z.infer<typeof cartEstimateResultSchema>;
