import type { ReviewPayload, SubmitReviewInput } from '@clenzy/shared';
import { Order } from '../models/Order.js';
import { Review, type ReviewDocument } from '../models/Review.js';
import { AppError } from '../utils/AppError.js';

type ReviewLean = ReviewDocument & { _id: unknown };

function toPayload(review: ReviewLean): ReviewPayload {
  return {
    id: String(review._id),
    orderId: String(review.orderId),
    rating: review.rating,
    comment: review.comment,
    serviceQuality: review.serviceQuality,
    timeliness: review.timeliness,
    staffBehaviour: review.staffBehaviour,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
  };
}

/** See docs/API_SPEC.md §7 — POST /orders/:orderNumber/review. One review per order (unique index on orderId). */
export async function submitReview(
  userId: string,
  orderNumber: string,
  input: SubmitReviewInput,
): Promise<ReviewPayload> {
  const order = await Order.findOne({ orderNumber, userId }).select('_id status').lean();
  if (!order) throw AppError.notFound('Order not found.');
  if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
    throw AppError.unprocessable('REVIEW_NOT_ALLOWED', 'You can only review a delivered order.');
  }

  const existing = await Review.findOne({ orderId: order._id }).lean();
  if (existing)
    throw AppError.conflict('ALREADY_REVIEWED', 'You have already reviewed this order.');

  const review = await Review.create({
    orderId: order._id,
    userId,
    rating: input.rating,
    comment: input.comment,
    serviceQuality: input.serviceQuality,
    timeliness: input.timeliness,
    staffBehaviour: input.staffBehaviour,
  });

  return toPayload(review.toObject());
}

/** Ownership-scoped — looks the order up by {orderNumber, userId} before reading its review. */
export async function getReviewForOrder(
  userId: string,
  orderNumber: string,
): Promise<ReviewPayload | null> {
  const order = await Order.findOne({ orderNumber, userId }).select('_id').lean();
  if (!order) throw AppError.notFound('Order not found.');
  const review = await Review.findOne({ orderId: order._id }).lean();
  return review ? toPayload(review) : null;
}
