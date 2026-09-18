import {
  createBannerInputSchema,
  createFaqInputSchema,
  createTestimonialInputSchema,
  reorderContentInputSchema,
  updateBannerInputSchema,
  updateFaqInputSchema,
  updateTestimonialInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminContentService from '../services/adminContent.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

// --- FAQs ----------------------------------------------------------------

export const listFaqs = asyncHandler(async (_req: Request, res: Response) => {
  const faqs = await adminContentService.listFaqsAdmin();
  res.status(200).json({ success: true, data: { faqs } });
});

export const createFaq = asyncHandler(async (req: Request, res: Response) => {
  const input = createFaqInputSchema.parse(req.body);
  const faq = await adminContentService.createFaq(actorOf(req), input);
  res.status(201).json({ success: true, data: { faq } });
});

export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
  const input = updateFaqInputSchema.parse(req.body);
  const faq = await adminContentService.updateFaq(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { faq } });
});

export const reorderFaqs = asyncHandler(async (req: Request, res: Response) => {
  const input = reorderContentInputSchema.parse(req.body);
  await adminContentService.reorderFaqs(actorOf(req), input);
  res.status(200).json({ success: true, data: null });
});

export const deactivateFaq = asyncHandler(async (req: Request, res: Response) => {
  const faq = await adminContentService.deactivateFaq(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { faq } });
});

// --- Testimonials ----------------------------------------------------------

export const listTestimonials = asyncHandler(async (_req: Request, res: Response) => {
  const testimonials = await adminContentService.listTestimonialsAdmin();
  res.status(200).json({ success: true, data: { testimonials } });
});

export const createTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const input = createTestimonialInputSchema.parse(req.body);
  const testimonial = await adminContentService.createTestimonial(actorOf(req), input);
  res.status(201).json({ success: true, data: { testimonial } });
});

export const updateTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const input = updateTestimonialInputSchema.parse(req.body);
  const testimonial = await adminContentService.updateTestimonial(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { testimonial } });
});

export const deactivateTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const testimonial = await adminContentService.deactivateTestimonial(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { testimonial } });
});

// --- Banners -----------------------------------------------------------------

export const listBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await adminContentService.listBannersAdmin();
  res.status(200).json({ success: true, data: { banners } });
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const input = createBannerInputSchema.parse(req.body);
  const banner = await adminContentService.createBanner(actorOf(req), input);
  res.status(201).json({ success: true, data: { banner } });
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const input = updateBannerInputSchema.parse(req.body);
  const banner = await adminContentService.updateBanner(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { banner } });
});

export const deactivateBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await adminContentService.deactivateBanner(
    actorOf(req),
    requireParam(req.params.id, 'id'),
  );
  res.status(200).json({ success: true, data: { banner } });
});
