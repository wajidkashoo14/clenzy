import { z } from 'zod';

/**
 * See docs/ADMIN_DASHBOARD.md §11 and docs/DATABASE.md "leads (fast-path
 * 'Book a pickup' form) & contactSubmissions & b2bEnquiries" — three
 * near-identical sales-pipeline queues. Leads get the full pipeline
 * (assignment, conversion); contact/B2B get the "equivalent, simpler queues"
 * the doc calls for — status + notes only, no assignedTo/convertedOrderId
 * fields exist on those two models.
 */

export const pipelineListQuerySchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost', 'all']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type PipelineListQuery = z.infer<typeof pipelineListQuerySchema>;

export const addPipelineNoteInputSchema = z.object({
  note: z.string().trim().min(1).max(1000),
});
export type AddPipelineNoteInput = z.infer<typeof addPipelineNoteInputSchema>;

export const updateSubmissionStatusInputSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost']),
});
export type UpdateSubmissionStatusInput = z.infer<typeof updateSubmissionStatusInputSchema>;

export const updateLeadInputSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost']).optional(),
  assignedTo: z.string().trim().min(1).optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadInputSchema>;

/** `POST /admin/leads/:id/convert` — pre-fills the manual-order modal per docs/ADMIN_DASHBOARD.md §11. */
export const convertLeadInputSchema = z.object({
  orderId: z.string().trim().min(1),
});
export type ConvertLeadInput = z.infer<typeof convertLeadInputSchema>;
