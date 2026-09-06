import type { ModerateReviewInput } from '@clenzy/shared';
import { apiGet, apiPatch } from '@/lib/api-client';

export interface AdminReview {
  _id: string;
  orderId: { orderNumber: string } | string | null;
  userId: { name?: string; phone: string } | string | null;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;
  moderatedAt?: string;
  adminReply?: string;
  isFeatured: boolean;
  createdAt: string;
}

export interface ReviewListResult {
  reviews: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
}

export function listReviews(
  params: { status?: string; rating?: number } = {},
): Promise<ReviewListResult> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.rating) query.set('rating', String(params.rating));
  const qs = query.toString();
  return apiGet(`/api/v1/admin/reviews${qs ? `?${qs}` : ''}`);
}

export function moderateReview(
  id: string,
  input: ModerateReviewInput,
): Promise<{ review: AdminReview }> {
  return apiPatch(`/api/v1/admin/reviews/${id}`, input);
}
