import { z } from 'zod';
import { cartLineInputSchema } from './cart.js';

/** See docs/API_SPEC.md §6 — POST /coupons/validate. */

export const couponValidateInputSchema = z.object({
  code: z.string().trim().min(1, 'Enter a coupon code').max(50),
  items: z.array(cartLineInputSchema).min(1),
  subtotal: z.number().int().nonnegative(),
  areaId: z.string().trim().min(1).optional(),
});
export type CouponValidateInput = z.infer<typeof couponValidateInputSchema>;

export const couponSummarySchema = z.object({
  code: z.string(),
  description: z.string(),
  discountType: z.enum(['percentage', 'flat']),
  discountValue: z.number(),
});
export type CouponSummary = z.infer<typeof couponSummarySchema>;

export const couponValidateResultSchema = z.object({
  valid: z.literal(true),
  coupon: couponSummarySchema,
  /** Paise. */
  discountAmount: z.number().int(),
  /** Paise. */
  newTotal: z.number().int(),
});
export type CouponValidateResult = z.infer<typeof couponValidateResultSchema>;
