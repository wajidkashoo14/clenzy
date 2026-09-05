import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §2 — GET /admin/dashboard. */
export const dashboardQuerySchema = z.object({
  range: z.enum(['day', 'week', 'month']).default('week'),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

const deltaSchema = z.object({ current: z.number(), previous: z.number() });

export const needsAttentionItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int(),
});
export type NeedsAttentionItem = z.infer<typeof needsAttentionItemSchema>;

export const dashboardResultSchema = z.object({
  stats: z.object({
    revenue: deltaSchema,
    ordersPlaced: deltaSchema,
    newCustomers: deltaSchema,
    averageOrderValue: deltaSchema,
    pendingPayments: z.number().int(),
    ordersNeedingAttention: z.number().int(),
  }),
  needsAttention: z.array(needsAttentionItemSchema),
  charts: z.object({
    revenueOverTime: z.array(z.object({ date: z.string(), revenue: z.number() })),
    ordersByStatus: z.array(z.object({ status: z.string(), count: z.number() })),
    popularServices: z.array(
      z.object({ name: z.string(), revenue: z.number(), volume: z.number() }),
    ),
  }),
  today: z.object({
    pickupsDue: z.number().int(),
    deliveriesDue: z.number().int(),
    inFacility: z.number().int(),
    agentsOnShift: z.number().int(),
  }),
});
export type DashboardResult = z.infer<typeof dashboardResultSchema>;
