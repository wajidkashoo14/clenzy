import type {
  AddInternalNoteInput,
  AdminAgentSummary,
  AdminCancelOrderInput,
  AssignAgentInput,
  BulkAssignRosterInput,
  CreateManualOrderInput,
  DashboardQuery,
  DashboardResult,
  RefundInput,
  RefundResult,
  RescheduleOrderInput,
  ReviseOrderItemsInput,
  UpdateOrderStatusInput,
} from '@clenzy/shared';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type {
  AdminOrder,
  AdminOrderDetail,
  AdminOrderListFilters,
  AdminOrderListResult,
} from './types';

export function getDashboard(range: DashboardQuery['range'] = 'week'): Promise<DashboardResult> {
  return apiGet(`/api/v1/admin/dashboard?range=${range}`);
}

export function listAgents(): Promise<{ agents: AdminAgentSummary[] }> {
  return apiGet('/api/v1/admin/agents');
}

/** Builds the query string for the order list — every filter round-trips through the URL so a filtered view is bookmarkable. */
export function buildOrderListSearchParams(filters: AdminOrderListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.paymentStatus?.length) params.set('paymentStatus', filters.paymentStatus.join(','));
  if (filters.paymentMethod?.length) params.set('paymentMethod', filters.paymentMethod.join(','));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);
  if (filters.areaId) params.set('areaId', filters.areaId);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.isExpress) params.set('isExpress', 'true');
  if (filters.hasPriceRevision) params.set('hasPriceRevision', 'true');
  if (filters.needsAttention) params.set('needsAttention', 'true');
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 20));
  return params;
}

export function listOrdersAdmin(filters: AdminOrderListFilters): Promise<AdminOrderListResult> {
  return apiGet(`/api/v1/admin/orders?${buildOrderListSearchParams(filters).toString()}`);
}

export function getOrderAdmin(id: string): Promise<{ order: AdminOrderDetail }> {
  return apiGet(`/api/v1/admin/orders/${id}`);
}

export function updateOrderStatusAdmin(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<{ order: AdminOrder }> {
  return apiPatch(`/api/v1/admin/orders/${id}/status`, input);
}

export function assignAgentAdmin(
  id: string,
  input: AssignAgentInput,
): Promise<{ order: AdminOrder }> {
  return apiPatch(`/api/v1/admin/orders/${id}/assign`, input);
}

export function rescheduleOrderAdmin(
  id: string,
  input: RescheduleOrderInput,
): Promise<{ order: AdminOrder }> {
  return apiPatch(`/api/v1/admin/orders/${id}/slots`, input);
}

export function reviseOrderItemsAdmin(
  id: string,
  input: ReviseOrderItemsInput,
): Promise<{ order: AdminOrder }> {
  return apiPatch(`/api/v1/admin/orders/${id}/items`, input);
}

export function addInternalNoteAdmin(
  id: string,
  input: AddInternalNoteInput,
): Promise<{ order: AdminOrder }> {
  return apiPost(`/api/v1/admin/orders/${id}/notes`, input);
}

export function cancelOrderAdmin(
  id: string,
  input: AdminCancelOrderInput,
): Promise<{ order: AdminOrder }> {
  return apiPost(`/api/v1/admin/orders/${id}/cancel`, input);
}

export function refundOrderAdmin(id: string, input: RefundInput): Promise<RefundResult> {
  return apiPost(`/api/v1/admin/orders/${id}/refund`, input);
}

export function getRoster(
  date: string,
  type: 'pickup' | 'delivery',
): Promise<{ orders: AdminOrder[] }> {
  return apiGet(`/api/v1/admin/orders/roster?date=${date}&type=${type}`);
}

export function bulkAssignRoster(input: BulkAssignRosterInput): Promise<{ orders: AdminOrder[] }> {
  return apiPost('/api/v1/admin/orders/roster/assign', input);
}

export function createManualOrder(input: CreateManualOrderInput): Promise<{ order: AdminOrder }> {
  return apiPost('/api/v1/admin/orders', input);
}
