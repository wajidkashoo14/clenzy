import type {
  OrderListQuery,
  OrderListResult,
  OrderPayload,
  OrderTrackResult,
  RescheduleOrderInput,
  ReviewPayload,
  SubmitReviewInput,
} from '@clenzy/shared';
import { apiGet, apiPost, toApiError } from '@/lib/api-client';

export function listMyOrders(query: Partial<OrderListQuery> = {}): Promise<OrderListResult> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 10));
  return apiGet(`/api/v1/orders?${params.toString()}`);
}

export function submitReview(
  orderNumber: string,
  input: SubmitReviewInput,
): Promise<{ review: ReviewPayload }> {
  return apiPost(`/api/v1/orders/${orderNumber}/review`, input);
}

export function getReview(orderNumber: string): Promise<{ review: ReviewPayload | null }> {
  return apiGet(`/api/v1/orders/${orderNumber}/review`);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/** Invoice is a binary PDF, not JSON — fetched directly rather than through apiGet. */
export async function downloadInvoice(orderNumber: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/orders/${orderNumber}/invoice`, {
    credentials: 'include',
  });
  if (!response.ok) throw await toApiError(response, 'Could not download the invoice.');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${orderNumber}-invoice.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function trackOrder(orderNumber: string): Promise<OrderTrackResult> {
  return apiGet(`/api/v1/orders/${orderNumber}/track`);
}

export function cancelOrder(orderNumber: string, reason: string): Promise<{ order: OrderPayload }> {
  return apiPost(`/api/v1/orders/${orderNumber}/cancel`, { reason });
}

export function rescheduleOrder(
  orderNumber: string,
  input: RescheduleOrderInput,
): Promise<{ order: OrderPayload }> {
  return apiPost(`/api/v1/orders/${orderNumber}/reschedule`, input);
}

export function requestReclean(orderNumber: string): Promise<{ order: OrderPayload }> {
  return apiPost(`/api/v1/orders/${orderNumber}/reclean`, {});
}

export function approveRevision(orderNumber: string): Promise<{ order: OrderPayload }> {
  return apiPost(`/api/v1/orders/${orderNumber}/approve-revision`, {});
}
