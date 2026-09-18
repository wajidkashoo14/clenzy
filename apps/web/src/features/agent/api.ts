import type { AgentTask, MarkFailedInput } from '@clenzy/shared';
import { apiGet, apiPatch } from '@/lib/api-client';

export function getAgentTasks(date: string): Promise<{ tasks: AgentTask[] }> {
  return apiGet(`/api/v1/agent/tasks?date=${date}`);
}

export function markPickedUp(orderNumber: string): Promise<{ updated: boolean }> {
  return apiPatch(`/api/v1/agent/tasks/${orderNumber}/picked-up`, {});
}

export function markDelivered(orderNumber: string): Promise<{ updated: boolean }> {
  return apiPatch(`/api/v1/agent/tasks/${orderNumber}/delivered`, {});
}

export function markFailed(
  orderNumber: string,
  input: MarkFailedInput,
): Promise<{ updated: boolean }> {
  return apiPatch(`/api/v1/agent/tasks/${orderNumber}/failed`, input);
}
