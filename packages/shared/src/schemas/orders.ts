import { z } from 'zod';
import { cartLineInputSchema } from './cart.js';

/** See docs/API_SPEC.md §7 — POST /orders. `paymentMethod: "wallet"` isn't built (V2). */

const slotInputSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  window: z.string().trim().min(1),
});

export const placeOrderInputSchema = z.object({
  items: z.array(cartLineInputSchema).min(1).max(200),
  pickupAddressId: z.string().trim().min(1),
  deliveryAddressId: z.string().trim().min(1),
  pickupSlot: slotInputSchema,
  deliverySlot: slotInputSchema,
  isExpress: z.boolean().optional().default(false),
  couponCode: z.string().trim().max(50).optional(),
  paymentMethod: z.enum(['online', 'cod', 'wallet']),
  customerNote: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(1, 'Missing idempotencyKey'),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

const orderItemSchema = z.object({
  serviceItemId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  categoryName: z.string(),
  unit: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  taxRatePercent: z.number(),
  lineTotal: z.number().int(),
  careNote: z.string().optional(),
});

const orderPricingSchema = z.object({
  itemsSubtotal: z.number().int(),
  expressSurcharge: z.number().int(),
  deliveryFee: z.number().int(),
  discountAmount: z.number().int(),
  taxAmount: z.number().int(),
  grandTotal: z.number().int(),
});

const orderAddressSchema = z.object({
  label: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  area: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
});

const orderSlotSchema = z.object({
  date: z.string(),
  window: z.string(),
  label: z.string(),
  /** The service area this slot belongs to — needed to query GET /slots when rescheduling. */
  areaId: z.string(),
});

const cancellationSchema = z.object({
  reason: z.string(),
  cancelledByRole: z.enum(['customer', 'staff', 'admin', 'system']),
  at: z.string(),
  refundEligible: z.boolean(),
});

const priceRevisionSchema = z.object({
  originalTotal: z.number().int(),
  revisedTotal: z.number().int(),
  reason: z.string(),
  requiresApproval: z.boolean(),
  approvedAt: z.string().optional(),
});

export const orderSchema = z.object({
  orderNumber: z.string(),
  status: z.string(),
  items: z.array(orderItemSchema),
  pricing: orderPricingSchema,
  pickupAddress: orderAddressSchema,
  deliveryAddress: orderAddressSchema,
  pickupSlot: orderSlotSchema,
  deliverySlot: orderSlotSchema,
  isExpress: z.boolean(),
  paymentMethod: z.enum(['online', 'cod', 'wallet']),
  paymentStatus: z.string(),
  couponCode: z.string().optional(),
  customerNote: z.string().optional(),
  rescheduleCount: z.number().int(),
  failedPickupAttempts: z.number().int(),
  failedDeliveryAttempts: z.number().int(),
  cancellation: cancellationSchema.optional(),
  priceRevision: priceRevisionSchema.optional(),
  deliveredAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
});
export type OrderPayload = z.infer<typeof orderSchema>;

/** Present only when `paymentMethod: "online"` — see docs/API_SPEC.md §7's response shape. */
const razorpayOrderInfoSchema = z.object({
  gateway: z.literal('razorpay'),
  razorpayOrderId: z.string(),
  /** Paise. */
  amount: z.number().int(),
  keyId: z.string(),
});

export const placeOrderResultSchema = z.object({
  order: orderSchema,
  payment: razorpayOrderInfoSchema.optional(),
});
export type PlaceOrderResult = z.infer<typeof placeOrderResultSchema>;

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/cancel. */
export const cancelOrderInputSchema = z.object({
  reason: z.string().trim().min(1, 'A cancellation reason is required').max(500),
});
export type CancelOrderInput = z.infer<typeof cancelOrderInputSchema>;

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/reschedule. */
export const rescheduleOrderInputSchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  window: z.string().trim().min(1),
});
export type RescheduleOrderInput = z.infer<typeof rescheduleOrderInputSchema>;

/** See docs/API_SPEC.md §7 — GET /orders/:orderNumber/track. */
export const orderTrackTimelineEntrySchema = z.object({
  status: z.string(),
  label: z.string(),
  /** Absent for a step the order hasn't reached yet. */
  at: z.string().optional(),
  isCompleted: z.boolean(),
  isCurrent: z.boolean(),
  note: z.string().optional(),
});

export const orderTrackResultSchema = z.object({
  status: z.string(),
  statusLabel: z.string(),
  timeline: z.array(orderTrackTimelineEntrySchema),
  estimatedDelivery: z.string().optional(),
  agent: z.object({ name: z.string(), phone: z.string().optional() }).nullable(),
});
export type OrderTrackResult = z.infer<typeof orderTrackResultSchema>;

/** See docs/API_SPEC.md §7 — GET /orders (own order history, filtered and paginated). */
export const orderListQuerySchema = z.object({
  status: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const orderListResultSchema = z.object({
  orders: z.array(orderSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type OrderListResult = z.infer<typeof orderListResultSchema>;
