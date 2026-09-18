import { Banner } from '../models/Banner.js';
import { Faq } from '../models/Faq.js';
import { Testimonial } from '../models/Testimonial.js';

/** See docs/API_SPEC.md §9 — public reads for the marketing site. */
export async function listPublicFaqs(): Promise<unknown[]> {
  return Faq.find({ isActive: true }).sort({ category: 1, sortOrder: 1 }).lean();
}

export async function listPublicTestimonials(): Promise<unknown[]> {
  return Testimonial.find({ isActive: true }).sort({ isFeatured: -1, createdAt: -1 }).lean();
}

export async function listPublicBanners(
  placement?: 'home_hero' | 'home_strip' | 'offers',
): Promise<unknown[]> {
  const now = new Date();
  return Banner.find({
    ...(placement ? { placement } : {}),
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ sortOrder: 1 })
    .lean();
}
