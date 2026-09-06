import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §13 — every report is date-range driven and exports to CSV. */
export const reportDateRangeQuerySchema = z.object({
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});
export type ReportDateRangeQuery = z.infer<typeof reportDateRangeQuerySchema>;
