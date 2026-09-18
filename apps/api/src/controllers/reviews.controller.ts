import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { listPublicReviews } from '../services/reviews.service.js';

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

/** `GET /reviews?featured=true` per docs/API_SPEC.md §9. */
export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const featuredOnly = req.query.featured === 'true';
  const reviews = await listPublicReviews(featuredOnly);
  res.set('Cache-Control', CACHE_CONTROL);
  res.status(200).json({ success: true, data: { reviews } });
});
