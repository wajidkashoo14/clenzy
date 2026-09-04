import { z } from 'zod';

/** See docs/API_SPEC.md §8 — /payments. */

export const paymentVerifyInputSchema = z.object({
  orderNumber: z.string().trim().min(1),
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
});
export type PaymentVerifyInput = z.infer<typeof paymentVerifyInputSchema>;

export const paymentStatusResultSchema = z.object({
  orderNumber: z.string(),
  orderStatus: z.string(),
  paymentStatus: z.string(),
});
export type PaymentStatusResult = z.infer<typeof paymentStatusResultSchema>;

export const paymentRetryResultSchema = z.object({
  gateway: z.literal('razorpay'),
  razorpayOrderId: z.string(),
  /** Paise. */
  amount: z.number().int(),
  keyId: z.string(),
});
export type PaymentRetryResult = z.infer<typeof paymentRetryResultSchema>;

/** See docs/API_SPEC.md §10 — POST /admin/orders/:id/refund. */
export const refundInputSchema = z.object({
  /** Paise. Omit for a full refund of the remaining refundable amount. */
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().min(1, 'A refund reason is required').max(500),
});
export type RefundInput = z.infer<typeof refundInputSchema>;

export const refundResultSchema = z.object({
  refundId: z.string(),
  /** Paise. */
  amount: z.number().int(),
  status: z.string(),
});
export type RefundResult = z.infer<typeof refundResultSchema>;
