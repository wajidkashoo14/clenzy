import type { ChangeUserRoleInput, CreateAgentInput, UpdateAgentInput } from '@clenzy/shared';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface AgentWorkload {
  tasksToday: number;
  completedToday: number;
  failedToday: number;
  avgPerDay: number;
}

export interface AdminAgent {
  _id: string;
  phone: string;
  name?: string;
  role: string;
  status: string;
  staffProfile?: {
    employeeId?: string;
    assignedAreas: string[];
    vehicleNumber?: string;
    isAvailable: boolean;
    shiftStart?: string;
    shiftEnd?: string;
    joinedAt?: string;
  };
  workload: AgentWorkload;
}

export function listAgents(): Promise<{ agents: AdminAgent[] }> {
  return apiGet('/api/v1/admin/staff');
}
export function createAgent(input: CreateAgentInput): Promise<{ agent: AdminAgent }> {
  return apiPost('/api/v1/admin/staff', input);
}
export function updateAgent(id: string, input: UpdateAgentInput): Promise<{ agent: AdminAgent }> {
  return apiPatch(`/api/v1/admin/staff/${id}`, input);
}
export function changeUserRole(
  id: string,
  input: ChangeUserRoleInput,
): Promise<{ user: AdminAgent }> {
  return apiPatch(`/api/v1/admin/users/${id}/role`, input);
}
