import { z } from 'zod';
import { cartLineInputSchema } from './cart.js';

/** See docs/API_SPEC.md §7 — POST /orders. Phase 7 only supports `paymentMethod: "cod"`. */

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
  createdAt: z.string(),
});
export type OrderPayload = z.infer<typeof orderSchema>;

export const placeOrderResultSchema = z.object({
  order: orderSchema,
});
export type PlaceOrderResult = z.infer<typeof placeOrderResultSchema>;
