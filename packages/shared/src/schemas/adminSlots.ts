import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §9 and docs/API_SPEC.md §10 "Catalog, pricing, coupons, areas, slots". */

export const createSlotTemplateInputSchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  /** 0 = Sunday, per JS Date convention. */
  dayOfWeek: z.number().int().min(0).max(6),
  window: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Window must be in HH:MM-HH:MM form'),
  label: z.string().trim().min(1).max(50),
  capacity: z.number().int().positive(),
  cutoffMinutesBefore: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
  /** Empty = every area. */
  areaIds: z.array(z.string().trim().min(1)).optional().default([]),
});
export type CreateSlotTemplateInput = z.infer<typeof createSlotTemplateInputSchema>;

export const updateSlotTemplateInputSchema = createSlotTemplateInputSchema.partial();
export type UpdateSlotTemplateInput = z.infer<typeof updateSlotTemplateInputSchema>;

export const slotCapacityQuerySchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  areaId: z.string().trim().min(1),
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  days: z.coerce.number().int().positive().max(31).optional().default(14),
});
export type SlotCapacityQuery = z.infer<typeof slotCapacityQuerySchema>;

/** `PATCH /admin/slots/capacity` — override capacity for one date (extra staff, holiday) or block it entirely (capacity: 0). */
export const slotCapacityOverrideInputSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  window: z.string().trim().min(1),
  type: z.enum(['pickup', 'delivery']),
  areaId: z.string().trim().min(1),
  capacity: z.number().int().nonnegative(),
});
export type SlotCapacityOverrideInput = z.infer<typeof slotCapacityOverrideInputSchema>;
