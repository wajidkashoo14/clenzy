import type { OrderPayload, OrderTrackResult, RescheduleOrderInput } from '@clenzy/shared';
import { apiGet, apiPost } from '@/lib/api-client';

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
