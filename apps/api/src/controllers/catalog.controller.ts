import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as catalogService from '../services/catalog.service.js';
import { AppError } from '../utils/AppError.js';

// Public, cacheable reads — see docs/API_SPEC.md §3.
const CATALOG_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

// Express 5's built-in types allow a route param to be `string | string[] |
// undefined` (array notation for repeated segments); a plain `:slug`/`:id`
// segment is always a single string once the route has matched.
function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const includeItems = req.query.includeItems === 'true';
  const categories = await catalogService.getCategories(includeItems);
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { categories } });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await catalogService.getCategoryBySlug(requireParam(req.params.slug, 'slug'));
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { category } });
});

export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId, q, popular, areaId } = req.query;
  const items = await catalogService.getItems({
    categoryId: typeof categoryId === 'string' ? categoryId : undefined,
    q: typeof q === 'string' ? q : undefined,
    popular: popular === 'true',
    areaId: typeof areaId === 'string' ? areaId : undefined,
  });
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { items } });
});

export const getItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await catalogService.getItemById(requireParam(req.params.id, 'id'));
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { item } });
});

export const getPricing = asyncHandler(async (_req: Request, res: Response) => {
  const groups = await catalogService.getPricing();
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { groups } });
});
