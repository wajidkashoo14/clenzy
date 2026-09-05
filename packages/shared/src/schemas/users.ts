import { z } from 'zod';

/** See docs/API_SPEC.md §2 "Users & addresses" — PATCH /users/me. */
export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').optional(),
  notificationPrefs: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      push: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
