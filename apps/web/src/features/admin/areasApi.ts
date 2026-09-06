import type { AreaAvailabilityInput, CreateAreaInput, UpdateAreaInput } from '@clenzy/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface AdminArea {
  _id: string;
  city: string;
  state: string;
  area: string;
  slug: string;
  pincodes: string[];
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  expressAvailable: boolean;
  deliveryFee?: number;
  minOrderValue?: number;
  serviceableCategories: string[];
  isActive: boolean;
  seo?: { title?: string; description?: string };
  createdAt: string;
  updatedAt: string;
}

export function listAreas(): Promise<{ areas: AdminArea[] }> {
  return apiGet('/api/v1/admin/areas');
}
export function getArea(id: string): Promise<{ area: AdminArea }> {
  return apiGet(`/api/v1/admin/areas/${id}`);
}
export function createArea(input: CreateAreaInput): Promise<{ area: AdminArea }> {
  return apiPost('/api/v1/admin/areas', input);
}
export function updateArea(id: string, input: UpdateAreaInput): Promise<{ area: AdminArea }> {
  return apiPatch(`/api/v1/admin/areas/${id}`, input);
}
export function setAreaAvailability(
  id: string,
  input: AreaAvailabilityInput,
): Promise<{ area: AdminArea }> {
  return apiPatch(`/api/v1/admin/areas/${id}/availability`, input);
}
export function deactivateArea(id: string): Promise<{ area: AdminArea }> {
  return apiDelete(`/api/v1/admin/areas/${id}`);
}
