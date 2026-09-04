import { z } from 'zod';

/** See docs/API_SPEC.md §10 "Agent endpoints (AGENT)". */

export const agentTasksQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});
export type AgentTasksQuery = z.infer<typeof agentTasksQuerySchema>;

export const markPickedUpInputSchema = z.object({
  actualItems: z
    .array(z.object({ serviceItemId: z.string(), quantity: z.number().int().positive() }))
    .optional(),
});
export type MarkPickedUpInput = z.infer<typeof markPickedUpInputSchema>;

export const markDeliveredInputSchema = z.object({
  otp: z.string().trim().optional(),
  signature: z.string().trim().optional(),
});
export type MarkDeliveredInput = z.infer<typeof markDeliveredInputSchema>;

export const markFailedInputSchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  reason: z.string().trim().min(1, 'A reason is required').max(500),
});
export type MarkFailedInput = z.infer<typeof markFailedInputSchema>;

export const agentTaskSchema = z.object({
  orderNumber: z.string(),
  status: z.string(),
  type: z.enum(['pickup', 'delivery']),
  window: z.string(),
  address: z.object({
    contactName: z.string(),
    contactPhone: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    landmark: z.string().optional(),
    area: z.string(),
    city: z.string(),
    pincode: z.string(),
  }),
  itemCount: z.number().int(),
  customerNote: z.string().optional(),
});
export type AgentTask = z.infer<typeof agentTaskSchema>;

export const agentTasksResultSchema = z.object({
  tasks: z.array(agentTaskSchema),
});
export type AgentTasksResult = z.infer<typeof agentTasksResultSchema>;
