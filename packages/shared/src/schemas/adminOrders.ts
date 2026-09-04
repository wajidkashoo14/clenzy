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

export const adminOrderListQuerySchema = z.object({
  status: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  q: z.string().trim().optional(),
  areaId: z.string().trim().optional(),
  agentId: z.string().trim().optional(),
  paymentStatus: z.string().trim().optional(),
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
