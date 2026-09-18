import { moderateReviewInputSchema, reviewListQuerySchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminReviewsService from '../services/adminReviews.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { AppError } from '../utils/AppError.js';

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string') throw AppError.badRequest('INVALID_PARAM', `Invalid ${name}.`);
  return value;
}
function actorOf(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const query = reviewListQuerySchema.parse(req.query);
  const result = await adminReviewsService.listReviewsAdmin(query);
  res.status(200).json({ success: true, data: result });
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const input = moderateReviewInputSchema.parse(req.body);
  const review = await adminReviewsService.moderateReview(
    actorOf(req),
    requireParam(req.params.id, 'id'),
    input,
  );
  res.status(200).json({ success: true, data: { review } });
});
