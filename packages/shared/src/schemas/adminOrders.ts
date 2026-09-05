import { z } from 'zod';

/**
 * See docs/API_SPEC.md §10 "Orders (STAFF+)". No admin dashboard exists yet
 * (that's Phase 12) — these validate the backend endpoints Phase 9 adds.
 * Response shapes aren't schema'd here since nothing consumes them yet;
 * only request bodies need validation.
 */

export const updateOrderStatusInputSchema = z.object({
  status: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

export const assignAgentInputSchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  agentId: z.string().trim().min(1),
});
export type AssignAgentInput = z.infer<typeof assignAgentInputSchema>;

export const addInternalNoteInputSchema = z.object({
  note: z.string().trim().min(1, 'Note cannot be empty').max(1000),
});
export type AddInternalNoteInput = z.infer<typeof addInternalNoteInputSchema>;

export const adminCancelOrderInputSchema = z.object({
  reason: z.string().trim().min(1, 'A cancellation reason is required').max(500),
  refundEligible: z.boolean().optional(),
});
export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderInputSchema>;

const reviseItemInputSchema = z.object({
  serviceItemId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  /** Paise. Overrides the catalog price for this line — e.g. a damage surcharge. Omit to keep the catalog price. */
  unitPrice: z.number().int().nonnegative().optional(),
  careNote: z.string().trim().max(500).optional(),
});

export const reviseOrderItemsInputSchema = z.object({
  items: z.array(reviseItemInputSchema).min(1),
  reason: z.string().trim().min(1, 'A reason for the revision is required').max(500),
});
export type ReviseOrderItemsInput = z.infer<typeof reviseOrderItemsInputSchema>;

const boolFlag = z
  .string()
  .trim()
  .optional()
  .transform((v) => v === 'true');

export const adminOrderListQuerySchema = z.object({
  /** Comma-separated OrderStatus values — multi-select in the UI. */
  status: z.string().trim().optional(),
  /** Comma-separated PaymentStatus values. */
  paymentStatus: z.string().trim().optional(),
  /** Comma-separated 'online' | 'cod' | 'wallet' values. */
  paymentMethod: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  q: z.string().trim().optional(),
  areaId: z.string().trim().optional(),
  agentId: z.string().trim().optional(),
  isExpress: boolFlag,
  hasPriceRevision: boolFlag,
  needsAttention: boolFlag,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const orderRosterQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  type: z.enum(['pickup', 'delivery']),
});
export type OrderRosterQuery = z.infer<typeof orderRosterQuerySchema>;

/** See docs/ADMIN_DASHBOARD.md §3 "Today's Roster" — bulk-assign an entire window to an agent. */
export const bulkAssignRosterInputSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  type: z.enum(['pickup', 'delivery']),
  window: z.string().trim().min(1),
  agentId: z.string().trim().min(1),
});
export type BulkAssignRosterInput = z.infer<typeof bulkAssignRosterInputSchema>;

const manualOrderAddressSchema = z.object({
  contactName: z.string().trim().min(1).max(100),
  contactPhone: z.string().trim().min(10).max(15),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(200).optional(),
  area: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

const manualOrderSlotSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  window: z.string().trim().min(1),
});

/** See docs/API_SPEC.md §10 — POST /admin/orders. Phone/WhatsApp intake, staff-entered — COD only, no coupons. */
export const createManualOrderInputSchema = z.object({
  customerPhone: z.string().trim().min(10).max(15),
  customerName: z.string().trim().max(100).optional(),
  items: z
    .array(
      z.object({ serviceItemId: z.string().trim().min(1), quantity: z.number().int().positive() }),
    )
    .min(1),
  pickupAddress: manualOrderAddressSchema,
  deliveryAddress: manualOrderAddressSchema,
  pickupSlot: manualOrderSlotSchema,
  deliverySlot: manualOrderSlotSchema,
  isExpress: z.boolean().optional().default(false),
  customerNote: z.string().trim().max(500).optional(),
});
export type CreateManualOrderInput = z.infer<typeof createManualOrderInputSchema>;
