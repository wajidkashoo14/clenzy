import { z } from 'zod';

/**
 * See docs/ADMIN_DASHBOARD.md §12 and docs/DATABASE.md "Content collections".
 * Content is built into the admin dashboard rather than a headless CMS —
 * see the doc's reasoning. FAQ `answer` is rich text (HTML from the Tiptap
 * editor), sanitized server-side before it is ever stored — see
 * `sanitizeRichText` in adminContent.service.ts.
 */

/**
 * Blank strings (an untouched optional form field) mean "not set" — same
 * fix as `optionalTimeField` in adminStaff.ts, applied here because a bare
 * `.url().optional()` still runs `.url()` against `''` and rejects it.
 */
function optionalUrlField() {
  return z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, { message: 'Must be a valid URL' })
    .transform((v) => (v ? v : undefined));
}

export const createFaqInputSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(10_000),
  category: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().optional().default(0),
});
export type CreateFaqInput = z.infer<typeof createFaqInputSchema>;

export const updateFaqInputSchema = createFaqInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateFaqInput = z.infer<typeof updateFaqInputSchema>;

export const createTestimonialInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  area: z.string().trim().max(100).optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(1000),
  image: optionalUrlField(),
  isFeatured: z.boolean().optional().default(false),
  sourceReviewId: z.string().trim().min(1).optional(),
});
export type CreateTestimonialInput = z.infer<typeof createTestimonialInputSchema>;

export const updateTestimonialInputSchema = createTestimonialInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialInputSchema>;

export const BANNER_PLACEMENTS = ['home_hero', 'home_strip', 'offers'] as const;

export const createBannerInputSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    subtitle: z.string().trim().max(300).optional(),
    image: z.string().trim().url(),
    mobileImage: optionalUrlField(),
    ctaText: z.string().trim().max(50).optional(),
    ctaLink: z.string().trim().max(300).optional(),
    placement: z.enum(BANNER_PLACEMENTS),
    startsAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
    sortOrder: z.number().int().optional().default(0),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt <= v.endsAt, {
    message: 'endsAt must be on or after startsAt',
    path: ['endsAt'],
  });
export type CreateBannerInput = z.infer<typeof createBannerInputSchema>;

export const updateBannerInputSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    subtitle: z.string().trim().max(300).optional(),
    image: optionalUrlField(),
    mobileImage: optionalUrlField(),
    ctaText: z.string().trim().max(50).optional(),
    ctaLink: z.string().trim().max(300).optional(),
    placement: z.enum(BANNER_PLACEMENTS).optional(),
    startsAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt <= v.endsAt, {
    message: 'endsAt must be on or after startsAt',
    path: ['endsAt'],
  });
export type UpdateBannerInput = z.infer<typeof updateBannerInputSchema>;

export const reorderContentInputSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1),
});
export type ReorderContentInput = z.infer<typeof reorderContentInputSchema>;
