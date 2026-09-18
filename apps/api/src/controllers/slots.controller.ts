import { slotsQuerySchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as slotsService from '../services/slots.service.js';

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const query = slotsQuerySchema.parse(req.query);
  const result = await slotsService.getSlotAvailability(query);
  res.status(200).json({ success: true, data: result });
});
