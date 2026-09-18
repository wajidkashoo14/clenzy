import { z } from 'zod';

/** See docs/API_SPEC.md §4 — GET /slots. */

export const slotsQuerySchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  areaId: z.string().trim().min(1),
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  days: z.coerce.number().int().min(1).max(14).default(7),
});
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

export const slotWindowSchema = z.object({
  window: z.string(),
  label: z.string(),
  capacity: z.number().int(),
  booked: z.number().int(),
  available: z.number().int(),
  cutoffPassed: z.boolean(),
  disabled: z.boolean(),
  disabledReason: z.string().optional(),
});
export type SlotWindow = z.infer<typeof slotWindowSchema>;

export const slotDaySchema = z.object({
  date: z.string(),
  isHoliday: z.boolean(),
  windows: z.array(slotWindowSchema),
});
export type SlotDay = z.infer<typeof slotDaySchema>;

export const slotsResultSchema = z.object({
  dates: z.array(slotDaySchema),
});
export type SlotsResult = z.infer<typeof slotsResultSchema>;
