import type { ModerateReviewInput, ReviewListQuery } from '@clenzy/shared';
import { isValidObjectId, Types } from 'mongoose';
import { Review } from '../models/Review.js';
import { logAudit } from './auditLog.service.js';
import { AppError } from '../utils/AppError.js';

interface Actor {
  id: string;
  role: string;
}

export interface ReviewListResult {
  reviews: unknown[];
  total: number;
  page: number;
  pageSize: number;
}

/** See docs/ADMIN_DASHBOARD.md §11 — moderation queue needs the order link and customer identity. */
export async function listReviewsAdmin(query: ReviewListQuery): Promise<ReviewListResult> {
  const filter: Record<string, unknown> = {};
  if (query.status !== 'all') filter.status = query.status;
  if (query.rating) filter.rating = query.rating;

  const skip = (query.page - 1) * query.pageSize;
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .populate<{ orderId: { orderNumber: string } | null }>('orderId', 'orderNumber')
      .populate<{ userId: { name?: string; phone: string } | null }>('userId', 'name phone')
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { reviews, total, page: query.page, pageSize: query.pageSize };
}

/**
 * Reject reasons aren't a persisted field on `reviews` (see docs/DATABASE.md
 * — not in the documented schema); folded into the audit log's `after`
 * snapshot instead so there's still a trail without inventing a new field.
 */
export async function moderateReview(
  actor: Actor,
  id: string,
  input: ModerateReviewInput,
): Promise<unknown> {
  if (!isValidObjectId(id)) throw AppError.notFound('Review not found.');
  const review = await Review.findById(id);
  if (!review) throw AppError.notFound('Review not found.');

  const before = review.toObject();

  switch (input.action) {
    case 'approve':
      review.status = 'approved';
      review.moderatedBy = new Types.ObjectId(actor.id);
      review.moderatedAt = new Date();
      break;
    case 'reject':
      review.status = 'rejected';
      review.moderatedBy = new Types.ObjectId(actor.id);
      review.moderatedAt = new Date();
      break;
    case 'reply':
      review.adminReply = input.reply;
      break;
    case 'feature':
      if (review.status !== 'approved') {
        throw AppError.unprocessable(
          'REVIEW_NOT_APPROVED',
          'Only approved reviews can be featured.',
        );
      }
      review.isFeatured = true;
      break;
    case 'unfeature':
      review.isFeatured = false;
      break;
  }
  await review.save();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: `review.${input.action}`,
    entityType: 'Review',
    entityId: id,
    before,
    after: input.reason ? { ...review.toObject(), reason: input.reason } : review.toObject(),
  });
  return review.toObject();
}
