import type {
  CreateSlotTemplateInput,
  SlotCapacityOverrideInput,
  SlotDay,
  UpdateSlotTemplateInput,
} from '@clenzy/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface AdminSlotTemplate {
  _id: string;
  type: 'pickup' | 'delivery';
  dayOfWeek: number;
  window: string;
  label: string;
  capacity: number;
  cutoffMinutesBefore: number;
  isActive: boolean;
  areaIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function listSlotTemplates(): Promise<{ templates: AdminSlotTemplate[] }> {
  return apiGet('/api/v1/admin/slots/templates');
}
export function createSlotTemplate(
  input: CreateSlotTemplateInput,
): Promise<{ template: AdminSlotTemplate }> {
  return apiPost('/api/v1/admin/slots/templates', input);
}
export function updateSlotTemplate(
  id: string,
  input: UpdateSlotTemplateInput,
): Promise<{ template: AdminSlotTemplate }> {
  return apiPatch(`/api/v1/admin/slots/templates/${id}`, input);
}
export function deactivateSlotTemplate(id: string): Promise<{ template: AdminSlotTemplate }> {
  return apiDelete(`/api/v1/admin/slots/templates/${id}`);
}

export function getSlotCapacity(params: {
  type: 'pickup' | 'delivery';
  areaId: string;
  from: string;
  days?: number;
}): Promise<{ dates: SlotDay[] }> {
  const query = new URLSearchParams({
    type: params.type,
    areaId: params.areaId,
    from: params.from,
    days: String(params.days ?? 14),
  });
  return apiGet(`/api/v1/admin/slots/capacity?${query.toString()}`);
}
export function overrideSlotCapacity(
  input: SlotCapacityOverrideInput,
): Promise<{ capacity: unknown }> {
  return apiPatch('/api/v1/admin/slots/capacity', input);
}
