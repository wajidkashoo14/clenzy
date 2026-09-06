import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as contentService from '../services/content.service.js';
import { getPublicSettings } from '../services/settings.service.js';

// Same policy as catalog.controller.ts — public, cacheable reads. See docs/API_SPEC.md §9.
const CONTENT_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

export const listFaqs = asyncHandler(async (_req: Request, res: Response) => {
  const faqs = await contentService.listPublicFaqs();
  res.set('Cache-Control', CONTENT_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { faqs } });
});

export const listTestimonials = asyncHandler(async (_req: Request, res: Response) => {
  const testimonials = await contentService.listPublicTestimonials();
  res.set('Cache-Control', CONTENT_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { testimonials } });
});

export const listBanners = asyncHandler(async (req: Request, res: Response) => {
  const placement = req.query.placement;
  const validPlacement =
    placement === 'home_hero' || placement === 'home_strip' || placement === 'offers'
      ? placement
      : undefined;
  const banners = await contentService.listPublicBanners(validPlacement);
  res.set('Cache-Control', CONTENT_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { banners } });
});

export const getPublicSettingsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getPublicSettings();
  res.set('Cache-Control', CONTENT_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { settings } });
});
