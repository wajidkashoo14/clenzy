import type {
  CreateBannerInput,
  CreateFaqInput,
  CreateTestimonialInput,
  ReorderContentInput,
  UpdateBannerInput,
  UpdateFaqInput,
  UpdateTestimonialInput,
} from '@clenzy/shared';
import { isValidObjectId } from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { Banner, type BannerDocument } from '../models/Banner.js';
import { Faq, type FaqDocument } from '../models/Faq.js';
import { Testimonial, type TestimonialDocument } from '../models/Testimonial.js';
import { logAudit } from './auditLog.service.js';
import { triggerCatalogRevalidation } from './revalidation.service.js';
import { AppError } from '../utils/AppError.js';

interface Actor {
  id: string;
  role: string;
}

/**
 * The Tiptap editor on the FAQ answer field can emit whatever HTML its
 * extensions produce; this is rendered on the public site via
 * `dangerouslySetInnerHTML`, so sanitize on write rather than trusting the
 * client — an allowlist, not a denylist.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 's', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'code'],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export async function listFaqsAdmin(): Promise<FaqDocument[]> {
  return Faq.find({}).sort({ category: 1, sortOrder: 1 }).lean();
}

export async function createFaq(actor: Actor, input: CreateFaqInput): Promise<FaqDocument> {
  const faq = await Faq.create({ ...input, answer: sanitizeRichText(input.answer) });
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'faq.create',
    entityType: 'Faq',
    entityId: String(faq._id),
    after: faq.toObject(),
  });
  triggerCatalogRevalidation();
  return faq.toObject();
}

export async function updateFaq(
  actor: Actor,
  id: string,
  input: UpdateFaqInput,
): Promise<FaqDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('FAQ not found.');
  const faq = await Faq.findById(id);
  if (!faq) throw AppError.notFound('FAQ not found.');

  const before = faq.toObject();
  Object.assign(faq, input);
  if (input.answer) faq.answer = sanitizeRichText(input.answer);
  await faq.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'faq.update',
    entityType: 'Faq',
    entityId: id,
    before,
    after: faq.toObject(),
  });
  triggerCatalogRevalidation();
  return faq.toObject();
}

export async function reorderFaqs(actor: Actor, input: ReorderContentInput): Promise<void> {
  await Promise.all(
    input.orderedIds.map((id, index) => Faq.updateOne({ _id: id }, { $set: { sortOrder: index } })),
  );
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'faq.reorder',
    entityType: 'Faq',
    entityId: 'bulk',
    after: { orderedIds: input.orderedIds },
  });
  triggerCatalogRevalidation();
}

export async function deactivateFaq(actor: Actor, id: string): Promise<FaqDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('FAQ not found.');
  const faq = await Faq.findById(id);
  if (!faq) throw AppError.notFound('FAQ not found.');

  const before = faq.toObject();
  faq.isActive = false;
  await faq.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'faq.deactivate',
    entityType: 'Faq',
    entityId: id,
    before,
    after: faq.toObject(),
  });
  triggerCatalogRevalidation();
  return faq.toObject();
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export async function listTestimonialsAdmin(): Promise<TestimonialDocument[]> {
  return Testimonial.find({}).sort({ createdAt: -1 }).lean();
}

export async function createTestimonial(
  actor: Actor,
  input: CreateTestimonialInput,
): Promise<TestimonialDocument> {
  const testimonial = await Testimonial.create(input);
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'testimonial.create',
    entityType: 'Testimonial',
    entityId: String(testimonial._id),
    after: testimonial.toObject(),
  });
  triggerCatalogRevalidation();
  return testimonial.toObject();
}

export async function updateTestimonial(
  actor: Actor,
  id: string,
  input: UpdateTestimonialInput,
): Promise<TestimonialDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Testimonial not found.');
  const testimonial = await Testimonial.findById(id);
  if (!testimonial) throw AppError.notFound('Testimonial not found.');

  const before = testimonial.toObject();
  Object.assign(testimonial, input);
  await testimonial.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'testimonial.update',
    entityType: 'Testimonial',
    entityId: id,
    before,
    after: testimonial.toObject(),
  });
  triggerCatalogRevalidation();
  return testimonial.toObject();
}

export async function deactivateTestimonial(
  actor: Actor,
  id: string,
): Promise<TestimonialDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Testimonial not found.');
  const testimonial = await Testimonial.findById(id);
  if (!testimonial) throw AppError.notFound('Testimonial not found.');

  const before = testimonial.toObject();
  testimonial.isActive = false;
  await testimonial.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'testimonial.deactivate',
    entityType: 'Testimonial',
    entityId: id,
    before,
    after: testimonial.toObject(),
  });
  triggerCatalogRevalidation();
  return testimonial.toObject();
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export async function listBannersAdmin(): Promise<BannerDocument[]> {
  return Banner.find({}).sort({ placement: 1, sortOrder: 1 }).lean();
}

export async function createBanner(
  actor: Actor,
  input: CreateBannerInput,
): Promise<BannerDocument> {
  const banner = await Banner.create(input);
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'banner.create',
    entityType: 'Banner',
    entityId: String(banner._id),
    after: banner.toObject(),
  });
  triggerCatalogRevalidation();
  return banner.toObject();
}

export async function updateBanner(
  actor: Actor,
  id: string,
  input: UpdateBannerInput,
): Promise<BannerDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Banner not found.');
  const banner = await Banner.findById(id);
  if (!banner) throw AppError.notFound('Banner not found.');

  const before = banner.toObject();
  Object.assign(banner, input);
  await banner.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'banner.update',
    entityType: 'Banner',
    entityId: id,
    before,
    after: banner.toObject(),
  });
  triggerCatalogRevalidation();
  return banner.toObject();
}

export async function deactivateBanner(actor: Actor, id: string): Promise<BannerDocument> {
  if (!isValidObjectId(id)) throw AppError.notFound('Banner not found.');
  const banner = await Banner.findById(id);
  if (!banner) throw AppError.notFound('Banner not found.');

  const before = banner.toObject();
  banner.isActive = false;
  await banner.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'banner.deactivate',
    entityType: 'Banner',
    entityId: id,
    before,
    after: banner.toObject(),
  });
  triggerCatalogRevalidation();
  return banner.toObject();
}
