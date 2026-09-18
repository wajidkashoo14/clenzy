import { pincodeCheckQuerySchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as areasService from '../services/areas.service.js';

const CATALOG_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

export const listAreas = asyncHandler(async (_req: Request, res: Response) => {
  const areas = await areasService.getAreas();
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.status(200).json({ success: true, data: { areas } });
});

export const checkPincode = asyncHandler(async (req: Request, res: Response) => {
  const { pincode } = pincodeCheckQuerySchema.parse(req.query);
  const result = await areasService.checkPincode(pincode);
  // Not cached — serviceability toggles (snow days, holidays) must reflect immediately.
  res.status(200).json({ success: true, data: result });
});
