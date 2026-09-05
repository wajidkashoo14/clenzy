import { z } from 'zod';

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/review and docs/DATABASE.md "reviews". */
export const submitReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
  serviceQuality: z.number().int().min(1).max(5).optional(),
  timeliness: z.number().int().min(1).max(5).optional(),
  staffBehaviour: z.number().int().min(1).max(5).optional(),
});
export type SubmitReviewInput = z.infer<typeof submitReviewInputSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  rating: z.number().int(),
  comment: z.string().optional(),
  serviceQuality: z.number().int().optional(),
  timeliness: z.number().int().optional(),
  staffBehaviour: z.number().int().optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.string(),
});
export type ReviewPayload = z.infer<typeof reviewSchema>;
