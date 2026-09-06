import { z } from 'zod';

/** See docs/ADMIN_DASHBOARD.md §11 and docs/API_SPEC.md §10 — `GET/PATCH /admin/reviews[/:id]`. */

export const reviewListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).optional().default('all'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const moderateReviewInputSchema = z
  .object({
    action: z.enum(['approve', 'reject', 'reply', 'feature', 'unfeature']),
    reason: z.string().trim().max(500).optional(),
    reply: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.action !== 'reject' || Boolean(v.reason), {
    message: 'A reason is required to reject a review',
    path: ['reason'],
  })
  .refine((v) => v.action !== 'reply' || Boolean(v.reply), {
    message: 'Reply text is required',
    path: ['reply'],
  });
export type ModerateReviewInput = z.infer<typeof moderateReviewInputSchema>;
